/**
 * oauth.controller.js
 *
 * After passport authenticates the user, these handlers:
 *   1. Issue JWT access + refresh tokens
 *   2. Redirect to the frontend with tokens in the URL
 *   3. The frontend reads the tokens, stores them, and clears the URL
 */

const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getPool }    = require('../config/db');

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

/**
 * Called after passport.authenticate() succeeds.
 * req.user is set by passport to the DB user row.
 */
async function handleOAuthCallback(req, res) {
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${clientUrl}/login?error=oauth_failed`);
    }

    const db           = getPool();
    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user.id);

    // Persist refresh token
    await db.query(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')`,
      [uuidv4(), user.id, refreshToken]
    );

    // Redirect to frontend /oauth/callback with tokens in query params
    // The frontend page will read them, store them, then redirect to dashboard
    const params = new URLSearchParams({
      access_token:  accessToken,
      refresh_token: refreshToken,
      user_id:       String(user.id),
      name:          user.name,
      email:         user.email || '',
      role:          user.role,
    });

    res.redirect(`${clientUrl}/oauth/callback?${params.toString()}`);
  } catch (err) {
    console.error('[OAuth] Callback error:', err.message);
    const clientUrl2 = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    res.redirect(`${clientUrl2}/login?error=oauth_failed`);
  }
}

module.exports = { handleOAuthCallback };
