-- ================================================================
--  NagoWebPage — PostgreSQL Incremental Migration Script
--  Run AFTER neon_postgres_schema.sql has been applied.
--  Each block is idempotent (safe to re-run).
-- ================================================================

-- ── Migration 001 — Add stripe_customer_id to users ──────────────
-- (Already in neon_postgres_schema.sql — reference only)
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(64);

-- ── Migration 002 — Add short_description to projects ────────────
-- (Already in neon_postgres_schema.sql — reference only)
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS short_description VARCHAR(500);

-- ── Migration 003 — Add project_files table ───────────────────────
-- (Already in neon_postgres_schema.sql — reference only)

-- ── Migration 004 — Add published_at to projects ─────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- ── Migration 005 — Add payment_method columns to orders ─────────
-- (Already in neon_postgres_schema.sql — reference only)

-- ── Migration 006 — Add notification_preferences table ────────────
-- (Already in neon_postgres_schema.sql — reference only)

-- ── Seed default notification preferences for existing users ──────
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ── Template for future migrations ───────────────────────────────
-- ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <col> <type>;

SELECT 'Migrations applied successfully' AS status;
