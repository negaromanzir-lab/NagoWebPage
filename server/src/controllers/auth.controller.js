const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/db');
const emailService = require('../services/emailService');

// ── Helpers ────────────────────────────────────────────────────────────────────

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function signRefreshToken(userId) {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
}

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const db = getPool();

    // Check for existing email
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, 'buyer']
    );

    const userId = result.insertId;
    const user = { id: userId, email, role: 'buyer' };

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(userId);

    // Persist refresh token
    await db.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))',
      [uuidv4(), userId, refreshToken]
    );

    // Send welcome email (non-blocking)
    emailService.sendWelcome({ name, email }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: { id: userId, name, email, role: 'buyer' },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const db = getPool();

    const [rows] = await db.query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?',
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login timestamp
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user.id);

    await db.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))',
      [uuidv4(), user.id, refreshToken]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const db = getPool();
    const [rows] = await db.query(
      'SELECT id FROM refresh_tokens WHERE token = ? AND user_id = ? AND expires_at > NOW() AND revoked_at IS NULL',
      [refreshToken, decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Refresh token not found or revoked' });
    }

    const [userRows] = await db.query(
      'SELECT id, email, role FROM users WHERE id = ? AND is_active = 1',
      [decoded.id]
    );

    if (!userRows.length) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const newAccessToken = signAccessToken(userRows[0]);

    res.json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const db = getPool();

    if (refreshToken) {
      await db.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ? AND user_id = ?',
        [refreshToken, req.user.id]
      );
    } else {
      // Revoke all tokens for this user
      await db.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
        [req.user.id]
      );
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
async function me(req, res, next) {
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

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const db = getPool();

    const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    // Revoke all refresh tokens to force re-login on other devices
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [req.user.id]
    );

    // Send security notification email (non-blocking)
    const [userRows] = await db.query('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
    if (userRows.length) {
      emailService.sendPasswordChanged({ name: userRows[0].name, email: userRows[0].email }).catch(() => {});
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, me, changePassword };
