const router = require('express').Router();
const { body, query, param } = require('express-validator');
const projectsController = require('../controllers/projects.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadProjectFiles } = require('../middleware/upload');

// ── Validation chains ──────────────────────────────────────────────────────────

const projectRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
  body('vendor').trim().notEmpty().withMessage('Vendor is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('topology_type')
    .isIn(['star', 'mesh', 'ring', 'hierarchical', 'bus', 'hybrid', 'cloud', 'sdwan'])
    .withMessage('Invalid topology type'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid difficulty level'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
];

const listQueryRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
  query('price_min').optional().isFloat({ min: 0 }),
  query('price_max').optional().isFloat({ min: 0 }),
  query('rating_min').optional().isFloat({ min: 0, max: 5 }),
  query('is_featured').optional().isIn(['0', '1', 'true', 'false']),
  query('sort')
    .optional()
    .isIn(['newest', 'oldest', 'price_asc', 'price_desc', 'rating', 'popular'])
    .withMessage('Invalid sort option'),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('topology_type').optional().isIn(['star','mesh','ring','hierarchical','bus','hybrid','cloud','sdwan']),
];

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/projects
 * @desc   List projects with filtering, sorting, and pagination
 * @access Public (shows extra fields when authenticated)
 */
router.get('/', optionalAuth, listQueryRules, validate, projectsController.list);

/**
 * @route  GET /api/projects/categories
 * @desc   Get all project categories
 * @access Public
 */
router.get('/categories', projectsController.getCategories);

/**
 * @route  GET /api/projects/filter-meta
 * @desc   Get all distinct filter values (categories, vendors, price range, etc.)
 * @access Public
 */
router.get('/filter-meta', projectsController.getFilterMeta);

/**
 * @route  GET /api/projects/search
 * @desc   Full-text search across projects
 * @access Public
 */
router.get('/search', optionalAuth, projectsController.search);

/**
 * @route  GET /api/projects/:id
 * @desc   Get a single project by ID
 * @access Public
 */
router.get('/:id', [param('id').isInt({ min: 1 })], validate, optionalAuth, projectsController.getOne);

/**
 * @route  POST /api/projects
 * @desc   Create a new project (with file upload)
 * @access Private — seller or admin
 */
router.post(
  '/',
  authenticate,
  authorize('seller', 'admin'),
  uploadProjectFiles,
  projectRules,
  validate,
  projectsController.create
);

/**
 * @route  PUT /api/projects/:id
 * @desc   Update a project
 * @access Private — owner seller or admin
 */
router.put(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  uploadProjectFiles,
  [param('id').isInt({ min: 1 }), ...projectRules.map((r) => r.optional())],
  validate,
  projectsController.update
);

/**
 * @route  DELETE /api/projects/:id
 * @desc   Soft-delete a project
 * @access Private — owner seller or admin
 */
router.delete(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  [param('id').isInt({ min: 1 })],
  validate,
  projectsController.remove
);

/**
 * @route  POST /api/projects/:id/reviews
 * @desc   Add a review to a project
 * @access Private — buyer who purchased the project
 */
router.post(
  '/:id/reviews',
  authenticate,
  [
    param('id').isInt({ min: 1 }),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
    body('comment').optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  projectsController.addReview
);

module.exports = router;
