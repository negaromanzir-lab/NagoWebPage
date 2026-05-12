-- ================================================================
--  NagoWebPage — Notification Preferences Migration
--  Adds email notification preferences per user.
--  Run AFTER schema.sql and manual_payments_migration.sql.
-- ================================================================

USE nagoweb;

-- ── 1. notification_preferences table ────────────────────────────────────────
--  Stores per-user email notification opt-in/out settings.

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id                 INT UNSIGNED    NOT NULL,

  -- Email notification toggles
  email_order_confirmed   TINYINT(1)      NOT NULL DEFAULT 1
                          COMMENT 'Order confirmation after successful payment',
  email_payment_approved  TINYINT(1)      NOT NULL DEFAULT 1
                          COMMENT 'Manual payment approved by admin',
  email_payment_rejected  TINYINT(1)      NOT NULL DEFAULT 1
                          COMMENT 'Manual payment rejected by admin',
  email_payment_received  TINYINT(1)      NOT NULL DEFAULT 1
                          COMMENT 'Payment proof received confirmation',
  email_download_ready    TINYINT(1)      NOT NULL DEFAULT 1
                          COMMENT 'Download link generated',
  email_password_changed  TINYINT(1)      NOT NULL DEFAULT 1
                          COMMENT 'Security alert: password changed',
  email_account_status    TINYINT(1)      NOT NULL DEFAULT 1
                          COMMENT 'Account activated/deactivated by admin',
  email_project_published TINYINT(1)      NOT NULL DEFAULT 1
                          COMMENT 'Seller: project published by admin',
  email_marketing         TINYINT(1)      NOT NULL DEFAULT 0
                          COMMENT 'Marketing and promotional emails',

  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                          ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_user (user_id),
  CONSTRAINT fk_np_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-user email notification preferences';

-- ── 2. Seed default preferences for existing users ────────────────────────────

INSERT IGNORE INTO notification_preferences (user_id)
SELECT id FROM users;

-- ── 3. Add project_tags index for tag filtering performance ───────────────────

ALTER TABLE project_tags
  ADD INDEX IF NOT EXISTS idx_tag (tag);

-- ── 4. Add published_at column to projects if missing ────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS published_at DATETIME
    COMMENT 'When the project was first published'
    AFTER is_deleted;
