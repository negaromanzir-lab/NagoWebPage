const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const rateLimit = require('express-rate-limit');

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Validation chains ──────────────────────────────────────────────────────────

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number'),
];

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/auth/register
 * @desc   Register a new user
 * @access Public
 */
router.post('/register', authLimiter, registerRules, validate, authController.register);

/**
 * @route  POST /api/auth/login
 * @desc   Login and receive JWT + refresh token
 * @access Public
 */
router.post('/login', authLimiter, loginRules, validate, authController.login);

/**
 * @route  POST /api/auth/refresh
 * @desc   Exchange a refresh token for a new access token
 * @access Public
 */
router.post('/refresh', authController.refresh);

/**
 * @route  POST /api/auth/logout
 * @desc   Invalidate the refresh token
 * @access Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route  GET /api/auth/me
 * @desc   Get the authenticated user's profile
 * @access Private
 */
router.get('/me', authenticate, authController.me);

/**
 * @route  PUT /api/auth/change-password
 * @desc   Change the authenticated user's password
 * @access Private
 */
router.put('/change-password', authenticate, changePasswordRules, validate, authController.changePassword);

module.exports = router;
