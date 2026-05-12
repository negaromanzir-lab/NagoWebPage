/**
 * manualPayments.controller.js
 *
 * Handles the full Telebirr / CBE Birr manual payment verification workflow:
 *
 *  Buyer flow:
 *    1. POST /api/payments/manual/initiate   — create a pending order
 *    2. GET  /api/payments/manual/settings   — fetch payment account details
 *    3. POST /api/payments/manual/:orderId/proof — upload screenshot
 *    4. GET  /api/payments/manual/my-proofs  — list own submissions
 *
 *  Admin flow:
 *    5. GET  /api/admin/manual-payments      — list all pending proofs
 *    6. GET  /api/admin/manual-payments/:id  — proof detail + screenshot
 *    7. PATCH /api/admin/manual-payments/:id/approve — approve → complete order
 *    8. PATCH /api/admin/manual-payments/:id/reject  — reject with note
 *    9. GET  /api/admin/manual-payments/settings     — get payment settings
 *   10. PUT  /api/admin/manual-payments/settings/:method — update settings
 */

const path = require('path');
const fs   = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getPool }    = require('../config/db');
const { UPLOAD_DIR } = require('../middleware/upload');
const tokenService   = require('../services/tokenService');
const emailService   = require('../services/emailService');

// ── Helpers ────────────────────────────────────────────────────────────────────

function safeUnlink(relativePath) {
  if (!relativePath) return;
  const abs = path.join(UPLOAD_DIR, relativePath);
  try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch { /* ignore */ }
}

// ── Buyer: Initiate a manual payment order ─────────────────────────────────────

/**
 * POST /api/payments/manual/initiate
 *
 * Creates a pending order for manual payment (no Stripe session).
 * Body: { project_ids: number[], payment_method: 'telebirr'|'cbe_birr'|'bank_transfer' }
 */
