const { getPool } = require('../config/db');

/**
 * GET /api/courses
 */
async function list(req, res, next) {
  try {
    const db     = getPool();
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '12', 10)));
    const offset = (page - 1) * limit;
    const { category, difficulty, price_min, price_max, sort = 'newest', q, is_featured } = req.query;

    const conditions = ['c.is_published = TRUE'];
    const params = [];
    let pi = 1;

    if (category)   { conditions.push(`cat.slug = $${pi++}`);        params.push(category); }
    if (difficulty) { conditions.push(`c.difficulty = $${pi++}`);    params.push(difficulty); }
    if (price_min !== undefined) { conditions.push(`c.price >= $${pi++}`); params.push(parseFloat(price_min)); }
    if (price_max !== undefined) { conditions.push(`c.price <= $${pi++}`); params.push(parseFloat(price_max)); }
    if (is_featured === '1' || is_featured === 'true') conditions.push('c.is_featured = TRUE');
    if (q) {
      conditions.push(`(c.title ILIKE $${pi} OR c.description ILIKE $${pi})`);
      params.push(`%${q.trim()}%`); pi++;
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
    const where   = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT c.id, c.title, c.slug, c.description, c.short_description,
              c.image_url, c.price, c.difficulty, c.duration_hours,
              c.student_count, c.rating, c.is_featured, c.created_at,
              cat.name AS category, cat.slug AS category_slug,
              u.name AS instructor_name
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN users u ON c.instructor_id = u.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${pi++} OFFSET $${pi++}`,
      [...params, limit, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(c.id) AS total FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       ${where}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total: parseInt(countRows[0].total, 10) },
    });
  } catch (error) { next(error); }
}

/**
 * GET /api/courses/:id
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
       WHERE c.id = $1`,
      [id]
    );

    if (!courses.length) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courses[0];

    const [modules] = await db.query(
      'SELECT * FROM course_modules WHERE course_id = $1 ORDER BY order_position',
      [id]
    );

    for (const mod of modules) {
      const [lessons] = await db.query(
        'SELECT * FROM course_lessons WHERE module_id = $1 ORDER BY order_position',
        [mod.id]
      );
      mod.lessons = lessons;
    }
    course.modules = modules;

    const [reviews] = await db.query(
      `SELECT cr.*, u.name, u.avatar_url FROM course_reviews cr
       JOIN users u ON cr.user_id = u.id
       WHERE cr.course_id = $1
       ORDER BY cr.created_at DESC`,
      [id]
    );
    course.reviews = reviews;

    res.json({ success: true, data: course });
  } catch (error) { next(error); }
}

/**
 * POST /api/courses
 */
async function create(req, res, next) {
  try {
    const db = getPool();
    const { title, slug, description, long_description, price, category_id, difficulty, duration_hours } = req.body;
    const instructor_id = req.user.id;

    let image_url = null;
    if (req.file) image_url = `/uploads/courses/${req.file.filename}`;

    await db.query(
      `INSERT INTO courses (title, slug, description, long_description, image_url, price, instructor_id, category_id, difficulty, duration_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [title, slug, description, long_description, image_url, price, instructor_id, category_id, difficulty, duration_hours]
    );

    res.status(201).json({ success: true, message: 'Course created successfully' });
  } catch (error) { next(error); }
}

/**
 * PUT /api/courses/:id
 */
async function update(req, res, next) {
  try {
    const db = getPool();
    const { id } = req.params;
    const { title, description, long_description, price, difficulty, duration_hours, is_published, is_featured } = req.body;
    const user_id = req.user.id;

    const [courses] = await db.query('SELECT instructor_id FROM courses WHERE id = $1', [id]);
    if (!courses.length) return res.status(404).json({ error: 'Course not found' });
    if (courses[0].instructor_id !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const fields = {};
    if (title             !== undefined) fields.title             = title;
    if (description       !== undefined) fields.description       = description;
    if (long_description  !== undefined) fields.long_description  = long_description;
    if (price             !== undefined) fields.price             = price;
    if (difficulty        !== undefined) fields.difficulty        = difficulty;
    if (duration_hours    !== undefined) fields.duration_hours    = duration_hours;
    if (is_published      !== undefined) fields.is_published      = !!is_published;
    if (is_featured       !== undefined) fields.is_featured       = !!is_featured;
    if (req.file) fields.image_url = `/uploads/courses/${req.file.filename}`;

    if (!Object.keys(fields).length) return res.json({ success: true, message: 'No changes' });

    const keys   = Object.keys(fields);
    const values = Object.values(fields);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    await db.query(
      `UPDATE courses SET ${setClauses} WHERE id = $${keys.length + 1}`,
      [...values, id]
    );

    res.json({ success: true, message: 'Course updated successfully' });
  } catch (error) { next(error); }
}

/**
 * POST /api/courses/:courseId/reviews
 */
async function addReview(req, res, next) {
  try {
    const db = getPool();
    const { courseId } = req.params;
    const { rating, comment } = req.body;
    const user_id = req.user.id;

    const [enrolled] = await db.query(
      'SELECT id FROM course_enrollments WHERE user_id = $1 AND course_id = $2',
      [user_id, courseId]
    );
    if (!enrolled.length) {
      return res.status(403).json({ error: 'Only enrolled students can review' });
    }

    await db.query(
      `INSERT INTO course_reviews (course_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (course_id, user_id) DO UPDATE
         SET rating = $3, comment = $4, updated_at = NOW()`,
      [courseId, user_id, rating, comment]
    );

    res.json({ success: true, message: 'Review added' });
  } catch (error) { next(error); }
}

/**
 * GET /api/courses/:courseId/enrolled
 */
async function checkEnrollment(req, res, next) {
  try {
    const db = getPool();
    const { courseId } = req.params;

    if (!req.user) return res.json({ enrolled: false });

    const [enrolled] = await db.query(
      'SELECT id FROM course_enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );

    res.json({ enrolled: enrolled.length > 0 });
  } catch (error) { next(error); }
}

module.exports = { list, getDetail, create, update, addReview, checkEnrollment };
