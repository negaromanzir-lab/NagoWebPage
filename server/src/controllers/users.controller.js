const { getPool } = require('../config/db');
const path = require('path');

/**
 * GET /api/users/profile
 */
async function getProfile(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      `SELECT id, name, email, role, bio, website, avatar_url, created_at, last_login_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch purchase stats
    const [[stats]] = await db.query(
      `SELECT COUNT(DISTINCT o.id) AS total_orders,
              COUNT(DISTINCT oi.project_id) AS total_purchases
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ? AND o.status = 'completed'`,
      [req.user.id]
    );

    res.json({ success: true, data: { ...rows[0], stats } });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/profile
 */
async function updateProfile(req, res, next) {
  try {
    const db = getPool();
    const { name, bio, website } = req.body;

    const fields = {};
    if (name !== undefined) fields.name = name;
    if (bio !== undefined) fields.bio = bio;
    if (website !== undefined) fields.website = website;

    if (!Object.keys(fields).length) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const setClauses = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
    await db.query(
      `UPDATE users SET ${setClauses}, updated_at = NOW() WHERE id = ?`,
      [...Object.values(fields), req.user.id]
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/avatar
 */
async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const db = getPool();
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    await db.query('UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?', [
      avatarUrl,
      req.user.id,
    ]);

    res.json({ success: true, message: 'Avatar updated', data: { avatarUrl } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/wishlist
 */
async function getWishlist(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      `SELECT p.id, p.title, p.vendor, p.price, p.avg_rating, p.preview_image_path,
              c.name AS category, w.created_at AS added_at
       FROM wishlists w
       JOIN projects p ON w.project_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE w.user_id = ? AND p.is_deleted = 0
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/wishlist/:projectId
 */
async function addToWishlist(req, res, next) {
  try {
    const db = getPool();
    const projectId = parseInt(req.params.projectId, 10);

    const [project] = await db.query(
      'SELECT id FROM projects WHERE id = ? AND is_deleted = 0',
      [projectId]
    );

    if (!project.length) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    await db.query(
      'INSERT IGNORE INTO wishlists (user_id, project_id) VALUES (?, ?)',
      [req.user.id, projectId]
    );

    res.status(201).json({ success: true, message: 'Added to wishlist' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/users/wishlist/:projectId
 */
async function removeFromWishlist(req, res, next) {
  try {
    const db = getPool();
    await db.query(
      'DELETE FROM wishlists WHERE user_id = ? AND project_id = ?',
      [req.user.id, parseInt(req.params.projectId, 10)]
    );

    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users  (admin)
 */
async function listAll(req, res, next) {
  try {
    const db = getPool();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT id, name, email, role, is_active, created_at, last_login_at
       FROM users
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM users');

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/users/:id/role  (admin)
 */
async function changeRole(req, res, next) {
  try {
    const db = getPool();
    const userId = parseInt(req.params.id, 10);

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role' });
    }

    await db.query('UPDATE users SET role = ? WHERE id = ?', [req.body.role, userId]);

    res.json({ success: true, message: 'Role updated successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile, updateProfile, uploadAvatar,
  getWishlist, addToWishlist, removeFromWishlist,
  listAll, changeRole,
};
