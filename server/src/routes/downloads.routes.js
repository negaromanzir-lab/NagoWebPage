const router = require('express').Router();
const { param, query } = require('express-validator');
const downloadsController = require('../controllers/downloads.controller');
const { authenticate }    = require('../middleware/auth');
const { validate }        = require('../middleware/validate');
const rateLimit           = require('express-rate-limit');

// ── Rate limiters ──────────────────────────────────────────────────────────────

/** Limit token requests — prevents token farming */
const tokenRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => `token_req_${req.user?.id || req.ip}`,
  message: { success: false, message: 'Too many token requests. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Limit actual file downloads — prevents bandwidth abuse */
const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => `dl_${req.query.token?.slice(0, 16) || req.ip}`,
  message: { success: false, message: 'Too many download attempts. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/downloads/token/:projectId
 * @desc   Request a secure download token for a purchased project
 *         Token expires in 24h and allows max 3 downloads
 * @access Private — must have purchased the project
 */
router.post(
  '/token/:projectId',
  authenticate,
  tokenRequestLimiter,
  [param('projectId').isInt({ min: 1 }).withMessage('Invalid project ID')],
  validate,
  downloadsController.requestToken
);

/**
 * @route  GET /api/downloads/file?token=<rawToken>
 * @desc   Redeem a download token and stream the file
 *         No JWT required — token IS the credential
 * @access Token-gated (no auth middleware — token validates itself)
 */
router.get(
  '/file',
  downloadLimiter,
  [query('token').notEmpty().withMessage('Token is required')],
  validate,
  downloadsController.downloadWithToken
);

/**
 * @route  GET /api/downloads/my-tokens
 * @desc   List all download tokens for the authenticated user
 * @access Private
 */
router.get('/my-tokens', authenticate, downloadsController.listMyTokens);

/**
 * @route  GET /api/downloads/history
 * @desc   Get the authenticated user's download history
 * @access Private
 */
router.get('/history', authenticate, downloadsController.getHistory);

/**
 * @route  DELETE /api/downloads/token/:tokenId
 * @desc   Revoke a specific download token (owner only)
 * @access Private
 */
router.delete(
  '/token/:tokenId',
  authenticate,
  [param('tokenId').isInt({ min: 1 }).withMessage('Invalid token ID')],
  validate,
  downloadsController.revokeMyToken
);

module.exports = router;
