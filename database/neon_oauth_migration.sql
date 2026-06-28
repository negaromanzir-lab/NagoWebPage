-- ================================================================
--  NagoWebPage — OAuth Migration (PostgreSQL / Neon)
--  Adds Google and GitHub OAuth support to the users table.
--  Run in Neon SQL Editor BEFORE deploying the OAuth backend.
-- ================================================================

-- Make password_hash nullable (OAuth users have no password)
ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

-- Add OAuth provider ID columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id  VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS github_id  VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'local'
    CHECK (auth_provider IN ('local', 'google', 'github'));

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

SELECT 'OAuth migration applied successfully' AS status;
