const { getPool } = require('../config/db');
const path = require('path');
const fs = require('fs');
const emailService = require('../services/emailService');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

// ── Analytics ──────────────────────────────────────────────────────────────────

async function getAnalytics(req, res, next) {
  try {
    const db = getPool();

    const [totalsRows] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE)                           AS total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'seller' AND is_active = TRUE)       AS total_sellers,
        (SELECT COUNT(*) FROM projects WHERE is_deleted = FALSE)                      AS total_projects,
        (SELECT COUNT(*) FROM projects WHERE is_published = TRUE AND is_deleted = FALSE) AS published_projects,
        (SELECT COUNT(*) FROM projects WHERE is_published = FALSE AND is_deleted = FALSE) AS pending_projects,
        (SELECT COUNT(*) FROM orders WHERE status = 'completed')                      AS total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed') AS total_revenue,
        (SELECT COUNT(*) FROM download_logs WHERE status = 'success')                 AS total_downloads,
        (SELECT COUNT(*) FROM reviews)                                                 AS total_reviews,
        (SELECT COUNT(*) FROM users WHERE created_at::date = CURRENT_DATE)            AS new_users_today,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders
          WHERE status = 'completed' AND completed_at::date = CURRENT_DATE)           AS revenue_today
    `);
    const totals = totalsRows[0];

    const [revenueChart] = await db.query(`
      SELECT
        completed_at::date                  AS date,
        COUNT(*)                            AS orders,
        COALESCE(SUM(total_amount), 0)      AS revenue
      FROM orders
      WHERE status = 'completed'
        AND completed_at >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY completed_at::date
      ORDER BY date ASC
    `);

    const [usersChart] = await db.query(`
      SELECT created_at::date AS date, COUNT(*) AS count
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY created_at::date
      ORDER BY date ASC
    `);

    const [topProjects] = await db.query(`
      SELECT
        p.id, p.title, p.vendor, p.price, p.download_count, p.avg_rating,
        COUNT(oi.id)                           AS sales_count,
        COALESCE(SUM(oi.price_at_purchase), 0) AS revenue,
        u.name                                 AS seller_name
      FROM projects p
      LEFT JOIN order_items oi ON oi.project_id = p.id
      LEFT JOIN orders o       ON oi.order_id   = o.id AND o.status = 'completed'
      LEFT JOIN users u        ON p.seller_id   = u.id
      WHERE p.is_deleted = FALSE
      GROUP BY p.id, u.name
      ORDER BY revenue DESC
      LIMIT 5
    `);

    const [topSellers] = await db.query(`
      SELECT
        u.id, u.name, u.email, u.avatar_url,
        COUNT(DISTINCT p.id)                   AS project_count,
        COALESCE(SUM(oi.price_at_purchase), 0) AS total_revenue
      FROM users u
      LEFT JOIN projects    p  ON p.seller_id  = u.id AND p.is_deleted = FALSE
      LEFT JOIN order_items oi ON oi.seller_id = u.id
      LEFT JOIN orders      o  ON oi.order_id  = o.id AND o.status = 'completed'
      WHERE u.role IN ('seller', 'admin')
      GROUP BY u.id
      ORDER BY total_revenue DESC
      LIMIT 5
    `);

    const [recentOrders] = await db.query(`
      SELECT
        o.id, o.total_amount, o.status, o.created_at,
        u.name AS buyer_name, u.email AS buyer_email,
        COUNT(oi.id) AS item_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id, u.name, u.email
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: { totals, revenueChart, usersChart, topProjects, topSellers, recentOrders },
    });
  } catch (err) {
    next(err);
  }
}

// ── User Management ────────────────────────────────────────────────────────────

