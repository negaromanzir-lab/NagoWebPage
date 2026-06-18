const express = require('express');
const { list, getDetail, create, update, addReview, checkEnrollment } = require('../controllers/courses.controller');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ── Course image upload (stored in uploads/courses/) ──────────────────────────

const coursesUploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads', 'courses');
if (!fs.existsSync(coursesUploadDir)) fs.mkdirSync(coursesUploadDir, { recursive: true });

const courseImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, coursesUploadDir),
    filename:    (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" is not allowed`), false);
    }
  },
}).single('image');

// ── Public routes ──────────────────────────────────────────────────────────────
router.get('/',                          list);
router.get('/:id',                       getDetail);
router.get('/:courseId/enrolled',        authenticate, checkEnrollment);

// ── Seller/Admin routes ────────────────────────────────────────────────────────
router.post('/',     authenticate, authorize(['seller', 'admin']), courseImageUpload, create);
router.put('/:id',   authenticate, authorize(['seller', 'admin']), courseImageUpload, update);

// ── Student routes ─────────────────────────────────────────────────────────────
router.post('/:courseId/reviews', authenticate, addReview);

module.exports = router;
