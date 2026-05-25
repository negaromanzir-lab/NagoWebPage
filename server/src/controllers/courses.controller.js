const { getPool } = require('../config/db');
const path = require('path');

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildFileUrl(req, filePath) {
  if (!filePath) return null;
  return `${req.protocol}://${req.get('host')}${filePath}`;
}

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * GET /api/courses
 * Get all courses with filters
 */
async function list(req, res, next) {
  try {
    const db = getPool();
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '12', 10)));
    const offset = (page - 1) * limit;

    const {
      category,
      difficulty,
      price_min,
      price_max,
      sort = 'newest',
      q,
      is_featured,
    } = req.query;

    const conditions = ['c.is_published = 1'];
    const params = [];

    if (category) {
      conditions.push('cat.slug = ?');
      params.push(category);
    }

    if (difficulty) {
      conditions.push('c.difficulty = ?');
      params.push(difficulty);
    }

    if (price_min !== undefined) {
      conditions.push('c.price >= ?');
      params.push(parseFloat(price_min));
    }

    if (price_max !== undefined) {
      conditions.push('c.price <= ?');
      params.push(parseFloat(price_max));
    }

    if (is_featured === '1' || is_featured === 'true') {
      conditions.push('c.is_featured = 1');
    }

    if (q) {
      conditions.push('(c.title LIKE ? OR c.description LIKE ?)');
      const like = `%${q.trim()}%`;
      params.push(like, like);
    }

    const orderMap = {
      newest:     'c.created_at DESC',
      oldest:     'c.created_at ASC',
      price_asc:  'c.price ASC',
      price_desc: 'c.price DESC',
      rating:     'c.rating DESC',
      popular:    'c.student_count DESC',
    };
    const orderBy = orderMap[sort] || 'c.created_at DESC';
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT c.id, c.title, c.slug, c.description, c.short_description,
              c.image_url, c.price, c.difficulty, c.duration_hours,
              c.student_count, c.rating, c.is_featured,
              c.created_at,
              cat.name AS category, cat.slug AS category_slug,
              u.name AS instructor_name
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN users u ON c.instructor_id = u.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(c.id) AS total FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN users u ON c.instructor_id = u.id
       ${where}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/courses/:id
 * Get course details with modules and reviews
 */
async function getDetail(req, res, next) {
  try {
    const db = getPool();
    const { id } = req.params;

    const [courses] = await db.query(
      `SELECT c.*, u.name AS instructor_name, cat.name AS category_name, cat.slug AS category_slug
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.id = ?`,
      [id]
    );

    if (!courses.length) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courses[0];

    // Get modules and lessons
    const [modules] = await db.query(
      `SELECT * FROM course_modules WHERE course_id = ? ORDER BY order_position`,
      [id]
    );

    for (let mod of modules) {
      const [lessons] = await db.query(
        `SELECT * FROM course_lessons WHERE module_id = ? ORDER BY order_position`,
        [mod.id]
      );
      mod.lessons = lessons;
    }

    course.modules = modules;

    // Get reviews
    const [reviews] = await db.query(
      `SELECT cr.*, u.name, u.avatar_url FROM course_reviews cr
       JOIN users u ON cr.user_id = u.id
       WHERE cr.course_id = ?
       ORDER BY cr.created_at DESC`,
      [id]
    );

    course.reviews = reviews;

    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/courses
 * Create course (seller/admin only)
 */
async function create(req, res, next) {
  try {
    const db = getPool();
    const { title, slug, description, long_description, price, category_id, difficulty, duration_hours } = req.body;
    const instructor_id = req.user.id;

    let image_url = null;
    if (req.file) {
      image_url = `/uploads/courses/${req.file.filename}`;
    }

    await db.query(
      `INSERT INTO courses (title, slug, description, long_description, image_url, price, instructor_id, category_id, difficulty, duration_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, description, long_description, image_url, price, instructor_id, category_id, difficulty, duration_hours]
    );

    res.status(201).json({ success: true, message: 'Course created successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/courses/:id
 * Update course (owner/admin only)
 */
async function update(req, res, next) {
  try {
    const db = getPool();
    const { id } = req.params;
    const { title, description, long_description, price, difficulty, duration_hours, is_published, is_featured } = req.body;
    const user_id = req.user.id;

    // Check ownership
    const [courses] = await db.query(
      `SELECT instructor_id FROM courses WHERE id = ?`,
      [id]
    );

    if (!courses.length) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (courses[0].instructor_id !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (long_description !== undefined) { updates.push('long_description = ?'); params.push(long_description); }
    if (price !== undefined) { updates.push('price = ?'); params.push(price); }
    if (difficulty !== undefined) { updates.push('difficulty = ?'); params.push(difficulty); }
    if (duration_hours !== undefined) { updates.push('duration_hours = ?'); params.push(duration_hours); }
    if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published ? 1 : 0); }
    if (is_featured !== undefined) { updates.push('is_featured = ?'); params.push(is_featured ? 1 : 0); }

    if (req.file) {
      updates.push('image_url = ?');
      params.push(`/uploads/courses/${req.file.filename}`);
    }

    if (!updates.length) {
      return res.json({ success: true, message: 'No changes' });
    }

    params.push(id);

    await db.query(
      `UPDATE courses SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ success: true, message: 'Course updated successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/courses/:courseId/reviews
 * Add review to course
 */
async function addReview(req, res, next) {
  try {
    const db = getPool();
    const { courseId } = req.params;
    const { rating, comment } = req.body;
    const user_id = req.user.id;

    // Check if user is enrolled
    const [enrolled] = await db.query(
      `SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?`,
      [user_id, courseId]
    );

    if (!enrolled.length) {
      return res.status(403).json({ error: 'Only enrolled students can review' });
    }

    await db.query(
      `INSERT INTO course_reviews (course_id, user_id, rating, comment)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = ?, comment = ?, updated_at = NOW()`,
      [courseId, user_id, rating, comment, rating, comment]
    );

    res.json({ success: true, message: 'Review added' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/courses/:courseId/enrolled
 * Check if user is enrolled
 */
async function checkEnrollment(req, res, next) {
  try {
    const db = getPool();
    const { courseId } = req.params;

    if (!req.user) {
      return res.json({ enrolled: false });
    }

    const [enrolled] = await db.query(
      `SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?`,
      [req.user.id, courseId]
    );

    res.json({ enrolled: enrolled.length > 0 });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getDetail,
  create,
  update,
  addReview,
  checkEnrollment,
};
