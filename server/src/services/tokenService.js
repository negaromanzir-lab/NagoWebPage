/**
 * tokenService.js
 *
 * Generates and validates cryptographically secure download tokens.
 *
 * Design:
 *  - Raw token  : 32 random bytes → base64url string (sent to client once)
 *  - Stored hash: SHA-256(rawToken) → stored in download_keys.token_hash
 *  - Lookup      : hash the incoming token, query by token_hash
 *  - Expiry      : 24 hours by default (configurable via DOWNLOAD_TOKEN_TTL_HOURS)
 *  - Max uses    : 3 by default (configurable via DOWNLOAD_TOKEN_MAX_USES)
 *
 * This means even if the DB is compromised, raw tokens cannot be recovered.
 */

const crypto = require('crypto');
const { getPool } = require('../config/db');

const TTL_HOURS = parseInt(process.env.DOWNLOAD_TOKEN_TTL_HOURS || '24', 10);
const MAX_USES  = parseInt(process.env.DOWNLOAD_TOKEN_MAX_USES  || '3',  10);

// ── Crypto helpers ─────────────────────────────────────────────────────────────

/** Generate a URL-safe random token string. */
function generateRawToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/** SHA-256 hash of a raw token — used for DB storage and lookup. */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// ── Core operations ────────────────────────────────────────────────────────────

/**
 * Issue a new download token for a specific project + order + user.
 *
 * @param {object} opts
 * @param {number} opts.userId
 * @param {number} opts.projectId
 * @param {string} opts.orderId     — UUID
 * @param {number} [opts.fileId]    — NULL = primary project file
 * @param {string} [opts.ipAddress]
 * @param {string} [opts.userAgent]
 * @param {number} [opts.ttlHours]  — override default TTL
 * @param {number} [opts.maxUses]   — override default max uses
 * @returns {{ rawToken: string, tokenId: number, expiresAt: Date }}
 */
async function issueToken({ userId, projectId, orderId, fileId = null, ipAddress = null, userAgent = null, ttlHours = TTL_HOURS, maxUses = MAX_USES }) {
  const db       = getPool();
  const rawToken = generateRawToken();
  const hash     = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  const [result] = await db.query(
    `INSERT INTO download_keys
       (token, token_hash, user_id, project_id, order_id, file_id,
        expires_at, max_uses, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [rawToken, hash, userId, projectId, orderId, fileId,
     expiresAt, maxUses, ipAddress, userAgent]
  );

  return { rawToken, tokenId: result.insertId, expiresAt };
}

/**
 * Issue tokens for every project in a completed order.
 * Called by both the Stripe webhook and manual payment approval.
 *
 * @param {string} orderId
 * @param {number} userId
 * @param {object} [opts]  — ttlHours, maxUses overrides
 * @returns {Array<{ projectId, rawToken, tokenId, expiresAt }>}
 */
async function issueTokensForOrder(orderId, userId, opts = {}) {
  const db = getPool();

  const [items] = await db.query(
    'SELECT project_id FROM order_items WHERE order_id = ?',
    [orderId]
  );

  const tokens = [];
  for (const item of items) {
    const result = await issueToken({
      userId,
      projectId: item.project_id,
      orderId,
      ...opts,
    });
    tokens.push({ projectId: item.project_id, ...result });
  }

  return tokens;
}

/**
 * Validate and consume one use of a download token.
 *
 * @param {string} rawToken  — the token string from the URL/header
 * @param {number} userId    — must match the token's owner
 * @returns {{ valid: true, key: object } | { valid: false, reason: string }}
 */
async function consumeToken(rawToken, userId) {
  const db   = getPool();
  const hash = hashToken(rawToken);

  const [rows] = await db.query(
    `SELECT id, user_id, project_id, order_id, file_id,
            expires_at, max_uses, use_count, revoked_at
     FROM download_keys
     WHERE token_hash = ?
     LIMIT 1`,
    [hash]
  );

  if (!rows.length) {
    return { valid: false, reason: 'invalid_token' };
  }

  const key = rows[0];

  if (key.user_id !== userId) {
    return { valid: false, reason: 'wrong_user' };
  }

  if (key.revoked_at) {
    return { valid: false, reason: 'revoked' };
  }

  if (new Date(key.expires_at) < new Date()) {
    return { valid: false, reason: 'expired' };
  }

  if (key.max_uses > 0 && key.use_count >= key.max_uses) {
    return { valid: false, reason: 'exhausted' };
  }

  // Atomically increment use_count
  await db.query(
    'UPDATE download_keys SET use_count = use_count + 1, last_used_at = NOW() WHERE id = ?',
    [key.id]
  );

  return { valid: true, key };
}

/**
 * List all active (non-expired, non-revoked) tokens for a user.
 */
async function listUserTokens(userId) {
  const db = getPool();
  const [rows] = await db.query(
    `SELECT
       dk.id, dk.project_id, dk.order_id, dk.file_id,
       dk.expires_at, dk.max_uses, dk.use_count,
       dk.last_used_at, dk.created_at,
       CASE
         WHEN dk.revoked_at IS NOT NULL        THEN 'revoked'
         WHEN dk.expires_at < NOW()            THEN 'expired'
         WHEN dk.max_uses > 0
          AND dk.use_count >= dk.max_uses      THEN 'exhausted'
         ELSE                                       'active'
       END AS key_status,
       p.title AS project_title,
       p.vendor AS project_vendor,
       p.preview_image_path
     FROM download_keys dk
     JOIN projects p ON dk.project_id = p.id
     WHERE dk.user_id = ?
     ORDER BY dk.created_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Revoke a specific token (admin or owner).
 */
async function revokeToken(tokenId) {
  const db = getPool();
  await db.query(
    'UPDATE download_keys SET revoked_at = NOW() WHERE id = ?',
    [tokenId]
  );
}

/**
 * Revoke all active tokens for a user+project combination.
 * Used when a refund is issued.
 */
async function revokeTokensForProject(userId, projectId) {
  const db = getPool();
  await db.query(
    `UPDATE download_keys
     SET revoked_at = NOW()
     WHERE user_id = ? AND project_id = ? AND revoked_at IS NULL`,
    [userId, projectId]
  );
}

/**
 * Delete expired and exhausted tokens older than `daysOld` days.
 * Safe to run as a scheduled job.
 */
async function purgeExpiredTokens(daysOld = 7) {
  const db = getPool();
  const [result] = await db.query(
    `DELETE FROM download_keys
     WHERE (expires_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            OR (max_uses > 0 AND use_count >= max_uses))
       AND revoked_at IS NULL`,
    [daysOld]
  );
  return result.affectedRows;
}

module.exports = {
  generateRawToken,
  hashToken,
  issueToken,
  issueTokensForOrder,
  consumeToken,
  listUserTokens,
  revokeToken,
  revokeTokensForProject,
  purgeExpiredTokens,
  TTL_HOURS,
  MAX_USES,
};
