const { getStripe } = require('../config/stripe');
const { getPool }   = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const tokenService  = require('../services/tokenService');
const emailService  = require('../services/emailService');

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/checkout
 * Creates a Stripe Checkout Session for the requested projects.
 */
async function createCheckout(req, res, next) {
  try {
    const { project_ids } = req.body;
    const db = getPool();
    const stripe = getStripe();

    // Fetch project details
    const placeholders = project_ids.map(() => '?').join(',');
    const [projects] = await db.query(
      `SELECT id, title, price, preview_image_path
       FROM projects
       WHERE id IN (${placeholders}) AND is_deleted = 0 AND is_published = 1`,
      project_ids
    );

    if (!projects.length) {
      return res.status(404).json({ success: false, message: 'No valid projects found' });
    }

    // Check if user already owns any of these projects
    const [owned] = await db.query(
      `SELECT oi.project_id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = ? AND oi.project_id IN (${placeholders}) AND o.status = 'completed'`,
      [req.user.id, ...project_ids]
    );

    if (owned.length) {
      const ownedIds = owned.map((r) => r.project_id);
      return res.status(409).json({
        success: false,
        message: 'You already own some of these projects',
        data: { already_owned: ownedIds },
      });
    }

    // Build Stripe line items
    const lineItems = projects.map((p) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: p.title,
          metadata: { project_id: String(p.id) },
        },
        unit_amount: Math.round(p.price * 100), // cents
      },
      quantity: 1,
    }));

    const orderId = uuidv4();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/orders/${orderId}?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/cart?cancelled=true`,
      metadata: {
        order_id: orderId,
        user_id: String(req.user.id),
        project_ids: project_ids.join(','),
      },
      customer_email: req.user.email,
    });

    // Create a pending order record
    const totalAmount = projects.reduce((sum, p) => sum + parseFloat(p.price), 0);

    await db.query(
      `INSERT INTO orders (id, user_id, stripe_session_id, total_amount, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [orderId, req.user.id, session.id, totalAmount]
    );

    // Insert order items
    const itemValues = projects.map((p) => [orderId, p.id, p.price]);
    await db.query('INSERT INTO order_items (order_id, project_id, price_at_purchase) VALUES ?', [itemValues]);

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        checkoutUrl: session.url,
        orderId,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/webhook
 * Handles Stripe webhook events. Requires raw body (see app.js).
 */
async function handleWebhook(req, res, next) {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ success: false, message: `Webhook error: ${err.message}` });
  }

  const db = getPool();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        const userId  = parseInt(session.metadata?.user_id, 10);

        if (!orderId) break;

        // Mark order as completed
        const [updateResult] = await db.query(
          `UPDATE orders SET status = 'completed', stripe_payment_intent = ?, completed_at = NOW()
           WHERE id = ? AND status = 'pending'`,
          [session.payment_intent, orderId]
        );

        if (updateResult.affectedRows === 0) {
          // Already processed — idempotency guard
          console.log(`ℹ️  Order ${orderId} already completed (idempotent)`);
          break;
        }

        // Increment download counts for purchased projects
        const [items] = await db.query(
          'SELECT project_id FROM order_items WHERE order_id = ?',
          [orderId]
        );

        if (items.length) {
          const ids = items.map((i) => i.project_id);
          const placeholders = ids.map(() => '?').join(',');
          await db.query(
            `UPDATE projects SET download_count = download_count + 1 WHERE id IN (${placeholders})`,
            ids
          );
        }

        // Issue download tokens for every purchased project
        if (userId && !isNaN(userId)) {
          try {
            await tokenService.issueTokensForOrder(orderId, userId);
            console.log(`🔑  Download tokens issued for order ${orderId}`);
          } catch (tokenErr) {
            // Non-fatal — buyer can still request tokens manually
            console.error(`⚠️  Token issuance failed for order ${orderId}:`, tokenErr.message);
          }
        }

        // Send order confirmation email (non-blocking)
        try {
          const [userRows] = await db.query('SELECT name, email FROM users WHERE id = ?', [userId]);
          const [orderItems] = await db.query(
            `SELECT p.title, oi.price_at_purchase AS price
             FROM order_items oi JOIN projects p ON oi.project_id = p.id
             WHERE oi.order_id = ?`,
            [orderId]
          );
          const [orderRow] = await db.query('SELECT total_amount FROM orders WHERE id = ?', [orderId]);
          if (userRows.length) {
            emailService.sendOrderConfirmation({
              user: userRows[0],
              order: { id: orderId, totalAmount: orderRow[0]?.total_amount || 0, items: orderItems },
            }).catch(() => {});
          }
        } catch { /* non-fatal */ }

        console.log(`✅  Order ${orderId} completed`);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          await db.query(
            "UPDATE orders SET status = 'expired' WHERE id = ? AND status = 'pending'",
            [orderId]
          );
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        await db.query(
          "UPDATE orders SET status = 'refunded' WHERE stripe_payment_intent = ?",
          [charge.payment_intent]
        );
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/payments/orders
 */
async function listOrders(req, res, next) {
  try {
    const db = getPool();
    const [orders] = await db.query(
      `SELECT o.id, o.total_amount, o.status, o.created_at, o.completed_at,
              COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/payments/orders/:orderId
 */
async function getOrder(req, res, next) {
  try {
    const db = getPool();
    const { orderId } = req.params;

    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, req.user.id]
    );

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const [items] = await db.query(
      `SELECT oi.price_at_purchase, p.id AS project_id, p.title, p.vendor,
              p.preview_image_path, p.topology_type
       FROM order_items oi
       JOIN projects p ON oi.project_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.json({ success: true, data: { ...orders[0], items } });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCheckout, handleWebhook, listOrders, getOrder };
