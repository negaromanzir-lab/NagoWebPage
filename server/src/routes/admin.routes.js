const router = require('express').Router();
const { body, param, query } = require('express-validator');
const adminController          = require('../controllers/admin.controller');
const uploadsController        = require('../controllers/uploads.controller');
const manualPaymentsController = require('../controllers/manualPayments.controller');
const booksController          = require('../controllers/books.controller');
const tokenService             = require('../services/tokenService');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  uploadProjectFile,
  uploadProjectFiles_bulk,
} = require('../middleware/upload');

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// ── Analytics ──────────────────────────────────────────────────────────────────
router.get('/analytics', adminController.getAnalytics);

// ── User Management ────────────────────────────────────────────────────────────
router.get('/users',     adminController.listUsers);
router.get('/users/:id', [param('id').isInt({ min: 1 })], validate, adminController.getUser);

router.patch(
  '/users/:id/status',
  [param('id').isInt({ min: 1 })],
  validate,
  adminController.toggleUserStatus
);

router.patch(
  '/users/:id/role',
  [
    param('id').isInt({ min: 1 }),
    body('role').isIn(['buyer', 'seller', 'admin']).withMessage('Invalid role'),
  ],
  validate,
  adminController.changeUserRole
);

// ── Project Management ─────────────────────────────────────────────────────────
router.get('/projects', adminController.listProjects);

router.patch(
  '/projects/:id/publish',
  [param('id').isInt({ min: 1 })],
  validate,
  adminController.toggleProjectPublish
);

router.patch(
  '/projects/:id/feature',
  [param('id').isInt({ min: 1 })],
  validate,
  adminController.toggleProjectFeature
);

router.delete(
  '/projects/:id',
  [param('id').isInt({ min: 1 })],
  validate,
  adminController.deleteProject
);

// ── Order Management ───────────────────────────────────────────────────────────
router.get('/orders',     adminController.listOrders);
router.get('/orders/:id', adminController.getOrder);

router.patch(
  '/orders/:id/refund',
  adminController.refundOrder
);

// ── File Management ────────────────────────────────────────────────────────────
router.get('/files', adminController.listFiles);

router.delete(
  '/files/:projectId',
  [param('projectId').isInt({ min: 1 })],
  validate,
  adminController.deleteFile
);

// ── Review Moderation ──────────────────────────────────────────────────────────
router.get('/reviews', adminController.listReviews);

router.patch(
  '/reviews/:id/hide',
  [param('id').isInt({ min: 1 })],
  validate,
  adminController.toggleReviewVisibility
);

// ── Upload Management ──────────────────────────────────────────────────────────

/**
 * GET  /api/admin/uploads/stats
 * Storage statistics across all project files.
 */
router.get('/uploads/stats', uploadsController.getStorageStats);

/**
 * GET  /api/admin/uploads/:projectId
 * List all files attached to a project, grouped by type.
 */
router.get(
  '/uploads/:projectId',
  [param('projectId').isInt({ min: 1 })],
  validate,
  uploadsController.listProjectFiles
);

/**
 * POST /api/admin/uploads/:projectId
 * Upload a single file and attach it to a project.
 * Multipart field: `file`
 */
router.post(
  '/uploads/:projectId',
  [param('projectId').isInt({ min: 1 })],
  validate,
  uploadProjectFile,
  uploadsController.uploadSingle
);

/**
 * POST /api/admin/uploads/:projectId/bulk
 * Upload up to 10 files at once.
 * Multipart field: `files[]`
 */
router.post(
  '/uploads/:projectId/bulk',
  [param('projectId').isInt({ min: 1 })],
  validate,
  uploadProjectFiles_bulk,
  uploadsController.uploadBulk
);

/**
 * PATCH /api/admin/uploads/files/:fileId
 * Update file metadata (version, is_primary, file_type).
 */
router.patch(
  '/uploads/files/:fileId',
  [
    param('fileId').isInt({ min: 1 }),
    body('file_type').optional().isIn(['source','preview','diagram','documentation','other']),
    body('version').optional().isLength({ max: 20 }),
  ],
  validate,
  uploadsController.updateFileMeta
);

/**
 * DELETE /api/admin/uploads/files/:fileId
 * Delete a single file record and remove it from disk.
 */
router.delete(
  '/uploads/files/:fileId',
  [param('fileId').isInt({ min: 1 })],
  validate,
  uploadsController.deleteProjectFile
);

// ── Manual Payment Verification ────────────────────────────────────────────────

/**
 * GET /api/admin/manual-payments/settings
 * Get all payment method settings.
 */
router.get('/manual-payments/settings', manualPaymentsController.adminGetSettings);

/**
 * PUT /api/admin/manual-payments/settings/:method
 * Update a payment method's settings.
 */
router.put(
  '/manual-payments/settings/:method',
  [
    param('method').isIn(['telebirr', 'cbe_birr', 'bank_transfer']),
    body('account_name').optional().trim().notEmpty(),
    body('account_number').optional().trim().notEmpty(),
  ],
  validate,
  manualPaymentsController.adminUpdateSettings
);

/**
 * GET /api/admin/manual-payments
 * List all payment proofs with filters.
 */
router.get('/manual-payments', manualPaymentsController.adminListProofs);

/**
 * GET /api/admin/manual-payments/:id
 * Get a single proof with order details.
 */
router.get(
  '/manual-payments/:id',
  [param('id').isInt({ min: 1 })],
  validate,
  manualPaymentsController.adminGetProof
);

/**
 * GET /api/admin/manual-payments/:id/screenshot
 * Stream the screenshot file securely.
 */
router.get(
  '/manual-payments/:id/screenshot',
  [param('id').isInt({ min: 1 })],
  validate,
  manualPaymentsController.adminViewScreenshot
);

/**
 * PATCH /api/admin/manual-payments/:id/approve
 * Approve a payment proof and complete the order.
 */
router.patch(
  '/manual-payments/:id/approve',
  [
    param('id').isInt({ min: 1 }),
    body('note').optional().trim(),
  ],
  validate,
  manualPaymentsController.adminApproveProof
);

/**
 * PATCH /api/admin/manual-payments/:id/reject
 * Reject a payment proof with a reason.
 */
router.patch(
  '/manual-payments/:id/reject',
  [
    param('id').isInt({ min: 1 }),
    body('note').trim().notEmpty().withMessage('Rejection reason is required'),
  ],
  validate,
  manualPaymentsController.adminRejectProof
);

// ── Books Management ───────────────────────────────────────────────────────────

/**
 * GET /api/admin/books
 * List ALL books including drafts and deleted (admin view).
 */
router.get('/books', async (req, res, next) => {
  try {
    const db     = require('../config/db').getPool();
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '15', 10)));
    const offset = (page - 1) * limit;
    const { q }  = req.query;

    const conditions = ['b.is_deleted = 0'];
    const params     = [];
    if (q) {
      conditions.push('(b.title LIKE ? OR b.author LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await db.query(
      `SELECT b.id, b.title, b.author, b.cover_image_path, b.pdf_file_path,
              b.file_size_bytes, b.price, b.is_free, b.is_published, b.is_featured,
              b.download_count, b.rating, b.review_count, b.created_at,
              c.name AS category, c.id AS category_id
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM books b ${where}`, params
    );

    res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

module.exports = router;
