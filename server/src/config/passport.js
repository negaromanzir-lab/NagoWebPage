/**
 * passport.js — OAuth strategy configuration
 * Uses JWT-style stateless flow (no sessions):
 *   1. User clicks "Continue with Google/GitHub"
 *   2. Browser redirects to provider
 *   3. Provider redirects back to /api/auth/google/callback
 *   4. We find or create the user, issue JWT tokens
 *   5. Redirect to frontend with tokens in query params
 *   6. Frontend reads tokens from URL, stores them, clears URL
 */

const passport        = require('passport');
const GoogleStrategy  = require('passport-google-oauth20').Strategy;
const GitHubStrategy  = require('passport-github2').Strategy;
const { getPool }     = require('./db');
const { v4: uuidv4 }  = require('uuid');

// ── Helper: find or create user from OAuth profile ────────────────────────────

async function findOrCreateOAuthUser({ provider, providerId, email, name, avatarUrl }) {
  const db        = getPool();
  const idColumn  = `${provider}_id`; // 'google_id' or 'github_id'

  // 1. Try to find by provider ID
  const [byProvider] = await db.query(
    `SELECT id, name, email, role, is_active FROM users WHERE ${idColumn} = $1`,
    [providerId]
  );
  if (byProvider.length) {
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [byProvider[0].id]);
    return byProvider[0];
  }

  // 2. Try to find by email (link accounts)
  if (email) {
    const [byEmail] = await db.query(
      'SELECT id, name, email, role, is_active FROM users WHERE email = $1',
      [email]
    );
    if (byEmail.length) {
      // Link the OAuth provider to the existing account and ensure active
      await db.query(
        `UPDATE users SET ${idColumn} = $1, auth_provider = $2,
         avatar_url = COALESCE(avatar_url, $3),
         is_active = TRUE, last_login_at = NOW()
         WHERE id = $4`,
        [providerId, provider, avatarUrl, byEmail[0].id]
      );
      return { ...byEmail[0], is_active: true };
    }
  }

  // 3. Create new user
  const [result] = await db.query(
    `INSERT INTO users
       (name, email, password_hash, role, ${idColumn}, auth_provider,
        avatar_url, is_active, is_email_verified, email_verified_at)
     VALUES ($1, $2, NULL, 'buyer', $3, $4, $5, TRUE, TRUE, NOW())
     RETURNING id, name, email, role, is_active`,
    [
      name  || `User_${providerId.slice(0, 8)}`,
      email || null,
      providerId,
      provider,
      avatarUrl || null,
    ]
  );

  return result[0];
}

// ── Google Strategy ────────────────────────────────────────────────────────────

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    scope:        ['profile', 'email'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateOAuthUser({
        provider:   'google',
        providerId: profile.id,
        email:      profile.emails?.[0]?.value,
        name:       profile.displayName,
        avatarUrl:  profile.photos?.[0]?.value,
      });
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// ── GitHub Strategy ────────────────────────────────────────────────────────────

passport.use(new GitHubStrategy(
  {
    clientID:     process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL:  `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/github/callback`,
    scope:        ['user:email'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || null;
      const user  = await findOrCreateOAuthUser({
        provider:   'github',
        providerId: String(profile.id),
        email,
        name:       profile.displayName || profile.username,
        avatarUrl:  profile.photos?.[0]?.value,
      });
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

module.exports = passport;
