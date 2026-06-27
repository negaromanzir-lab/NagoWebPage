const { getPool } = require('../config/db');
const path = require('path');
const fs = require('fs');

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * GET /api/projects
 */
async function list(req, res, next) {
  try {
    const db = getPool();
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '12', 10)));
    const offset = (page - 1) * limit;

    const { category, vendor, topology_type, difficulty,
            price_min, price_max, rating_min, is_featured,
            sort = 'newest', q, tags } = req.query;

    const conditions = ['p.is_deleted = FALSE', 'p.is_published = TRUE'];
    const params = [];
    let   pi    = 1; // parameter index

    if (category)     { conditions.push(`c.slug = $${pi++}`);           params.push(category); }
    if (vendor)       { conditions.push(`p.vendor = $${pi++}`);         params.push(vendor); }
    if (topology_type){ conditions.push(`p.topology_type = $${pi++}`);  params.push(topology_type); }
    if (difficulty)   { conditions.push(`p.difficulty = $${pi++}`);     params.push(difficulty); }
    if (price_min !== undefined) { conditions.push(`p.price >= $${pi++}`); params.push(parseFloat(price_min)); }
    if (price_max !== undefined) { conditions.push(`p.price <= $${pi++}`); params.push(parseFloat(price_max)); }
    if (rating_min !== undefined) { conditions.push(`p.avg_rating >= $${pi++}`); params.push(parseFloat(rating_min)); }
    if (is_featured === '1' || is_featured === 'true') { conditions.push('p.is_featured = TRUE'); }

    // Tag filter
    const tagList = tags
      ? (Array.isArray(tags) ? tags : tags.split(',')).map((t) => t.trim()).filter(Boolean)
      : [];
    if (tagList.length) {
      conditions.push(`EXISTS (SELECT 1 FROM project_tags pt WHERE pt.project_id = p.id AND pt.tag = ANY($${pi++}))`);
      params.push(tagList);
    }

    if (q) {
      conditions.push(`(p.title ILIKE $${pi} OR p.description ILIKE $${pi} OR p.vendor ILIKE $${pi} OR p.short_description ILIKE $${pi})`);
      params.push(`%${q.trim()}%`);
      pi++;
    }

    const orderMap = {
      newest:     'p.created_at DESC',
      oldest:     'p.created_at ASC',
      price_asc:  'p.price ASC',
      price_desc: 'p.price DESC',
      rating:     'p.avg_rating DESC',
      popular:    'p.download_count DESC',
    };
    const orderBy = orderMap[sort] || 'p.created_at DESC';
    const where   = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await db.query(
      `SELECT p.id, p.title, p.vendor, p.price, p.original_price,
              p.topology_type, p.difficulty, p.is_featured,
              p.avg_rating, p.review_count, p.download_count,
              p.preview_image_path, p.short_description,
              p.created_at,
              c.name AS category, c.slug AS category_slug,
              u.name AS seller_name,
              STRING_AGG(DISTINCT pt.tag, ',') AS tags
       FROM projects p
       LEFT JOIN categories c  ON p.category_id = c.id
       LEFT JOIN users      u  ON p.seller_id   = u.id
       LEFT JOIN project_tags pt ON pt.project_id = p.id
       ${where}
       GROUP BY p.id, c.name, c.slug, u.name
       ORDER BY ${orderBy}
       LIMIT $${pi++} OFFSET $${pi++}`,
      [...params, limit, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(DISTINCT p.id) AS total FROM projects p
       LEFT JOIN categories c  ON p.category_id = c.id
       LEFT JOIN project_tags pt ON pt.project_id = p.id
       ${where}`,
      params
    );

    const total = parseInt(countRows[0].total, 10);

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/filter-meta
 */
async function getFilterMeta(req, res, next) {
  try {
    const db = getPool();

    const [categories] = await db.query(
      `SELECT c.id, c.name, c.slug, c.icon, c.color,
              COUNT(p.id) AS project_count
       FROM categories c
       LEFT JOIN projects p ON p.category_id = c.id
         AND p.is_deleted = FALSE AND p.is_published = TRUE
       GROUP BY c.id
       HAVING COUNT(p.id) > 0
       ORDER BY c.sort_order ASC, c.name ASC`
    );

    const [vendors] = await db.query(
      `SELECT vendor, COUNT(*) AS count
       FROM projects
       WHERE is_deleted = FALSE AND is_published = TRUE
       GROUP BY vendor
       ORDER BY count DESC`
    );

    const [priceRows] = await db.query(
      `SELECT MIN(price) AS min_price, MAX(price) AS max_price
       FROM projects WHERE is_deleted = FALSE AND is_published = TRUE`
    );
    const priceRange = priceRows[0];

    const [countRows] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN is_featured = TRUE THEN 1 ELSE 0 END) AS featured,
         SUM(CASE WHEN price = 0 THEN 1 ELSE 0 END) AS free
       FROM projects WHERE is_deleted = FALSE AND is_published = TRUE`
    );
    const counts = countRows[0];

    const [topTags] = await db.query(
      `SELECT pt.tag, COUNT(*) AS count
       FROM project_tags pt
       JOIN projects p ON pt.project_id = p.id
       WHERE p.is_deleted = FALSE AND p.is_published = TRUE
       GROUP BY pt.tag
       ORDER BY count DESC
       LIMIT 20`
    );

    res.json({
      success: true,
      data: {
        categories,
        vendors,
        topTags,
        priceRange: {
          min: parseFloat(priceRange.min_price || 0),
          max: parseFloat(priceRange.max_price || 200),
        },
        topologyTypes: ['star','mesh','ring','hierarchical','bus','hybrid','cloud','sdwan'],
        difficulties:  ['beginner','intermediate','advanced'],
        counts,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/categories
 */
async function getCategories(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      `SELECT c.id, c.name, c.slug, c.icon, c.color,
              COUNT(p.id) AS project_count
       FROM categories c
       LEFT JOIN projects p ON p.category_id = c.id AND p.is_deleted = FALSE AND p.is_published = TRUE
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/search
 */
async function search(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }

    const db = getPool();
    const like = `%${q.trim()}%`;

    const [rows] = await db.query(
      `SELECT p.id, p.title, p.vendor, p.price, p.topology_type,
              p.avg_rating, p.preview_image_path,
              c.name AS category
       FROM projects p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_deleted = FALSE AND p.is_published = TRUE
         AND (p.title ILIKE $1 OR p.description ILIKE $1 OR p.vendor ILIKE $1 OR c.name ILIKE $1)
       ORDER BY p.avg_rating DESC
       LIMIT 20`,
      [like]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id
 */
async function getOne(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      `SELECT p.*, c.name AS category, c.slug AS category_slug,
              u.name AS seller_name, u.avatar_url AS seller_avatar
       FROM projects p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.id = $1 AND p.is_deleted = FALSE`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = rows[0];

    const [reviews] = await db.query(
      `SELECT r.rating, r.comment, r.created_at, u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.project_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [project.id]
    );

    let hasPurchased = false;
    if (req.user) {
      const [purchase] = await db.query(
        `SELECT id FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.user_id = $1 AND oi.project_id = $2 AND o.status = 'completed'`,
        [req.user.id, project.id]
      );
      hasPurchased = purchase.length > 0;
    }

    await db.query('UPDATE projects SET view_count = view_count + 1 WHERE id = $1', [project.id]);

    if (!hasPurchased) {
      delete project.project_file_path;
    }

    res.json({ success: true, data: { ...project, reviews, hasPurchased } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects
 */
async function create(req, res, next) {
  try {
    const db = getPool();
    const {
      title, description, category_id, vendor, price,
      topology_type, difficulty = 'intermediate', tags = [],
    } = req.body;

    const previewImagePath = req.files?.preview_image?.[0]?.filename || null;
    const projectFilePath  = req.files?.project_file?.[0]?.filename  || null;

    const [result] = await db.query(
      `INSERT INTO projects
         (title, description, category_id, seller_id, vendor, price,
          topology_type, difficulty, preview_image_path, project_file_path, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
       RETURNING id`,
      [title, description, category_id, req.user.id, vendor,
       parseFloat(price), topology_type, difficulty,
       previewImagePath, projectFilePath]
    );

    const projectId = result[0].id;

    if (tags.length) {
      for (const tag of tags) {
        await db.query(
          'INSERT INTO project_tags (project_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [projectId, tag.trim()]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { id: projectId },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/projects/:id
 */
async function update(req, res, next) {
  try {
    const db = getPool();
    const projectId = parseInt(req.params.id, 10);

    const [rows] = await db.query(
      'SELECT seller_id FROM projects WHERE id = $1 AND is_deleted = FALSE',
      [projectId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'admin' && rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this project' });
    }

    const fields = {};
    const allowed = ['title','description','category_id','vendor','price','topology_type','difficulty'];
    allowed.forEach((key) => { if (req.body[key] !== undefined) fields[key] = req.body[key]; });

    if (req.files?.preview_image?.[0]) fields.preview_image_path = req.files.preview_image[0].filename;
    if (req.files?.project_file?.[0])  fields.project_file_path  = req.files.project_file[0].filename;

    if (!Object.keys(fields).length) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const keys   = Object.keys(fields);
    const values = Object.values(fields);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    await db.query(
      `UPDATE projects SET ${setClauses}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
      [...values, projectId]
    );

    res.json({ success: true, message: 'Project updated successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/projects/:id
 */
async function remove(req, res, next) {
  try {
    const db = getPool();
    const projectId = parseInt(req.params.id, 10);

    const [rows] = await db.query(
      'SELECT seller_id FROM projects WHERE id = $1 AND is_deleted = FALSE',
      [projectId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'admin' && rows[0].seller_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this project' });
    }

    await db.query('UPDATE projects SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1', [projectId]);

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects/:id/reviews
 */
async function addReview(req, res, next) {
  try {
    const db = getPool();
    const projectId = parseInt(req.params.id, 10);
    const { rating, comment } = req.body;

    const [purchase] = await db.query(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.project_id = $2 AND o.status = 'completed'`,
      [req.user.id, projectId]
    );

    if (!purchase.length) {
      return res.status(403).json({
        success: false,
        message: 'You must purchase this project before leaving a review',
      });
    }

    const [existing] = await db.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND project_id = $2',
      [req.user.id, projectId]
    );

    if (existing.length) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this project' });
    }

    await db.query(
      'INSERT INTO reviews (user_id, project_id, rating, comment) VALUES ($1, $2, $3, $4)',
      [req.user.id, projectId, rating, comment || null]
    );

    await db.query(
      `UPDATE projects
       SET avg_rating   = (SELECT AVG(rating) FROM reviews WHERE project_id = $1),
           review_count = (SELECT COUNT(*) FROM reviews WHERE project_id = $1)
       WHERE id = $1`,
      [projectId]
    );

    res.status(201).json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getCategories, getFilterMeta, search, getOne, create, update, remove, addReview };
