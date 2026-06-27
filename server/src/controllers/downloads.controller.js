const path = require('path');
const fs   = require('fs');
const { getPool }    = require('../config/db');
const { UPLOAD_DIR } = require('../middleware/upload');
const tokenService   = require('../services/tokenService');
const emailService   = require('../services/emailService');

const DENIAL_MESSAGES = {
  invalid_token: 'Download link is invalid',
  wrong_user:    'This download link belongs to a different account',
  revoked:       'This download link has been revoked',
  expired:       'This download link has expired. Please request a new one.',
  exhausted:     'This download link has reached its maximum use limit. Please request a new one.',
};

function resolveFilePath(filePath) {
  if (!filePath) return null;
  if (filePath.includes('/') || filePath.includes('\\')) {
    return path.join(UPLOAD_DIR, filePath);
  }
  return path.join(UPLOAD_DIR, 'projects', filePath);
}

// ── 1. Request a download token ────────────────────────────────────────────────

async function requestToken(req, res, next) {
  try {
    const db        = getPool();
    const projectId = parseInt(req.params.projectId, 10);
    const userId    = req.user.id;

    const [purchase] = await db.query(
      `SELECT o.id AS order_id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.project_id = $2 AND o.status = 'completed'
       ORDER BY o.completed_at DESC
       LIMIT 1`,
      [userId, projectId]
    );

    if (!purchase.length) {
      return res.status(403).json({
        success: false,
        message: 'You must purchase this project before downloading',
      });
    }

    const [projects] = await db.query(
      'SELECT id, title, project_file_path FROM projects WHERE id = $1 AND is_deleted = FALSE',
      [projectId]
    );

    if (!projects.length) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!projects[0].project_file_path) {
      return res.status(404).json({
        success: false,
        message: 'Project file is not available yet. Please check back later.',
      });
    }

    const { rawToken, tokenId, expiresAt } = await tokenService.issueToken({
      userId,
      projectId,
      orderId:   purchase[0].order_id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'Download token issued. Use it within 24 hours (max 3 downloads).',
      data: {
        token:       rawToken,
        tokenId,
        projectId,
        expiresAt,
        maxUses:     tokenService.MAX_USES,
        ttlHours:    tokenService.TTL_HOURS,
        downloadUrl: `/api/downloads/file?token=${rawToken}`,
      },
    });

    setImmediate(async () => {
      try {
        const [userRows] = await db.query('SELECT name, email FROM users WHERE id = $1', [userId]);
        if (userRows.length) {
          const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
          await emailService.sendDownloadLinkReady({
            user: userRows[0],
            tokenInfo: {
              projectTitle: projects[0].title,
              expiresAt,
              maxUses:     tokenService.MAX_USES || 3,
              downloadUrl: `${clientUrl}/api/downloads/file?token=${rawToken}`,
            },
          });
        }
      } catch { /* non-fatal */ }
    });
  } catch (err) {
    next(err);
  }
}

// ── 2. Redeem token and stream file ───────────────────────────────────────────

