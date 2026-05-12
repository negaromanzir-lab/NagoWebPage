const router = require('express').Router();
const { body, param } = require('express-validator');
const usersController = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadAvatar } = require('../middleware/upload');

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/users/profile
 * @desc   Get the authenticated user's full profile
 * @access Private
 */
router.get('/profile', authenticate, usersController.getProfile);

/**
 * @route  PUT /api/users/profile
 * @desc   Update the authenticated user's profile
 * @access Private
 */
router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('bio').optional().trim().isLength({ max: 500 }),
    body('website').optional().trim().isURL().withMessage('Invalid URL'),
  ],
  validate,
  usersController.updateProfile
);

/**
 * @route  POST /api/users/avatar
 * @desc   Upload a new avatar image
 * @access Private
 */
router.post('/avatar', authenticate, uploadAvatar, usersController.uploadAvatar);

/**
 * @route  GET /api/users/wishlist
 * @desc   Get the authenticated user's wishlist
 * @access Private
 */
router.get('/wishlist', authenticate, usersController.getWishlist);

/**
 * @route  POST /api/users/wishlist/:projectId
 * @desc   Add a project to the wishlist
 * @access Private
 */
router.post(
  '/wishlist/:projectId',
  authenticate,
  [param('projectId').isInt({ min: 1 })],
  validate,
  usersController.addToWishlist
);

/**
 * @route  DELETE /api/users/wishlist/:projectId
 * @desc   Remove a project from the wishlist
 * @access Private
 */
router.delete(
  '/wishlist/:projectId',
  authenticate,
  [param('projectId').isInt({ min: 1 })],
  validate,
  usersController.removeFromWishlist
);

/**
 * @route  GET /api/users          (admin only)
 * @desc   List all users
 * @access Private — admin
 */
router.get('/', authenticate, authorize('admin'), usersController.listAll);

/**
 * @route  PATCH /api/users/:id/role  (admin only)
 * @desc   Change a user's role
 * @access Private — admin
 */
router.patch(
  '/:id/role',
  authenticate,
  authorize('admin'),
  [
    param('id').isInt({ min: 1 }),
    body('role').isIn(['buyer', 'seller', 'admin']).withMessage('Invalid role'),
  ],
  validate,
  usersController.changeRole
);

module.exports = router;