async function initiateManualOrder(req, res, next) {
  try {
    const { project_ids, payment_method } = req.body;
    const db = getPool();

    // Validate payment method is enabled
    const [settings] = await db.query(
      'SELECT is_enabled FROM manual_payment_settings WHERE method = ?',
      [payment_method]
    );
    if (!settings.length || !settings[0].is_enabled) {
      return res.status(400).json({
        success: false,
        message: `${payment_method} payments are not currently available`,
      });
    }

    // Fetch project details
    const placeholders = project_ids.map(() => '?').join(',');
    const [projects] = await db.query(
      `SELECT id, title, price FROM projects
       WHERE id IN (${placeholders}) AND is_deleted = 0 AND is_published = 1`,
      project_ids
    );

    if (!projects.length) {
      return res.status(404).json({ success: false, message: 'No valid projects found' });
    }

    // Check for already-owned projects
    const [owned] = await db.query(
      `SELECT oi.project_id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = ? AND oi.project_id IN (${placeholders}) AND o.status = 'completed'`,
      [req.user.id, ...project_ids]
    );

    if (owned.length) {
      return res.status(409).json({
        success: false,
        message: 'You already own some of these projects',
        data: { already_owned: owned.map((r) => r.project_id) },
      });
    }

    const orderId     = uuidv4();
    const totalAmount = projects.reduce((s, p) => s + parseFloat(p.price), 0);

    // Create pending order with manual payment method
    await db.query(
      `INSERT INTO orders
         (id, user_id, total_amount, status, payment_method, manual_status)
       VALUES (?, ?, ?, 'pending', ?, 'none')`,
      [orderId, req.user.id, totalAmount, payment_method]
    );

    // Insert order items
    const itemValues = projects.map((p) => [orderId, p.id, p.price, req.user.id, p.price * 0.8, p.price * 0.2]);
    await db.query(
      'INSERT INTO order_items (order_id, project_id, price_at_purchase, seller_id, seller_share, platform_fee) VALUES ?',
      [itemValues]
    );

    res.status(201).json({
      success: true,
      message: 'Order created. Please complete your payment and upload a screenshot.',
      data: {
        orderId,
        totalAmount,
        payment_method,
        projects: projects.map((p) => ({ id: p.id, title: p.title, price: p.price })),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── Buyer: Get payment account settings ───────────────────────────────────────

/**
 * GET /api/payments/manual/settings
 * Returns enabled payment methods with account details.
 */
async function getPaymentSettings(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      'SELECT method, account_name, account_number, instructions FROM manual_payment_settings WHERE is_enabled = 1 ORDER BY method'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// ── Buyer: Upload payment screenshot ──────────────────────────────────────────

/**
 * POST /api/payments/manual/:orderId/proof
 *
 * Multipart/form-data:
 *   screenshot      — image file (PNG, JPEG, WebP, PDF)
 *   sender_name     — name on the sender account
 *   sender_phone    — phone number (optional)
 *   transaction_ref — confirmation number from the app
 *   amount_paid     — amount shown on screenshot (ETB)
 */
async function uploadProof(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Screenshot is required' });
    }

    const db      = getPool();
    const orderId = req.params.orderId;

    // Verify order belongs to this user and is in a valid state
    const [orders] = await db.query(
      `SELECT id, total_amount, payment_method, status, manual_status
       FROM orders WHERE id = ? AND user_id = ?`,
      [orderId, req.user.id]
    );

    if (!orders.length) {
      safeUnlink(`payment_proofs/${req.file.filename}`);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orders[0];

    if (order.status === 'completed') {
      safeUnlink(`payment_proofs/${req.file.filename}`);
      return res.status(409).json({ success: false, message: 'This order is already completed' });
    }

    if (order.manual_status === 'approved') {
      safeUnlink(`payment_proofs/${req.file.filename}`);
      return res.status(409).json({ success: false, message: 'Payment already approved' });
    }

    if (!['telebirr', 'cbe_birr', 'bank_transfer'].includes(order.payment_method)) {
      safeUnlink(`payment_proofs/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'This order uses Stripe, not manual payment' });
    }

    const { sender_name, sender_phone, transaction_ref, amount_paid } = req.body;

    if (!sender_name?.trim()) {
      safeUnlink(`payment_proofs/${req.file.filename}`);
      return res.status(422).json({ success: false, message: 'Sender name is required' });
    }

    if (!amount_paid || isNaN(parseFloat(amount_paid))) {
      safeUnlink(`payment_proofs/${req.file.filename}`);
      return res.status(422).json({ success: false, message: 'Amount paid is required' });
    }

    const relativePath = `payment_proofs/${req.file.filename}`;

    // If there's an existing pending proof, soft-replace it
    await db.query(
      "UPDATE payment_proofs SET status = 'rejected', admin_note = 'Replaced by new submission' WHERE order_id = ? AND status = 'pending'",
      [orderId]
    );

    const [result] = await db.query(
      `INSERT INTO payment_proofs
         (order_id, user_id, payment_method, sender_name, sender_phone,
          transaction_ref, amount_paid, currency, screenshot_path,
          screenshot_name, file_size_bytes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ETB', ?, ?, ?, 'pending')`,
      [
        orderId,
        req.user.id,
        order.payment_method,
        sender_name.trim(),
        sender_phone?.trim() || null,
        transaction_ref?.trim() || null,
        parseFloat(amount_paid),
        relativePath,
        req.file.originalname,
        req.file.size,
      ]
    );

    // Update order manual_status
    await db.query(
      "UPDATE orders SET manual_status = 'screenshot_uploaded', updated_at = NOW() WHERE id = ?",
      [orderId]
    );

    res.status(201).json({
      success: true,
      message: 'Payment screenshot submitted. An admin will review it shortly.',
      data: {
        proof_id: result.insertId,
        order_id: orderId,
        status:   'pending',
      },
    });

    // Send "proof received" email (non-blocking, after response)
    setImmediate(async () => {
      try {
        const [userRows] = await db.query('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
        if (userRows.length) {
          await emailService.sendPaymentProofReceived({
            user: userRows[0],
            order: { id: orderId, totalAmount: order.total_amount, paymentMethod: order.payment_method },
          });
        }
      } catch { /* non-fatal */ }
    });
  } catch (err) {
    if (req.file) safeUnlink(`payment_proofs/${req.file.filename}`);
    next(err);
  }
}

// ── Buyer: List own payment proofs ────────────────────────────────────────────

/**
 * GET /api/payments/manual/my-proofs
 */
async function listMyProofs(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      `SELECT
         pp.id, pp.order_id, pp.payment_method, pp.sender_name,
         pp.transaction_ref, pp.amount_paid, pp.currency,
         pp.status, pp.admin_note, pp.submitted_at, pp.reviewed_at,
         o.total_amount, o.manual_status,
         GROUP_CONCAT(p.title SEPARATOR ', ') AS project_titles
       FROM payment_proofs pp
       JOIN orders o ON pp.order_id = o.id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN projects p ON oi.project_id = p.id
       WHERE pp.user_id = ?
       GROUP BY pp.id
       ORDER BY pp.submitted_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// ── Admin: List all payment proofs ────────────────────────────────────────────

/**
 * GET /api/admin/manual-payments
 * Query params: status, method, page, limit
 */
async function adminListProofs(req, res, next) {
  try {
    const db     = getPool();
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;
    const { status, method } = req.query;

    const conditions = [];
    const params     = [];

    if (status) { conditions.push('pp.status = ?');          params.push(status); }
    if (method) { conditions.push('pp.payment_method = ?');  params.push(method); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT
         pp.id, pp.order_id, pp.payment_method, pp.sender_name,
         pp.sender_phone, pp.transaction_ref, pp.amount_paid, pp.currency,
         pp.screenshot_path, pp.screenshot_name, pp.file_size_bytes,
         pp.status, pp.admin_note, pp.submitted_at, pp.reviewed_at,
         o.total_amount AS order_total, o.manual_status,
         u.id AS buyer_id, u.name AS buyer_name, u.email AS buyer_email,
         rv.name AS reviewed_by_name
       FROM payment_proofs pp
       JOIN orders o ON pp.order_id = o.id
       JOIN users  u ON pp.user_id  = u.id
       LEFT JOIN users rv ON pp.reviewed_by = rv.id
       ${where}
       ORDER BY pp.submitted_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM payment_proofs pp ${where}`,
      params
    );

    // Pending count for badge
    const [[{ pending_count }]] = await db.query(
      "SELECT COUNT(*) AS pending_count FROM payment_proofs WHERE status = 'pending'"
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      pending_count,
    });
  } catch (err) {
    next(err);
  }
}

// ── Admin: Get single proof detail ────────────────────────────────────────────

/**
 * GET /api/admin/manual-payments/:id
 */
async function adminGetProof(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      `SELECT
         pp.*,
         u.name AS buyer_name, u.email AS buyer_email,
         rv.name AS reviewed_by_name,
         o.total_amount AS order_total, o.status AS order_status,
         o.manual_status, o.created_at AS order_created_at
       FROM payment_proofs pp
       JOIN orders o ON pp.order_id = o.id
       JOIN users  u ON pp.user_id  = u.id
       LEFT JOIN users rv ON pp.reviewed_by = rv.id
       WHERE pp.id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Payment proof not found' });
    }

    // Fetch order items
    const [items] = await db.query(
      `SELECT oi.price_at_purchase, p.id AS project_id, p.title, p.vendor
       FROM order_items oi
       JOIN projects p ON oi.project_id = p.id
       WHERE oi.order_id = ?`,
      [rows[0].order_id]
    );

    res.json({ success: true, data: { ...rows[0], items } });
  } catch (err) {
    next(err);
  }
}

// ── Admin: Approve payment ────────────────────────────────────────────────────

/**
 * PATCH /api/admin/manual-payments/:id/approve
 * Body: { note?: string }
 *
 * Atomically:
 *   1. Marks proof as approved
 *   2. Marks order as completed
 *   3. Increments project download counts
 *   4. Credits seller balances (80% seller / 20% platform)
 */
async function adminApproveProof(req, res, next) {
  try {
    const db      = getPool();
    const proofId = parseInt(req.params.id, 10);
    const note    = req.body.note?.trim() || null;

    const [rows] = await db.query(
      'SELECT id, order_id, status FROM payment_proofs WHERE id = ?',
      [proofId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Payment proof not found' });
    }

    if (rows[0].status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Proof is already ${rows[0].status}`,
      });
    }

    const orderId = rows[0].order_id;

    // Verify order is still pending
    const [orders] = await db.query(
      "SELECT id, status FROM orders WHERE id = ? AND status = 'pending'",
      [orderId]
    );

    if (!orders.length) {
      return res.status(409).json({ success: false, message: 'Order is no longer pending' });
    }

    // ── Atomic approval ───────────────────────────────────────────────────────

    // 1. Mark proof approved
    await db.query(
      `UPDATE payment_proofs
       SET status = 'approved', admin_note = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [note, req.user.id, proofId]
    );

    // 2. Complete the order
    await db.query(
      `UPDATE orders
       SET status = 'completed', manual_status = 'approved',
           admin_note = ?, reviewed_by = ?, reviewed_at = NOW(),
           completed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [note, req.user.id, orderId]
    );

    // 3. Fetch order items for credit + download count
    const [items] = await db.query(
      'SELECT project_id, seller_id, price_at_purchase FROM order_items WHERE order_id = ?',
      [orderId]
    );

    for (const item of items) {
      const sellerShare = parseFloat(item.price_at_purchase) * 0.8;
      const fee         = parseFloat(item.price_at_purchase) * 0.2;

      // Update order_items with fee split
      await db.query(
        'UPDATE order_items SET seller_share = ?, platform_fee = ? WHERE order_id = ? AND project_id = ?',
        [sellerShare, fee, orderId, item.project_id]
      );

      // Credit seller balance
      await db.query(
        'UPDATE users SET seller_balance = seller_balance + ?, total_earned = total_earned + ? WHERE id = ?',
        [sellerShare, sellerShare, item.seller_id]
      );

      // Increment download count
      await db.query(
        'UPDATE projects SET download_count = download_count + 1 WHERE id = ?',
        [item.project_id]
      );
    }

    // 4. Fetch buyer user_id and issue download tokens
    const [orderRow] = await db.query('SELECT user_id FROM orders WHERE id = ?', [orderId]);
    if (orderRow.length) {
      try {
        await tokenService.issueTokensForOrder(orderId, orderRow[0].user_id);
        console.log(`🔑  Download tokens issued for manual order ${orderId}`);
      } catch (tokenErr) {
        console.error(`⚠️  Token issuance failed for manual order ${orderId}:`, tokenErr.message);
      }
    }

    // 5. Send approval email to buyer (non-blocking)
    setImmediate(async () => {
      try {
        if (orderRow.length) {
          const [buyerRows] = await db.query('SELECT name, email FROM users WHERE id = ?', [orderRow[0].user_id]);
          const [orderItems] = await db.query(
            `SELECT p.title FROM order_items oi JOIN projects p ON oi.project_id = p.id WHERE oi.order_id = ?`,
            [orderId]
          );
          const [orderTotal] = await db.query('SELECT total_amount FROM orders WHERE id = ?', [orderId]);
          if (buyerRows.length) {
            await emailService.sendPaymentApproved({
              user: buyerRows[0],
              order: { id: orderId, totalAmount: orderTotal[0]?.total_amount || 0, items: orderItems },
            });
          }
        }
      } catch { /* non-fatal */ }
    });

    res.json({
      success: true,
      message: 'Payment approved. Order is now completed and buyer can download.',
      data: { proof_id: proofId, order_id: orderId },
    });
  } catch (err) {
    next(err);
  }
}

// ── Admin: Reject payment ─────────────────────────────────────────────────────

/**
 * PATCH /api/admin/manual-payments/:id/reject
 * Body: { note: string } — reason for rejection (required)
 */
async function adminRejectProof(req, res, next) {
  try {
    const db      = getPool();
    const proofId = parseInt(req.params.id, 10);
    const note    = req.body.note?.trim();

    if (!note) {
      return res.status(422).json({ success: false, message: 'Rejection reason is required' });
    }

    const [rows] = await db.query(
      'SELECT id, order_id, status FROM payment_proofs WHERE id = ?',
      [proofId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Payment proof not found' });
    }

    if (rows[0].status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Proof is already ${rows[0].status}`,
      });
    }

    await db.query(
      `UPDATE payment_proofs
       SET status = 'rejected', admin_note = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [note, req.user.id, proofId]
    );

    await db.query(
      `UPDATE orders
       SET manual_status = 'rejected', admin_note = ?,
           reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [note, req.user.id, rows[0].order_id]
    );

    // Send rejection email to buyer (non-blocking)
    setImmediate(async () => {
      try {
        const [orderRow] = await db.query('SELECT user_id FROM orders WHERE id = ?', [rows[0].order_id]);
        if (orderRow.length) {
          const [buyerRows] = await db.query('SELECT name, email FROM users WHERE id = ?', [orderRow[0].user_id]);
          if (buyerRows.length) {
            await emailService.sendPaymentRejected({
              user: buyerRows[0],
              order: { id: rows[0].order_id, adminNote: note },
            });
          }
        }
      } catch { /* non-fatal */ }
    });

    res.json({
      success: true,
      message: 'Payment rejected. Buyer will be notified.',
      data: { proof_id: proofId, order_id: rows[0].order_id },
    });
  } catch (err) {
    next(err);
  }
}

// ── Admin: Get / Update payment settings ──────────────────────────────────────

/**
 * GET /api/admin/manual-payments/settings
 */
async function adminGetSettings(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      'SELECT * FROM manual_payment_settings ORDER BY method'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/manual-payments/settings/:method
 * Body: { is_enabled, account_name, account_number, instructions }
 */
async function adminUpdateSettings(req, res, next) {
  try {
    const db     = getPool();
    const method = req.params.method;

    const { is_enabled, account_name, account_number, instructions } = req.body;

    const fields = {};
    if (is_enabled   !== undefined) fields.is_enabled    = is_enabled ? 1 : 0;
    if (account_name !== undefined) fields.account_name  = account_name.trim();
    if (account_number !== undefined) fields.account_number = account_number.trim();
    if (instructions !== undefined) fields.instructions  = instructions;
    fields.updated_by = req.user.id;

    const setClauses = Object.keys(fields).map((k) => `${k} = ?`).join(', ');

    await db.query(
      `INSERT INTO manual_payment_settings (method, ${Object.keys(fields).join(', ')})
       VALUES (?, ${Object.keys(fields).map(() => '?').join(', ')})
       ON DUPLICATE KEY UPDATE ${setClauses}`,
      [method, ...Object.values(fields), ...Object.values(fields)]
    );

    res.json({ success: true, message: 'Payment settings updated' });
  } catch (err) {
    next(err);
  }
}

// ── Admin: Serve screenshot securely ─────────────────────────────────────────

/**
 * GET /api/admin/manual-payments/:id/screenshot
 * Streams the screenshot file — admin only.
 */
async function adminViewScreenshot(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      'SELECT screenshot_path, screenshot_name FROM payment_proofs WHERE id = ?',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Proof not found' });
    }

    const abs = path.join(UPLOAD_DIR, rows[0].screenshot_path);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ success: false, message: 'Screenshot file not found on server' });
    }

    const ext  = path.extname(rows[0].screenshot_name).toLowerCase();
    const mime = ext === '.pdf' ? 'application/pdf' : 'image/jpeg';

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${rows[0].screenshot_name}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    fs.createReadStream(abs).pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // Buyer
  initiateManualOrder,
  getPaymentSettings,
  uploadProof,
  listMyProofs,
  // Admin
  adminListProofs,
  adminGetProof,
  adminApproveProof,
  adminRejectProof,
  adminGetSettings,
  adminUpdateSettings,
  adminViewScreenshot,
};
