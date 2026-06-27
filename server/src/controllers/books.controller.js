const path = require('path');
const fs   = require('fs');
const { getPool } = require('../config/db');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const BOOKS_DIR  = path.join(UPLOAD_DIR, 'books');
const COVERS_DIR = path.join(BOOKS_DIR, 'covers');
const PDFS_DIR   = path.join(BOOKS_DIR, 'pdfs');

[BOOKS_DIR, COVERS_DIR, PDFS_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function safeUnlink(absPath) {
  try { if (absPath && fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch { /* ignore */ }
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

async function uniqueSlug(db, base) {
  let slug = base, i = 1;
  while (true) {
    const [rows] = await db.query('SELECT id FROM books WHERE slug = $1', [slug]);
    if (!rows.length) return slug;
    slug = `${base}-${i++}`;
  }
}

// ── GET /api/books ─────────────────────────────────────────────────────────────

async function list(req, res, next) {
  try {
    const db     = getPool();
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '12', 10)));
    const offset = (page - 1) * limit;
    const { q, category, author, is_free, is_featured, sort = 'newest' } = req.query;

    const conditions = ['b.is_deleted = FALSE', 'b.is_published = TRUE'];
    const params = [];
    let pi = 1;

    if (q) {
      conditions.push(`(b.title ILIKE $${pi} OR b.author ILIKE $${pi} OR b.description ILIKE $${pi})`);
      params.push(`%${q.trim()}%`); pi++;
    }
    if (category)   { conditions.push(`c.slug = $${pi++}`);    params.push(category); }
    if (author)     { conditions.push(`b.author ILIKE $${pi++}`); params.push(`%${author}%`); }
    if (is_free === '1' || is_free === 'true') conditions.push('b.is_free = TRUE');
    if (is_featured === '1' || is_featured === 'true') conditions.push('b.is_featured = TRUE');

    const orderMap = {
      newest:     'b.created_at DESC',
      oldest:     'b.created_at ASC',
      popular:    'b.download_count DESC',
      rating:     'b.rating DESC',
      title_asc:  'b.title ASC',
      price_asc:  'b.price ASC',
      price_desc: 'b.price DESC',
    };
    const orderBy = orderMap[sort] || 'b.created_at DESC';
    const where   = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await db.query(
      `SELECT b.id, b.title, b.slug, b.author, b.publisher, b.short_description,
              b.cover_image_path, b.price, b.is_free, b.is_featured,
              b.download_count, b.rating, b.review_count,
              b.edition, b.published_year, b.pages, b.language,
              b.file_size_bytes, b.created_at,
              c.name AS category, c.slug AS category_slug,
              u.name AS uploaded_by_name
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN users u      ON b.uploaded_by  = u.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${pi++} OFFSET $${pi++}`,
      [...params, limit, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(b.id) AS total FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       ${where}`,
      params
    );

    const total = parseInt(countRows[0].total, 10);
    res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

// ── GET /api/books/featured ────────────────────────────────────────────────────

async function featured(req, res, next) {
  try {
    const db    = getPool();
    const limit = Math.min(12, parseInt(req.query.limit || '6', 10));
    const [rows] = await db.query(
      `SELECT b.id, b.title, b.slug, b.author, b.short_description,
              b.cover_image_path, b.price, b.is_free,
              b.download_count, b.rating, b.pages, b.language,
              c.name AS category
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.is_deleted = FALSE AND b.is_published = TRUE AND b.is_featured = TRUE
       ORDER BY b.download_count DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

// ── GET /api/books/:id ─────────────────────────────────────────────────────────

async function getOne(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      `SELECT b.*, c.name AS category, c.slug AS category_slug, u.name AS uploaded_by_name
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN users u      ON b.uploaded_by  = u.id
       WHERE b.id = $1 AND b.is_deleted = FALSE`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Book not found' });

    const book = rows[0];
    delete book.pdf_file_path;

    const [tags] = await db.query('SELECT tag FROM book_tags WHERE book_id = $1', [book.id]);
    book.tags = tags.map((t) => t.tag);

    const [reviews] = await db.query(
      `SELECT br.id, br.rating, br.comment, br.created_at, u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
       FROM book_reviews br JOIN users u ON br.user_id = u.id
       WHERE br.book_id = $1 ORDER BY br.created_at DESC LIMIT 20`,
      [book.id]
    );
    book.reviews = reviews;

    await db.query('UPDATE books SET view_count = view_count + 1 WHERE id = $1', [book.id]);

    res.json({ success: true, data: book });
  } catch (err) { next(err); }
}

// ── GET /api/books/:id/download ────────────────────────────────────────────────

async function download(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query(
      'SELECT id, title, pdf_file_path, is_free, price, is_published, is_deleted FROM books WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length || rows[0].is_deleted) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    const book = rows[0];

    if (!book.is_published) return res.status(403).json({ success: false, message: 'Book is not available' });
    if (!book.pdf_file_path) return res.status(404).json({ success: false, message: 'PDF file not available yet' });

    const absPath = path.join(UPLOAD_DIR, book.pdf_file_path);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    await db.query('UPDATE books SET download_count = download_count + 1 WHERE id = $1', [book.id]);
    await db.query(
      'INSERT INTO book_download_logs (book_id, user_id, ip_address) VALUES ($1, $2, $3)',
      [book.id, req.user?.id || null, req.ip]
    );

    const safeName = book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    fs.createReadStream(absPath).pipe(res);
  } catch (err) { next(err); }
}

// ── POST /api/books/:id/reviews ────────────────────────────────────────────────

async function addReview(req, res, next) {
  try {
    const db = getPool();
    const { rating, comment } = req.body;
    const bookId = parseInt(req.params.id, 10);

    const [existing] = await db.query(
      'SELECT id FROM book_reviews WHERE book_id = $1 AND user_id = $2',
      [bookId, req.user.id]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this book' });
    }

    await db.query(
      'INSERT INTO book_reviews (book_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)',
      [bookId, req.user.id, rating, comment || null]
    );

    res.status(201).json({ success: true, message: 'Review submitted' });
  } catch (err) { next(err); }
}

// ── POST /api/books  (admin) ───────────────────────────────────────────────────

async function create(req, res, next) {
  const coverFile = req.files?.cover?.[0];
  const pdfFile   = req.files?.pdf?.[0];

  try {
    if (!pdfFile) {
      if (coverFile) safeUnlink(coverFile.path);
      return res.status(400).json({ success: false, message: 'PDF file is required' });
    }

    const db = getPool();
    const {
      title, author, publisher, description, short_description,
      edition, published_year, isbn, pages, language = 'English',
      category_id, price = '0', is_free = '1', tags = '',
    } = req.body;

    if (!title || !author) {
      safeUnlink(coverFile?.path);
      safeUnlink(pdfFile.path);
      return res.status(422).json({ success: false, message: 'Title and author are required' });
    }

    const slug      = await uniqueSlug(db, slugify(title));
    const coverPath = coverFile ? `books/covers/${coverFile.filename}` : null;
    const pdfPath   = `books/pdfs/${pdfFile.filename}`;
    const isFree    = is_free === '1' || is_free === 'true' || parseFloat(price) === 0;

    const [result] = await db.query(
      `INSERT INTO books
         (uploaded_by, category_id, title, slug, author, publisher,
          description, short_description, edition, published_year, isbn,
          pages, language, cover_image_path, pdf_file_path, file_size_bytes,
          price, is_free, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,TRUE)
       RETURNING id, slug`,
      [
        req.user.id, category_id || null,
        title.trim(), slug, author.trim(),
        publisher?.trim() || null,
        description?.trim() || null,
        short_description?.trim() || null,
        edition?.trim() || null,
        published_year || null,
        isbn?.trim() || null,
        pages ? parseInt(pages, 10) : null,
        language, coverPath, pdfPath, pdfFile.size,
        parseFloat(price) || 0,
        isFree,
      ]
    );

    const bookId = result[0].id;
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    for (const t of tagList) {
      await db.query(
        'INSERT INTO book_tags (book_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [bookId, t]
      );
    }

    res.status(201).json({ success: true, message: 'Book uploaded successfully', data: { id: bookId, slug } });
  } catch (err) {
    safeUnlink(req.files?.cover?.[0]?.path);
    safeUnlink(req.files?.pdf?.[0]?.path);
    next(err);
  }
}

// ── PUT /api/books/:id  (admin) ───────────────────────────────────────────────

async function update(req, res, next) {
  try {
    const db     = getPool();
    const bookId = parseInt(req.params.id, 10);

    const [rows] = await db.query(
      'SELECT id, cover_image_path, pdf_file_path FROM books WHERE id = $1 AND is_deleted = FALSE',
      [bookId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Book not found' });

    const fields = {};
    const allowed = ['title','author','publisher','description','short_description','edition','published_year','isbn','pages','language','category_id','price'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) fields[k] = req.body[k]; });

    if (req.body.is_free      !== undefined) fields.is_free      = req.body.is_free      === '1' || req.body.is_free      === 'true';
    if (req.body.is_published !== undefined) fields.is_published = req.body.is_published === '1' || req.body.is_published === 'true';
    if (req.body.is_featured  !== undefined) fields.is_featured  = req.body.is_featured  === '1' || req.body.is_featured  === 'true';

    if (req.files?.cover?.[0]) {
      safeUnlink(path.join(UPLOAD_DIR, rows[0].cover_image_path || ''));
      fields.cover_image_path = `books/covers/${req.files.cover[0].filename}`;
    }
    if (req.files?.pdf?.[0]) {
      safeUnlink(path.join(UPLOAD_DIR, rows[0].pdf_file_path || ''));
      fields.pdf_file_path   = `books/pdfs/${req.files.pdf[0].filename}`;
      fields.file_size_bytes = req.files.pdf[0].size;
    }

    if (Object.keys(fields).length) {
      const keys   = Object.keys(fields);
      const values = Object.values(fields);
      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      await db.query(
        `UPDATE books SET ${setClauses}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
        [...values, bookId]
      );
    }

    if (req.body.tags !== undefined) {
      await db.query('DELETE FROM book_tags WHERE book_id = $1', [bookId]);
      const tagList = req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);
      for (const t of tagList) {
        await db.query(
          'INSERT INTO book_tags (book_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [bookId, t]
        );
      }
    }

    res.json({ success: true, message: 'Book updated' });
  } catch (err) { next(err); }
}

// ── DELETE /api/books/:id ─────────────────────────────────────────────────────

async function remove(req, res, next) {
  try {
    const db = getPool();
    await db.query('UPDATE books SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Book deleted' });
  } catch (err) { next(err); }
}

// ── PATCH /api/books/:id/publish ─────────────────────────────────────────────

async function togglePublish(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT is_published FROM books WHERE id = $1 AND is_deleted = FALSE', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Book not found' });
    const newVal = !rows[0].is_published;
    await db.query('UPDATE books SET is_published = $1 WHERE id = $2', [newVal, req.params.id]);
    res.json({ success: true, data: { is_published: newVal } });
  } catch (err) { next(err); }
}

// ── PATCH /api/books/:id/feature ─────────────────────────────────────────────

async function toggleFeature(req, res, next) {
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT is_featured FROM books WHERE id = $1 AND is_deleted = FALSE', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Book not found' });
    const newVal = !rows[0].is_featured;
    await db.query('UPDATE books SET is_featured = $1 WHERE id = $2', [newVal, req.params.id]);
    res.json({ success: true, data: { is_featured: newVal } });
  } catch (err) { next(err); }
}

module.exports = { list, featured, getOne, download, addReview, create, update, remove, togglePublish, toggleFeature };
