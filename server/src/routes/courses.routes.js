const express = require('express');
const { list, getDetail, create, update, addReview, checkEnrollment } = require('../controllers/courses.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// ── Public routes ──────────────────────────────────────────────────────────────
router.get('/', list);
router.get('/:id', getDetail);
router.get('/:courseId/enrolled', authenticate, checkEnrollment);

// ── Seller/Admin routes ────────────────────────────────────────────────────────
router.post('/', authenticate, authorize(['seller', 'admin']), upload.single('image'), create);
router.put('/:id', authenticate, authorize(['seller', 'admin']), upload.single('image'), update);

// ── Student routes ─────────────────────────────────────────────────────────────
router.post('/:courseId/reviews', authenticate, addReview);

module.exports = router;
