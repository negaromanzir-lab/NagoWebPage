const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const { v4: uuidv4 } = require('uuid');
const { body, param, query } = require('express-validator');
const booksController = require('../controllers/books.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// ── Upload storage ─────────────────────────────────────────────────────────────

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const COVERS_DIR = path.join(UPLOAD_DIR, 'books', 'covers');
const PDFS_DIR   = path.join(UPLOAD_DIR, 'books', 'pdfs');
[COVERS_DIR, PDFS_DIR].forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const bookUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, file.fieldname === 'pdf' ? PDFS_DIR : COVERS_DIR);
    },
    filename: (_req, file, cb) => {
      cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    const allowed = {
      pdf:   ['application/pdf'],
      cover: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    };
    const ok = (allowed[file.fieldname] || allowed.cover).includes(file.mimetype);
    cb(ok ? null : new Error(`File type not allowed for ${file.fieldname}`), ok);
  },
}).fields([
  { name: 'pdf',   maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

// ── Public routes ──────────────────────────────────────────────────────────────

router.get('/',          booksController.list);
router.get('/featured',  booksController.featured);
router.get('/:id',       [param('id').isInt({ min: 1 })], validate, booksController.getOne);
router.get('/:id/download', optionalAuth, [param('id').isInt({ min: 1 })], validate, booksController.download);

// ── Authenticated routes ───────────────────────────────────────────────────────

router.post(
  '/:id/reviews',
  authenticate,
  [
    param('id').isInt({ min: 1 }),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
    body('comment').optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  booksController.addReview
);

// ── Admin routes ───────────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  authorize('admin', 'seller'),
  bookUpload,
  booksController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'seller'),
  bookUpload,
  [param('id').isInt({ min: 1 })],
  validate,
  booksController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  [param('id').isInt({ min: 1 })],
  validate,
  booksController.remove
);

router.patch(
  '/:id/publish',
  authenticate,
  authorize('admin'),
  [param('id').isInt({ min: 1 })],
  validate,
  booksController.togglePublish
);

router.patch(
  '/:id/feature',
  authenticate,
  authorize('admin'),
  [param('id').isInt({ min: 1 })],
  validate,
  booksController.toggleFeature
);

module.exports = router;