async function downloadWithToken(req, res, next) {
  const startTime = Date.now();
  const db        = getPool();
  let   keyId     = null;
  let   projectId = null;
  let   userId    = null;
  let   orderId   = null;

  try {
    const rawToken = req.query.token;

    if (!rawToken) {
      return res.status(400).json({ success: false, message: 'Download token is required' });
    }

    const hash = tokenService.hashToken(rawToken);
    const [keyRows] = await db.query(
      `SELECT id, user_id, project_id, order_id, file_id,
              expires_at, max_uses, use_count, revoked_at
       FROM download_keys WHERE token_hash = $1 LIMIT 1`,
      [hash]
    );

    if (!keyRows.length) {
      await logDownload(db, null, null, null, null, req, 'invalid_key', 0);
      return res.status(401).json({ success: false, message: DENIAL_MESSAGES.invalid_token });
    }

    const key = keyRows[0];
    keyId     = key.id;
    projectId = key.project_id;
    userId    = key.user_id;
    orderId   = key.order_id;

    if (key.revoked_at) {
      await logDownload(db, userId, projectId, orderId, keyId, req, 'failed', 0);
      return res.status(403).json({ success: false, message: DENIAL_MESSAGES.revoked });
    }

    if (new Date(key.expires_at) < new Date()) {
      await logDownload(db, userId, projectId, orderId, keyId, req, 'expired_key', 0);
      return res.status(410).json({ success: false, message: DENIAL_MESSAGES.expired });
    }

    if (key.max_uses > 0 && key.use_count >= key.max_uses) {
      await logDownload(db, userId, projectId, orderId, keyId, req, 'failed', 0);
      return res.status(429).json({ success: false, message: DENIAL_MESSAGES.exhausted });
    }

    const [projects] = await db.query(
      'SELECT title, project_file_path FROM projects WHERE id = $1 AND is_deleted = FALSE',
      [projectId]
    );

    if (!projects.length || !projects[0].project_file_path) {
      return res.status(404).json({ success: false, message: 'Project file not found' });
    }

    const { title, project_file_path } = projects[0];
    const absPath = resolveFilePath(project_file_path);

    if (!absPath || !fs.existsSync(absPath)) {
      console.error(`[downloads] File missing on disk: ${absPath}`);
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    await db.query(
      'UPDATE download_keys SET use_count = use_count + 1, last_used_at = NOW() WHERE id = $1',
      [keyId]
    );

    const stat      = fs.statSync(absPath);
    const ext       = path.extname(project_file_path);
    const safeName  = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dlName    = `${safeName}${ext}`;
    const remaining = key.max_uses > 0 ? key.max_uses - key.use_count - 1 : 'unlimited';

    res.setHeader('Content-Disposition',    `attachment; filename="${dlName}"`);
    res.setHeader('Content-Type',           'application/octet-stream');
    res.setHeader('Content-Length',         stat.size);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control',          'no-store');
    res.setHeader('X-Downloads-Remaining',  String(remaining));

    const stream = fs.createReadStream(absPath);

    stream.on('error', (err) => {
      console.error('[downloads] Stream error:', err);
      if (!res.headersSent) res.status(500).json({ success: false, message: 'Error streaming file' });
    });

    stream.on('close', async () => {
      const duration = Date.now() - startTime;
      await logDownload(db, userId, projectId, orderId, keyId, req, 'success', stat.size, duration);
    });

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

// ── 3. List user's tokens ──────────────────────────────────────────────────────

async function listMyTokens(req, res, next) {
  try {
    const tokens = await tokenService.listUserTokens(req.user.id);
    res.json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
}

// ── 4. Download history ────────────────────────────────────────────────────────

async function getHistory(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      `SELECT
         dl.id, dl.status, dl.bytes_sent, dl.duration_ms, dl.downloaded_at,
         dl.ip_address,
         p.id    AS project_id,
         p.title AS project_title,
         p.vendor
       FROM download_logs dl
       JOIN projects p ON dl.project_id = p.id
       WHERE dl.user_id = $1
       ORDER BY dl.downloaded_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// ── 5. Revoke a token ─────────────────────────────────────────────────────────

async function revokeMyToken(req, res, next) {
  try {
    const db      = getPool();
    const tokenId = parseInt(req.params.tokenId, 10);

    const [rows] = await db.query(
      'SELECT id, user_id FROM download_keys WHERE id = $1',
      [tokenId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    if (rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await tokenService.revokeToken(tokenId);
    res.json({ success: true, message: 'Token revoked successfully' });
  } catch (err) {
    next(err);
  }
}

// ── Internal: log a download event ────────────────────────────────────────────

async function logDownload(db, userId, projectId, orderId, keyId, req, status, bytesSent, durationMs = null) {
  try {
    if (!userId || !projectId) return;
    await db.query(
      `INSERT INTO download_logs
         (user_id, project_id, order_id, download_key_id,
          ip_address, user_agent, status, bytes_sent, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId, projectId, orderId || null, keyId || null,
        req.ip,
        (req.headers['user-agent'] || '').slice(0, 512),
        status,
        bytesSent || 0,
        durationMs,
      ]
    );
  } catch (e) {
    console.error('[downloads] Failed to log download:', e.message);
  }
}

module.exports = { requestToken, downloadWithToken, listMyTokens, getHistory, revokeMyToken };