async function listUsers(req, res, next) {
  try {
    const db     = getPool();
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;
    const { role, search, status } = req.query;

    const conditions = [];
    const params     = [];
    let   pi         = 1;

    if (role)              { conditions.push(`u.role = $${pi++}`);                    params.push(role); }
    if (status === 'active')   conditions.push('u.is_active = TRUE');
    if (status === 'inactive') conditions.push('u.is_active = FALSE');
    if (search) {
      conditions.push(`(u.name ILIKE $${pi} OR u.email ILIKE $${pi})`);
      params.push(`%${search}%`); pi++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [users] = await db.query(
      `SELECT
         u.id, u.name, u.email, u.role, u.is_active, u.avatar_url,
         u.created_at, u.last_login_at,
         COUNT(DISTINCT p.id) AS project_count,
         COUNT(DISTINCT o.id) AS order_count
       FROM users u
       LEFT JOIN projects p ON p.seller_id = u.id AND p.is_deleted = FALSE
       LEFT JOIN orders   o ON o.user_id   = u.id AND o.status = 'completed'
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${pi++} OFFSET $${pi++}`,
      [...params, limit, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM users u ${where}`,
      params
    );

    const total = parseInt(countRows[0].total, 10);
    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      `SELECT id, name, email, role, bio, website, avatar_url,
              is_active, is_email_verified, seller_balance, total_earned,
              created_at, last_login_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    const [orders] = await db.query(
      `SELECT o.id, o.total_amount, o.status, o.created_at, COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id ORDER BY o.created_at DESC LIMIT 10`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], recent_orders: orders } });
  } catch (err) {
    next(err);
  }
}

async function toggleUserStatus(req, res, next) {
  try {
    const db     = getPool();
    const userId = parseInt(req.params.id, 10);

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    }

    const [rows] = await db.query('SELECT is_active FROM users WHERE id = $1', [userId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    const newStatus = !rows[0].is_active;
    await db.query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [newStatus, userId]);

    if (!newStatus) {
      await db.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId]
      );
    }

    setImmediate(async () => {
      try {
        const [userRows] = await db.query('SELECT name, email FROM users WHERE id = $1', [userId]);
        if (userRows.length) await emailService.sendAccountStatusChanged(userRows[0], newStatus);
      } catch { /* non-fatal */ }
    });

    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: { is_active: newStatus },
    });
  } catch (err) {
    next(err);
  }
}

async function changeUserRole(req, res, next) {
  try {
    const db     = getPool();
    const userId = parseInt(req.params.id, 10);

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role' });
    }

    await db.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [req.body.role, userId]);
    res.json({ success: true, message: 'Role updated successfully' });
  } catch (err) {
    next(err);
  }
}

// ── Project Management ─────────────────────────────────────────────────────────

