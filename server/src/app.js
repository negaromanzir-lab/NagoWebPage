require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectDB } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const passport = require('./config/passport');

// ── Route imports ──────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth.routes');
const oauthRoutes     = require('./routes/oauth.routes');
const projectsRoutes  = require('./routes/projects.routes');
const coursesRoutes   = require('./routes/courses.routes');
const booksRoutes     = require('./routes/books.routes');
const paymentsRoutes  = require('./routes/payments.routes');
const downloadsRoutes = require('./routes/downloads.routes');
const usersRoutes     = require('./routes/users.routes');
const adminRoutes     = require('./routes/admin.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security headers ───────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ── CORS ───────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      // Strip trailing slash from incoming origin before comparing
      const clean = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(clean)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Passport (OAuth — stateless, no sessions needed) ──────────────────────────
app.use(passport.initialize());

// ── Stripe webhook — raw body BEFORE express.json() ───────────────────────────
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

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
    windowMs:        15 * 60 * 1000,
    max:             300,
    standardHeaders: true,
    legacyHeaders:   false,
    message:         { success: false, message: 'Too many requests, please slow down' },
  })
);

// ── Static file serving ────────────────────────────────────────────────────────
const UPLOAD_BASE = path.resolve(process.env.UPLOAD_DIR || 'uploads');

// User avatars — public
app.use('/uploads/avatars',
  express.static(path.join(UPLOAD_BASE, 'avatars')));

// Course images — public
app.use('/uploads/courses',
  express.static(path.join(UPLOAD_BASE, 'courses')));

// Project preview thumbnails — public
app.use('/uploads/projects/previews',
  express.static(path.join(UPLOAD_BASE, 'projects', 'previews')));

// Topology diagrams — public
app.use('/uploads/projects/diagrams',
  express.static(path.join(UPLOAD_BASE, 'projects', 'diagrams')));

// ── Root ───────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'NagoWeb API is running',
    version: '1.0.0',
    docs:    '/health',
  });
});

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success:     true,
    status:      'ok',
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

// Static — books covers (public)
app.use('/uploads/books/covers',
  express.static(path.join(UPLOAD_BASE, 'books', 'covers')));

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/auth',      oauthRoutes);
app.use('/api/projects',  projectsRoutes);
app.use('/api/courses',   coursesRoutes);
app.use('/api/books',     booksRoutes);
app.use('/api/payments',  paymentsRoutes);
app.use('/api/downloads', downloadsRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/admin',     adminRoutes);

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

module.exports = app;
