-- ================================================================
--  NagoWebPage — Notification Preferences Migration (PostgreSQL / Neon)
--  Adds per-user email notification opt-in/out settings.
--  Run AFTER neon_manual_payments_migration.sql
--  Each statement is idempotent (safe to re-run).
-- ================================================================

-- ── 1. notification_preferences table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Email notification toggles
  email_order_confirmed   BOOLEAN         NOT NULL DEFAULT TRUE,
  email_payment_approved  BOOLEAN         NOT NULL DEFAULT TRUE,
  email_payment_rejected  BOOLEAN         NOT NULL DEFAULT TRUE,
  email_payment_received  BOOLEAN         NOT NULL DEFAULT TRUE,
  email_download_ready    BOOLEAN         NOT NULL DEFAULT TRUE,
  email_password_changed  BOOLEAN         NOT NULL DEFAULT TRUE,
  email_account_status    BOOLEAN         NOT NULL DEFAULT TRUE,
  email_project_published BOOLEAN         NOT NULL DEFAULT TRUE,
  email_marketing         BOOLEAN         NOT NULL DEFAULT FALSE,

  created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_np_updated_at ON notification_preferences;
CREATE TRIGGER trg_np_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. Seed default preferences for existing users ────────────────────────────

INSERT INTO notification_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ── 3. Add index on project_tags.tag if missing ───────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ptag_tag ON project_tags(tag);

-- ── 4. Add published_at column to projects if missing ────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

SELECT 'Notifications migration applied successfully' AS status;
