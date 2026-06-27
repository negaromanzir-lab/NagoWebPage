const crypto = require('crypto');
const { getPool } = require('../config/db');

const TTL_HOURS = parseInt(process.env.DOWNLOAD_TOKEN_TTL_HOURS || '24', 10);
const MAX_USES  = parseInt(process.env.DOWNLOAD_TOKEN_MAX_USES  || '3',  10);

function generateRawToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function issueToken({ userId, projectId, orderId, fileId = null, ipAddress = null, userAgent = null, ttlHours = TTL_HOURS, maxUses = MAX_USES }) {
  const db        = getPool();
  const rawToken  = generateRawToken();
  const hash      = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  const [result] = await db.query(
    `INSERT INTO download_keys
       (token, token_hash, user_id, project_id, order_id, file_id,
        expires_at, max_uses, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [rawToken, hash, userId, projectId, orderId, fileId,
     expiresAt, maxUses, ipAddress, userAgent]
  );

  return { rawToken, tokenId: result[0].id, expiresAt };
}

async function issueTokensForOrder(orderId, userId, opts = {}) {
  const db = getPool();
  const [items] = await db.query(
    'SELECT project_id FROM order_items WHERE order_id = $1',
    [orderId]
  );

  const tokens = [];
  for (const item of items) {
    const result = await issueToken({ userId, projectId: item.project_id, orderId, ...opts });
    tokens.push({ projectId: item.project_id, ...result });
  }
  return tokens;
}

async function consumeToken(rawToken, userId) {
  const db   = getPool();
  const hash = hashToken(rawToken);

  const [rows] = await db.query(
    `SELECT id, user_id, project_id, order_id, file_id,
            expires_at, max_uses, use_count, revoked_at
     FROM download_keys WHERE token_hash = $1 LIMIT 1`,
    [hash]
  );

  if (!rows.length) return { valid: false, reason: 'invalid_token' };
  const key = rows[0];
  if (key.user_id !== userId)           return { valid: false, reason: 'wrong_user' };
  if (key.revoked_at)                   return { valid: false, reason: 'revoked' };
  if (new Date(key.expires_at) < new Date()) return { valid: false, reason: 'expired' };
  if (key.max_uses > 0 && key.use_count >= key.max_uses) return { valid: false, reason: 'exhausted' };

  await db.query(
    'UPDATE download_keys SET use_count = use_count + 1, last_used_at = NOW() WHERE id = $1',
    [key.id]
  );

  return { valid: true, key };
}

async function listUserTokens(userId) {
  const db = getPool();
  const [rows] = await db.query(
    `SELECT
       dk.id, dk.project_id, dk.order_id, dk.file_id,
       dk.expires_at, dk.max_uses, dk.use_count,
       dk.last_used_at, dk.created_at,
       CASE
         WHEN dk.revoked_at IS NOT NULL              THEN 'revoked'
         WHEN dk.expires_at < NOW()                  THEN 'expired'
         WHEN dk.max_uses > 0
          AND dk.use_count >= dk.max_uses            THEN 'exhausted'
         ELSE                                             'active'
       END AS key_status,
       p.title AS project_title,
       p.vendor AS project_vendor,
       p.preview_image_path
     FROM download_keys dk
     JOIN projects p ON dk.project_id = p.id
     WHERE dk.user_id = $1
     ORDER BY dk.created_at DESC`,
    [userId]
  );
  return rows;
}

async function revokeToken(tokenId) {
  const db = getPool();
  await db.query('UPDATE download_keys SET revoked_at = NOW() WHERE id = $1', [tokenId]);
}

async function revokeTokensForProject(userId, projectId) {
  const db = getPool();
  await db.query(
    'UPDATE download_keys SET revoked_at = NOW() WHERE user_id = $1 AND project_id = $2 AND revoked_at IS NULL',
    [userId, projectId]
  );
}

async function purgeExpiredTokens(daysOld = 7) {
  const db = getPool();
  const [result] = await db.query(
    `DELETE FROM download_keys
     WHERE (expires_at < NOW() - INTERVAL '${daysOld} days'
            OR (max_uses > 0 AND use_count >= max_uses))
       AND revoked_at IS NULL`
  );
  return result.length;
}

module.exports = {
  generateRawToken, hashToken,
  issueToken, issueTokensForOrder,
  consumeToken, listUserTokens,
  revokeToken, revokeTokensForProject,
  purgeExpiredTokens,
  TTL_HOURS, MAX_USES,
};
