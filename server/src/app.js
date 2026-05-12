require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectDB } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ── Route imports ──────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const projectsRoutes = require('./routes/projects.routes');
const paymentsRoutes = require('./routes/payments.routes');
const downloadsRoutes = require('./routes/downloads.routes');
const usersRoutes = require('./routes/users.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security headers ───────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving uploads
  })
);

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Stripe webhook MUST use raw body — register BEFORE express.json() ──────────
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' })
);

// ── Body parsers ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request logging ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Global rate limiter ────────────────────────────────────────────────────────
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please slow down' },
  })
);

// ── Static file serving (uploaded files) ──────────────────────────────────────
const UPLOAD_BASE = path.resolve(process.env.UPLOAD_DIR || 'uploads');

// User avatars — public
app.use('/uploads/avatars',
  express.static(path.join(UPLOAD_BASE, 'avatars')));

// Project preview thumbnails — public
app.use('/uploads/projects/previews',
  express.static(path.join(UPLOAD_BASE, 'projects', 'previews')));

// Topology diagrams — public (visual assets, not the downloadable project)
app.use('/uploads/projects/diagrams',
  express.static(path.join(UPLOAD_BASE, 'projects', 'diagrams')));

// ⚠️  Source files, documentation, and other project files are NOT served
//     statically — they are only accessible via the authenticated
//     /api/downloads route which verifies purchase ownership.
//
// ⚠️  Payment proof screenshots are NOT served statically — they are only
//     accessible via the authenticated /api/admin/manual-payments/:id/screenshot
//     route which verifies admin role.

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/downloads', downloadsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);

// ── 404 & error handlers ───────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start server ───────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀  Server running on http://localhost:${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    console.error('❌  Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

module.exports = app; // exported for testing
