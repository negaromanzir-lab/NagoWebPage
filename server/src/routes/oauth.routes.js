/**
 * oauth.routes.js
 *
 * GET /api/auth/google          → redirect to Google
 * GET /api/auth/google/callback → Google redirects back here
 * GET /api/auth/github          → redirect to GitHub
 * GET /api/auth/github/callback → GitHub redirects back here
 */

const router   = require('express').Router();
const passport = require('../config/passport');
const { handleOAuthCallback } = require('../controllers/oauth.controller');

// ── Google ─────────────────────────────────────────────────────────────────────

router.get(
  '/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_failed' }),
  handleOAuthCallback
);

// ── GitHub ─────────────────────────────────────────────────────────────────────

router.get(
  '/github',
  passport.authenticate('github', { session: false, scope: ['user:email'] })
);

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login?error=github_failed' }),
  handleOAuthCallback
);

module.exports = router;