async function listProjects(req, res, next) {
  try {
    const db     = getPool();
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;
    const { status, search, category } = req.query;

    const conditions = [];
    const params     = [];
    let   pi         = 1;

    if (status === 'published') conditions.push('p.is_published = TRUE AND p.is_deleted = FALSE');
    if (status === 'pending')   conditions.push('p.is_published = FALSE AND p.is_deleted = FALSE');
    if (status === 'deleted')   conditions.push('p.is_deleted = TRUE');
    if (!status)                conditions.push('p.is_deleted = FALSE');
    if (category) { conditions.push(`c.slug = $${pi++}`); params.push(category); }
    if (search) {
      conditions.push(`(p.title ILIKE $${pi} OR p.vendor ILIKE $${pi})`);
      params.push(`%${search}%`); pi++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [projects] = await db.query(
      `SELECT
         p.id, p.title, p.vendor, p.price, p.topology_type, p.difficulty,
         p.avg_rating, p.review_count, p.download_count, p.view_count,
         p.is_published, p.is_deleted, p.is_featured,
         p.preview_image_path, p.project_file_path,
         p.created_at, p.updated_at,
         c.name AS category, c.slug AS category_slug,
         u.id AS seller_id, u.name AS seller_name, u.email AS seller_email
       FROM projects p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users      u ON p.seller_id   = u.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${pi++} OFFSET $${pi++}`,
      [...params, limit, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM projects p
       LEFT JOIN categories c ON p.category_id = c.id
       ${where}`,
      params
    );

    const total = parseInt(countRows[0].total, 10);
    res.json({
      success: true,
      data: projects,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function toggleProjectPublish(req, res, next) {
  try {
    const db        = getPool();
    const projectId = parseInt(req.params.id, 10);

    const [rows] = await db.query(
      'SELECT is_published FROM projects WHERE id = $1 AND is_deleted = FALSE',
      [projectId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Project not found' });

    const newStatus = !rows[0].is_published;
    await db.query(
      'UPDATE projects SET is_published = $1, published_at = $2, updated_at = NOW() WHERE id = $3',
      [newStatus, newStatus ? new Date() : null, projectId]
    );

    if (newStatus) {
      setImmediate(async () => {
        try {
          const [projRows] = await db.query(
            `SELECT p.title, u.name AS seller_name, u.email AS seller_email
             FROM projects p JOIN users u ON p.seller_id = u.id WHERE p.id = $1`,
            [projectId]
          );
          if (projRows.length) {
            await emailService.sendProjectPublished({
              seller:  { name: projRows[0].seller_name, email: projRows[0].seller_email },
              project: { id: projectId, title: projRows[0].title },
            });
          }
        } catch { /* non-fatal */ }
      });
    }

    res.json({
      success: true,
      message: `Project ${newStatus ? 'published' : 'unpublished'} successfully`,
      data: { is_published: newStatus },
    });
  } catch (err) {
    next(err);
  }
}

async function toggleProjectFeature(req, res, next) {
  try {
    const db        = getPool();
    const projectId = parseInt(req.params.id, 10);

    const [rows] = await db.query('SELECT is_featured FROM projects WHERE id = $1', [projectId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Project not found' });

    const newVal = !rows[0].is_featured;
    await db.query('UPDATE projects SET is_featured = $1, updated_at = NOW() WHERE id = $2', [newVal, projectId]);

    res.json({ success: true, message: `Project ${newVal ? 'featured' : 'unfeatured'}`, data: { is_featured: newVal } });
  } catch (err) {
    next(err);
  }
}

async function deleteProject(req, res, next) {
  try {
    const db        = getPool();
    const projectId = parseInt(req.params.id, 10);

    const [rows] = await db.query(
      'SELECT preview_image_path, project_file_path FROM projects WHERE id = $1',
      [projectId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Project not found' });

    const { preview_image_path, project_file_path } = rows[0];
    for (const filePath of [preview_image_path, project_file_path]) {
      if (filePath) {
        const abs = path.join(UPLOAD_DIR, 'projects', filePath);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      }
    }

    await db.query('DELETE FROM projects WHERE id = $1', [projectId]);
    res.json({ success: true, message: 'Project permanently deleted' });
  } catch (err) {
    next(err);
  }
}

// ── Order Management ───────────────────────────────────────────────────────────

async function listOrders(req, res, next) {
  try {
    const db     = getPool();
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;
    const { status, search } = req.query;

    const conditions = [];
    const params     = [];
    let   pi         = 1;

    if (status) { conditions.push(`o.status = $${pi++}`); params.push(status); }
    if (search) {
      conditions.push(`(u.name ILIKE $${pi} OR u.email ILIKE $${pi} OR o.id::text ILIKE $${pi})`);
      params.push(`%${search}%`); pi++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [orders] = await db.query(
      `SELECT
         o.id, o.total_amount, o.discount_amount, o.status,
         o.stripe_session_id, o.stripe_payment_intent,
         o.created_at, o.completed_at,
         u.id AS buyer_id, u.name AS buyer_name, u.email AS buyer_email,
         COUNT(oi.id) AS item_count
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${where}
       GROUP BY o.id, u.id
       ORDER BY o.created_at DESC
       LIMIT $${pi++} OFFSET $${pi++}`,
      [...params, limit, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM orders o JOIN users u ON o.user_id = u.id ${where}`,
      params
    );

    const total = parseInt(countRows[0].total, 10);
    res.json({
      success: true,
      data: orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const db = getPool();
    const [orders] = await db.query(
      `SELECT o.*, u.name AS buyer_name, u.email AS buyer_email
       FROM orders o JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (!orders.length) return res.status(404).json({ success: false, message: 'Order not found' });

    const [items] = await db.query(
      `SELECT oi.*, p.title, p.vendor, p.preview_image_path,
              u.name AS seller_name
       FROM order_items oi
       JOIN projects p ON oi.project_id = p.id
       JOIN users    u ON oi.seller_id  = u.id
       WHERE oi.order_id = $1`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...orders[0], items } });
  } catch (err) {
    next(err);
  }
}

async function refundOrder(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT status FROM orders WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Order not found' });
    if (rows[0].status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Only completed orders can be refunded' });
    }

    await db.query(
      "UPDATE orders SET status = 'refunded', refunded_at = NOW() WHERE id = $1",
      [req.params.id]
    );
    res.json({ success: true, message: 'Order marked as refunded' });
  } catch (err) {
    next(err);
  }
}

// ── File Management ────────────────────────────────────────────────────────────

async function listFiles(req, res, next) {
  try {
    const db     = getPool();
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;

    const [files] = await db.query(
      `SELECT
         p.id AS project_id, p.title, p.vendor,
         p.preview_image_path, p.project_file_path,
         p.is_published, p.is_deleted,
         p.download_count, p.created_at,
         u.name AS seller_name
       FROM projects p
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.project_file_path IS NOT NULL
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const [countRows] = await db.query(
      'SELECT COUNT(*) AS total FROM projects WHERE project_file_path IS NOT NULL'
    );
    const total = parseInt(countRows[0].total, 10);

    const enriched = files.map((f) => {
      let fileSize = null;
      if (f.project_file_path) {
        const abs = path.join(UPLOAD_DIR, 'projects', f.project_file_path);
        try { fileSize = fs.statSync(abs).size; } catch { /* missing */ }
      }
      return { ...f, file_size_bytes: fileSize };
    });

    res.json({
      success: true,
      data: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function deleteFile(req, res, next) {
  try {
    const db        = getPool();
    const projectId = parseInt(req.params.projectId, 10);

    const [rows] = await db.query(
      'SELECT project_file_path FROM projects WHERE id = $1',
      [projectId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Project not found' });

    const { project_file_path } = rows[0];
    if (!project_file_path) {
      return res.status(404).json({ success: false, message: 'No file attached to this project' });
    }

    const abs = path.join(UPLOAD_DIR, 'projects', project_file_path);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);

    await db.query(
      'UPDATE projects SET project_file_path = NULL, updated_at = NOW() WHERE id = $1',
      [projectId]
    );

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ── Reviews Moderation ─────────────────────────────────────────────────────────

async function listReviews(req, res, next) {
  try {
    const db     = getPool();
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;
    const { hidden } = req.query;

    const conditions = [];
    if (hidden === 'true')  conditions.push('r.is_hidden = TRUE');
    if (hidden === 'false') conditions.push('r.is_hidden = FALSE');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [reviews] = await db.query(
      `SELECT r.id, r.rating, r.comment, r.is_hidden, r.created_at,
              u.id AS user_id, u.name AS user_name, u.email AS user_email,
              p.id AS project_id, p.title AS project_title
       FROM reviews r
       JOIN users    u ON r.user_id    = u.id
       JOIN projects p ON r.project_id = p.id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM reviews r ${where}`
    );

    const total = parseInt(countRows[0].total, 10);
    res.json({
      success: true,
      data: reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function toggleReviewVisibility(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      'SELECT is_hidden, project_id FROM reviews WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Review not found' });

    const newVal = !rows[0].is_hidden;
    await db.query('UPDATE reviews SET is_hidden = $1 WHERE id = $2', [newVal, req.params.id]);

    await db.query(
      `UPDATE projects
       SET avg_rating   = COALESCE((SELECT AVG(rating) FROM reviews WHERE project_id = $1 AND is_hidden = FALSE), 0),
           review_count = (SELECT COUNT(*) FROM reviews WHERE project_id = $1 AND is_hidden = FALSE)
       WHERE id = $1`,
      [rows[0].project_id]
    );

    res.json({ success: true, message: `Review ${newVal ? 'hidden' : 'visible'}`, data: { is_hidden: newVal } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAnalytics,
  listUsers, getUser, toggleUserStatus, changeUserRole,
  listProjects, toggleProjectPublish, toggleProjectFeature, deleteProject,
  listOrders, getOrder, refundOrder,
  listFiles, deleteFile,
  listReviews, toggleReviewVisibility,
};
