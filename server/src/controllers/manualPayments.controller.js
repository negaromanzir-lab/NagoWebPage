const path = require('path');
const fs   = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getPool }    = require('../config/db');
const { UPLOAD_DIR } = require('../middleware/upload');
const tokenService   = require('../services/tokenService');
const emailService   = require('../services/emailService');

function safeUnlink(relativePath) {
  if (!relativePath) return;
  const abs = path.join(UPLOAD_DIR, relativePath);
  try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch { /* ignore */ }
}

// ── Buyer: Initiate manual payment order ──────────────────────────────────────

async function initiateManualOrder(req, res, next) {
  try {
    const { project_ids, payment_method } = req.body;
    const db = getPool();

    const [settings] = await db.query(
      'SELECT is_enabled FROM manual_payment_settings WHERE method = $1',
      [payment_method]
    );
    if (!settings.length || !settings[0].is_enabled) {
      return res.status(400).json({
        success: false,
        message: `${payment_method} payments are not currently available`,
      });
    }

    const placeholders = project_ids.map((_, i) => `$${i + 1}`).join(',');
    const [projects] = await db.query(
      `SELECT id, title, price FROM projects
       WHERE id IN (${placeholders}) AND is_deleted = FALSE AND is_published = TRUE`,
      project_ids
    );

    if (!projects.length) {
      return res.status(404).json({ success: false, message: 'No valid projects found' });
    }

    const ownedPH = project_ids.map((_, i) => `$${i + 2}`).join(',');
    const [owned] = await db.query(
      `SELECT oi.project_id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.project_id IN (${ownedPH}) AND o.status = 'completed'`,
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

    await db.query(
      `INSERT INTO orders (id, user_id, total_amount, status, payment_method, manual_status)
       VALUES ($1, $2, $3, 'pending', $4, 'none')`,
      [orderId, req.user.id, totalAmount, payment_method]
    );

    for (const p of projects) {
      const sellerShare = parseFloat(p.price) * 0.8;
      const fee         = parseFloat(p.price) * 0.2;
      await db.query(
        `INSERT INTO order_items
           (order_id, project_id, price_at_purchase, seller_id, seller_share, platform_fee)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, p.id, p.price, req.user.id, sellerShare, fee]
      );
    }

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

// ── Buyer: Get payment settings ───────────────────────────────────────────────

async function getPaymentSettings(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      'SELECT method, account_name, account_number, instructions FROM manual_payment_settings WHERE is_enabled = TRUE ORDER BY method'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// ── Buyer: Upload payment screenshot ──────────────────────────────────────────

async function uploadProof(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Screenshot is required' });
    }

    const db      = getPool();
    const orderId = req.params.orderId;

    const [orders] = await db.query(
      `SELECT id, total_amount, payment_method, status, manual_status
       FROM orders WHERE id = $1 AND user_id = $2`,
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

    // Soft-replace any existing pending proof
    await db.query(
      "UPDATE payment_proofs SET status = 'rejected', admin_note = 'Replaced by new submission' WHERE order_id = $1 AND status = 'pending'",
      [orderId]
    );

    const [result] = await db.query(
      `INSERT INTO payment_proofs
         (order_id, user_id, payment_method, sender_name, sender_phone,
          transaction_ref, amount_paid, currency, screenshot_path,
          screenshot_name, file_size_bytes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ETB',$8,$9,$10,'pending')
       RETURNING id`,
      [
        orderId, req.user.id, order.payment_method,
        sender_name.trim(),
        sender_phone?.trim() || null,
        transaction_ref?.trim() || null,
        parseFloat(amount_paid),
        relativePath,
        req.file.originalname,
        req.file.size,
      ]
    );

    await db.query(
      "UPDATE orders SET manual_status = 'screenshot_uploaded', updated_at = NOW() WHERE id = $1",
      [orderId]
    );

    res.status(201).json({
      success: true,
      message: 'Payment screenshot submitted. An admin will review it shortly.',
      data: { proof_id: result[0].id, order_id: orderId, status: 'pending' },
    });

    setImmediate(async () => {
      try {
        const [userRows] = await db.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
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

// ── Buyer: List own proofs ────────────────────────────────────────────────────

async function listMyProofs(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      `SELECT
         pp.id, pp.order_id, pp.payment_method, pp.sender_name,
         pp.transaction_ref, pp.amount_paid, pp.currency,
         pp.status, pp.admin_note, pp.submitted_at, pp.reviewed_at,
         o.total_amount, o.manual_status,
         STRING_AGG(p.title, ', ') AS project_titles
       FROM payment_proofs pp
       JOIN orders o ON pp.order_id = o.id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN projects p ON oi.project_id = p.id
       WHERE pp.user_id = $1
       GROUP BY pp.id, o.total_amount, o.manual_status
       ORDER BY pp.submitted_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// ── Admin: List all proofs ────────────────────────────────────────────────────

async function adminListProofs(req, res, next) {
  try {
    const db     = getPool();
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;
    const { status, method } = req.query;

    const conditions = [];
    const params     = [];
    let   pi         = 1;

    if (status) { conditions.push(`pp.status = $${pi++}`);          params.push(status); }
    if (method) { conditions.push(`pp.payment_method = $${pi++}`);  params.push(method); }

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
       JOIN orders o  ON pp.order_id  = o.id
       JOIN users  u  ON pp.user_id   = u.id
       LEFT JOIN users rv ON pp.reviewed_by = rv.id
       ${where}
       ORDER BY pp.submitted_at DESC
       LIMIT $${pi++} OFFSET $${pi++}`,
      [...params, limit, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM payment_proofs pp ${where}`,
      params
    );

    const [pendingRows] = await db.query(
      "SELECT COUNT(*) AS pending_count FROM payment_proofs WHERE status = 'pending'"
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page, limit,
        total: parseInt(countRows[0].total, 10),
        totalPages: Math.ceil(parseInt(countRows[0].total, 10) / limit),
      },
      pending_count: parseInt(pendingRows[0].pending_count, 10),
    });
  } catch (err) {
    next(err);
  }
}

// ── Admin: Get single proof ───────────────────────────────────────────────────

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
       JOIN orders o  ON pp.order_id  = o.id
       JOIN users  u  ON pp.user_id   = u.id
       LEFT JOIN users rv ON pp.reviewed_by = rv.id
       WHERE pp.id = $1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Payment proof not found' });
    }

    const [items] = await db.query(
      `SELECT oi.price_at_purchase, p.id AS project_id, p.title, p.vendor
       FROM order_items oi
       JOIN projects p ON oi.project_id = p.id
       WHERE oi.order_id = $1`,
      [rows[0].order_id]
    );

    res.json({ success: true, data: { ...rows[0], items } });
  } catch (err) {
    next(err);
  }
}

// ── Admin: Approve payment ────────────────────────────────────────────────────

async function adminApproveProof(req, res, next) {
  try {
    const db      = getPool();
    const proofId = parseInt(req.params.id, 10);
    const note    = req.body.note?.trim() || null;

    const [rows] = await db.query(
      'SELECT id, order_id, status FROM payment_proofs WHERE id = $1',
      [proofId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Payment proof not found' });
    if (rows[0].status !== 'pending') {
      return res.status(409).json({ success: false, message: `Proof is already ${rows[0].status}` });
    }

    const orderId = rows[0].order_id;

    const [orders] = await db.query(
      "SELECT id FROM orders WHERE id = $1 AND status = 'pending'",
      [orderId]
    );
    if (!orders.length) {
      return res.status(409).json({ success: false, message: 'Order is no longer pending' });
    }

    // 1. Approve proof
    await db.query(
      `UPDATE payment_proofs
       SET status = 'approved', admin_note = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3`,
      [note, req.user.id, proofId]
    );

    // 2. Complete order
    await db.query(
      `UPDATE orders
       SET status = 'completed', manual_status = 'approved',
           admin_note = $1, reviewed_by = $2, reviewed_at = NOW(),
           completed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [note, req.user.id, orderId]
    );

    // 3. Credit sellers & increment download counts
    const [items] = await db.query(
      'SELECT project_id, seller_id, price_at_purchase FROM order_items WHERE order_id = $1',
      [orderId]
    );

    for (const item of items) {
      const sellerShare = parseFloat(item.price_at_purchase) * 0.8;
      const fee         = parseFloat(item.price_at_purchase) * 0.2;

      await db.query(
        'UPDATE order_items SET seller_share = $1, platform_fee = $2 WHERE order_id = $3 AND project_id = $4',
        [sellerShare, fee, orderId, item.project_id]
      );
      await db.query(
        'UPDATE users SET seller_balance = seller_balance + $1, total_earned = total_earned + $1 WHERE id = $2',
        [sellerShare, item.seller_id]
      );
      await db.query(
        'UPDATE projects SET download_count = download_count + 1 WHERE id = $1',
        [item.project_id]
      );
    }

    // 4. Issue download tokens
    const [orderRow] = await db.query('SELECT user_id FROM orders WHERE id = $1', [orderId]);
    if (orderRow.length) {
      try {
        await tokenService.issueTokensForOrder(orderId, orderRow[0].user_id);
        console.log(`🔑  Download tokens issued for manual order ${orderId}`);
      } catch (tokenErr) {
        console.error(`⚠️  Token issuance failed for manual order ${orderId}:`, tokenErr.message);
      }
    }

    // 5. Send approval email
    setImmediate(async () => {
      try {
        if (orderRow.length) {
          const [buyerRows]  = await db.query('SELECT name, email FROM users WHERE id = $1', [orderRow[0].user_id]);
          const [orderItems] = await db.query(
            `SELECT p.title FROM order_items oi JOIN projects p ON oi.project_id = p.id WHERE oi.order_id = $1`,
            [orderId]
          );
          const [orderTotal] = await db.query('SELECT total_amount FROM orders WHERE id = $1', [orderId]);
          if (buyerRows.length) {
            await emailService.sendPaymentApproved({
              user:  buyerRows[0],
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

async function adminRejectProof(req, res, next) {
  try {
    const db      = getPool();
    const proofId = parseInt(req.params.id, 10);
    const note    = req.body.note?.trim();

    if (!note) return res.status(422).json({ success: false, message: 'Rejection reason is required' });

    const [rows] = await db.query(
      'SELECT id, order_id, status FROM payment_proofs WHERE id = $1',
      [proofId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Payment proof not found' });
    if (rows[0].status !== 'pending') {
      return res.status(409).json({ success: false, message: `Proof is already ${rows[0].status}` });
    }

    await db.query(
      `UPDATE payment_proofs
       SET status = 'rejected', admin_note = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3`,
      [note, req.user.id, proofId]
    );
    await db.query(
      `UPDATE orders
       SET manual_status = 'rejected', admin_note = $1,
           reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [note, req.user.id, rows[0].order_id]
    );

    setImmediate(async () => {
      try {
        const [orderRow] = await db.query('SELECT user_id FROM orders WHERE id = $1', [rows[0].order_id]);
        if (orderRow.length) {
          const [buyerRows] = await db.query('SELECT name, email FROM users WHERE id = $1', [orderRow[0].user_id]);
          if (buyerRows.length) {
            await emailService.sendPaymentRejected({
              user:  buyerRows[0],
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

// ── Admin: Get/Update payment settings ───────────────────────────────────────

async function adminGetSettings(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM manual_payment_settings ORDER BY method');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function adminUpdateSettings(req, res, next) {
  try {
    const db     = getPool();
    const method = req.params.method;
    const { is_enabled, account_name, account_number, instructions } = req.body;

    const fields = {};
    if (is_enabled     !== undefined) fields.is_enabled     = !!is_enabled;
    if (account_name   !== undefined) fields.account_name   = account_name.trim();
    if (account_number !== undefined) fields.account_number = account_number.trim();
    if (instructions   !== undefined) fields.instructions   = instructions;
    fields.updated_by = req.user.id;

    const keys       = Object.keys(fields);
    const values     = Object.values(fields);
    // Build INSERT columns and UPDATE SET clauses
    const colList    = ['method', ...keys].join(', ');
    const valPH      = ['$1', ...keys.map((_, i) => `$${i + 2}`)].join(', ');
    const updateSet  = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');

    await db.query(
      `INSERT INTO manual_payment_settings (${colList}) VALUES (${valPH})
       ON CONFLICT (method) DO UPDATE SET ${updateSet}`,
      [method, ...values]
    );

    res.json({ success: true, message: 'Payment settings updated' });
  } catch (err) {
    next(err);
  }
}

// ── Admin: Stream screenshot ──────────────────────────────────────────────────

async function adminViewScreenshot(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      'SELECT screenshot_path, screenshot_name FROM payment_proofs WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Proof not found' });

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
  initiateManualOrder, getPaymentSettings, uploadProof, listMyProofs,
  adminListProofs, adminGetProof, adminApproveProof, adminRejectProof,
  adminGetSettings, adminUpdateSettings, adminViewScreenshot,
};
