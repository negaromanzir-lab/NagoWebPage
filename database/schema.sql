-- ================================================================
--  NagoWebPage — Complete MySQL Database Schema
--  Engine : InnoDB | Charset : utf8mb4 | Collation : unicode_ci
--
--  Tables
--  ──────
--  01. users               — accounts (buyer / seller / admin)
--  02. refresh_tokens      — JWT refresh token store
--  03. password_resets     — one-time password-reset tokens
--  04. categories          — project taxonomy
--  05. projects            — network design listings
--  06. project_tags        — many-to-many tag labels
--  07. project_files       — versioned file attachments per project
--  08. reviews             — buyer ratings & comments
--  09. orders              — payment sessions (Stripe)
--  10. order_items         — line items inside an order
--  11. payments            — payment event ledger
--  12. download_keys       — one-time / time-limited secure download tokens
--  13. download_logs       — audit trail of every file download
--  14. wishlists           — saved projects per user
--  15. coupons             — discount codes
--  16. coupon_usages       — tracks which user used which coupon
--  17. seller_payouts      — seller earnings & payout records
--  18. audit_logs          — admin-level change history
--
--  Views, Stored Procedures & Seed Data follow the table definitions.
-- ================================================================

-- ── Safety guards ──────────────────────────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ── Database ───────────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS nagoweb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nagoweb;

-- ================================================================
--  01. USERS
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
  id                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name              VARCHAR(100)    NOT NULL,
  email             VARCHAR(255)    NOT NULL,
  password_hash     VARCHAR(255)    NOT NULL,
  role              ENUM('buyer','seller','admin') NOT NULL DEFAULT 'buyer',

  -- Profile
  bio               TEXT,
  website           VARCHAR(500),
  avatar_url        VARCHAR(500),
  phone             VARCHAR(30),
  country           CHAR(2)         COMMENT 'ISO 3166-1 alpha-2',
  timezone          VARCHAR(64)     DEFAULT 'UTC',

  -- Stripe customer
  stripe_customer_id VARCHAR(64),

  -- Account state
  is_active         TINYINT(1)      NOT NULL DEFAULT 1,
  is_email_verified TINYINT(1)      NOT NULL DEFAULT 0,
  email_verified_at DATETIME,

  -- Seller-specific
  seller_balance    DECIMAL(12,2)   NOT NULL DEFAULT 0.00
                    COMMENT 'Pending earnings not yet paid out',
  total_earned      DECIMAL(12,2)   NOT NULL DEFAULT 0.00
                    COMMENT 'Lifetime gross earnings',

  -- Timestamps
  last_login_at     DATETIME,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_email            (email),
  INDEX   idx_role                (role),
  INDEX   idx_stripe_customer     (stripe_customer_id),
  INDEX   idx_active              (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Platform user accounts';

-- ================================================================
--  02. REFRESH TOKENS
-- ================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          CHAR(36)        NOT NULL  COMMENT 'UUID v4',
  user_id     INT UNSIGNED    NOT NULL,
  token       TEXT            NOT NULL  COMMENT 'Signed JWT refresh token',
  user_agent  VARCHAR(512)    COMMENT 'Browser / client that issued the token',
  ip_address  VARCHAR(45),
  expires_at  DATETIME        NOT NULL,
  revoked_at  DATETIME        COMMENT 'NULL = still valid',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_user_id   (user_id),
  INDEX idx_expires   (expires_at),
  CONSTRAINT fk_rt_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='JWT refresh token store — one row per active session';

-- ================================================================
--  03. PASSWORD RESETS
-- ================================================================
CREATE TABLE IF NOT EXISTS password_resets (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED    NOT NULL,
  token_hash  VARCHAR(255)    NOT NULL  COMMENT 'SHA-256 of the raw token sent by email',
  expires_at  DATETIME        NOT NULL,
  used_at     DATETIME        COMMENT 'NULL = not yet consumed',
  ip_address  VARCHAR(45),
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_user_id   (user_id),
  INDEX idx_token     (token_hash),
  CONSTRAINT fk_pr_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='One-time password-reset tokens';

-- ================================================================
--  04. CATEGORIES
-- ================================================================
CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)    NOT NULL,
  slug        VARCHAR(100)    NOT NULL,
  description TEXT,
  icon        VARCHAR(100)    COMMENT 'Icon identifier (e.g. lucide icon name)',
  color       VARCHAR(50)     COMMENT 'Tailwind color name or hex',
  sort_order  SMALLINT        NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_slug      (slug),
  INDEX  idx_sort_order   (sort_order),
  INDEX  idx_active       (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Project taxonomy / browse categories';

-- ================================================================
--  05. PROJECTS
-- ================================================================
CREATE TABLE IF NOT EXISTS projects (
  id                    INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  seller_id             INT UNSIGNED    NOT NULL,
  category_id           INT UNSIGNED    NOT NULL,

  -- Identity
  title                 VARCHAR(200)    NOT NULL,
  slug                  VARCHAR(220)    NOT NULL  COMMENT 'URL-safe unique identifier',
  description           TEXT            NOT NULL,
  short_description     VARCHAR(500)    COMMENT 'Used in listing cards',

  -- Technical metadata
  vendor                VARCHAR(100)    NOT NULL  COMMENT 'e.g. Cisco, Juniper, AWS',
  topology_type         ENUM(
                          'star','mesh','ring','hierarchical',
                          'bus','hybrid','cloud','sdwan'
                        ) NOT NULL,
  difficulty            ENUM('beginner','intermediate','advanced')
                        NOT NULL DEFAULT 'intermediate',
  software_version      VARCHAR(100)    COMMENT 'e.g. IOS 15.7, GNS3 2.2',
  device_count          SMALLINT UNSIGNED COMMENT 'Number of devices in the topology',
  lab_duration_hours    DECIMAL(4,1)    COMMENT 'Estimated completion time',

  -- Files
  preview_image_path    VARCHAR(500),
  project_file_path     VARCHAR(500)    COMMENT 'Primary downloadable file (legacy)',

  -- Pricing
  price                 DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  original_price        DECIMAL(10,2)   COMMENT 'Pre-discount price for display',
  currency              CHAR(3)         NOT NULL DEFAULT 'USD',

  -- Metrics (denormalised for fast reads)
  avg_rating            DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
  review_count          INT UNSIGNED    NOT NULL DEFAULT 0,
  download_count        INT UNSIGNED    NOT NULL DEFAULT 0,
  view_count            INT UNSIGNED    NOT NULL DEFAULT 0,
  wishlist_count        INT UNSIGNED    NOT NULL DEFAULT 0,

  -- State flags
  is_published          TINYINT(1)      NOT NULL DEFAULT 0,
  is_featured           TINYINT(1)      NOT NULL DEFAULT 0,
  is_deleted            TINYINT(1)      NOT NULL DEFAULT 0,

  -- SEO
  meta_title            VARCHAR(200),
  meta_description      VARCHAR(500),

  -- Timestamps
  published_at          DATETIME,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_slug         (slug),
  INDEX   idx_seller          (seller_id),
  INDEX   idx_category        (category_id),
  INDEX   idx_price           (price),
  INDEX   idx_rating          (avg_rating),
  INDEX   idx_published       (is_published, is_deleted),
  INDEX   idx_featured        (is_featured, is_published),
  INDEX   idx_vendor          (vendor),
  INDEX   idx_topology        (topology_type),
  INDEX   idx_difficulty      (difficulty),
  FULLTEXT idx_search         (title, description, vendor, short_description),

  CONSTRAINT fk_proj_seller
    FOREIGN KEY (seller_id)   REFERENCES users(id),
  CONSTRAINT fk_proj_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Network design project listings';

-- ================================================================
--  06. PROJECT TAGS
-- ================================================================
CREATE TABLE IF NOT EXISTS project_tags (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  project_id  INT UNSIGNED    NOT NULL,
  tag         VARCHAR(60)     NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_project_tag (project_id, tag),
  INDEX  idx_tag            (tag),
  CONSTRAINT fk_tag_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Searchable tags attached to projects';

-- ================================================================
--  07. PROJECT FILES
--      Versioned file attachments — replaces the single
--      project_file_path column for multi-file projects.
-- ================================================================
CREATE TABLE IF NOT EXISTS project_files (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  project_id      INT UNSIGNED    NOT NULL,
  file_name       VARCHAR(255)    NOT NULL  COMMENT 'Original filename shown to buyer',
  stored_name     VARCHAR(255)    NOT NULL  COMMENT 'UUID-based name on disk',
  file_path       VARCHAR(500)    NOT NULL  COMMENT 'Relative path under uploads/',
  mime_type       VARCHAR(127),
  file_size_bytes BIGINT UNSIGNED,
  file_type       ENUM(
                    'source','preview','diagram','documentation','other'
                  ) NOT NULL DEFAULT 'source',
  version         VARCHAR(20)     DEFAULT '1.0',
  is_primary      TINYINT(1)      NOT NULL DEFAULT 0
                  COMMENT '1 = the main downloadable file',
  download_count  INT UNSIGNED    NOT NULL DEFAULT 0,
  uploaded_by     INT UNSIGNED    NOT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_project   (project_id),
  INDEX idx_type      (file_type),
  INDEX idx_primary   (project_id, is_primary),
  CONSTRAINT fk_pf_project
    FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pf_uploader
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Versioned file attachments for each project';

-- ================================================================
--  08. REVIEWS
-- ================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED    NOT NULL,
  project_id  INT UNSIGNED    NOT NULL,
  order_id    CHAR(36)        COMMENT 'Links review to the purchase that enabled it',
  rating      TINYINT UNSIGNED NOT NULL,
  title       VARCHAR(150),
  comment     TEXT,
  is_verified TINYINT(1)      NOT NULL DEFAULT 1
              COMMENT '1 = reviewer confirmed purchaser',
  is_hidden   TINYINT(1)      NOT NULL DEFAULT 0
              COMMENT 'Admin can hide abusive reviews',
  helpful_count INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_user_project  (user_id, project_id),
  INDEX  idx_project          (project_id),
  INDEX  idx_rating           (rating),
  CONSTRAINT chk_rating       CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_rev_user
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_rev_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Buyer ratings and comments on purchased projects';

-- ================================================================
--  09. ORDERS
-- ================================================================
CREATE TABLE IF NOT EXISTS orders (
  id                      CHAR(36)        NOT NULL  COMMENT 'UUID v4 — also used as Stripe metadata',
  user_id                 INT UNSIGNED    NOT NULL,

  -- Stripe references
  stripe_session_id       VARCHAR(255)    COMMENT 'cs_xxx',
  stripe_payment_intent   VARCHAR(255)    COMMENT 'pi_xxx',
  stripe_charge_id        VARCHAR(255)    COMMENT 'ch_xxx',

  -- Coupon applied
  coupon_id               INT UNSIGNED    COMMENT 'FK to coupons',
  coupon_code             VARCHAR(50),
  discount_amount         DECIMAL(10,2)   NOT NULL DEFAULT 0.00,

  -- Amounts (all in USD cents stored as DECIMAL for precision)
  subtotal_amount         DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  total_amount            DECIMAL(10,2)   NOT NULL,
  currency                CHAR(3)         NOT NULL DEFAULT 'USD',

  -- State machine
  status                  ENUM(
                            'pending',    -- checkout session created
                            'completed',  -- payment confirmed
                            'expired',    -- session timed out
                            'refunded',   -- full refund issued
                            'partial_refund' -- partial refund
                          ) NOT NULL DEFAULT 'pending',

  -- Timestamps
  completed_at            DATETIME,
  refunded_at             DATETIME,
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                          ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_user              (user_id),
  INDEX idx_status            (status),
  INDEX idx_stripe_session    (stripe_session_id),
  INDEX idx_stripe_intent     (stripe_payment_intent),
  INDEX idx_created           (created_at),
  CONSTRAINT fk_order_user
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Payment sessions — one order per Stripe Checkout Session';

-- ================================================================
--  10. ORDER ITEMS
-- ================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  order_id            CHAR(36)        NOT NULL,
  project_id          INT UNSIGNED    NOT NULL,
  project_title       VARCHAR(200)    NOT NULL  COMMENT 'Snapshot at time of purchase',
  price_at_purchase   DECIMAL(10,2)   NOT NULL,
  seller_id           INT UNSIGNED    NOT NULL  COMMENT 'Snapshot — seller at purchase time',
  seller_share        DECIMAL(10,2)   NOT NULL DEFAULT 0.00
                      COMMENT 'Amount credited to seller after platform fee',
  platform_fee        DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  refunded_at         DATETIME,

  PRIMARY KEY (id),
  INDEX idx_order     (order_id),
  INDEX idx_project   (project_id),
  INDEX idx_seller    (seller_id),
  CONSTRAINT fk_oi_order
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_oi_project
    FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_oi_seller
    FOREIGN KEY (seller_id)  REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Individual project line items within an order';

-- ================================================================
--  11. PAYMENTS
--      Immutable ledger of every Stripe event that affects money.
-- ================================================================
CREATE TABLE IF NOT EXISTS payments (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  order_id            CHAR(36)        NOT NULL,
  user_id             INT UNSIGNED    NOT NULL,

  -- Stripe identifiers
  stripe_event_id     VARCHAR(255)    NOT NULL UNIQUE
                      COMMENT 'evt_xxx — idempotency key',
  stripe_object_id    VARCHAR(255)    COMMENT 'pi_xxx / ch_xxx / re_xxx',
  event_type          VARCHAR(100)    NOT NULL
                      COMMENT 'e.g. checkout.session.completed',

  -- Money
  amount              DECIMAL(10,2)   NOT NULL,
  currency            CHAR(3)         NOT NULL DEFAULT 'USD',
  direction           ENUM('credit','debit') NOT NULL
                      COMMENT 'credit = money in, debit = refund/chargeback',

  -- Raw payload for debugging
  stripe_payload      JSON,

  processed_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_order         (order_id),
  INDEX idx_user          (user_id),
  INDEX idx_stripe_event  (stripe_event_id),
  INDEX idx_processed     (processed_at),
  CONSTRAINT fk_pay_order
    FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_pay_user
    FOREIGN KEY (user_id)  REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable Stripe event ledger for every payment action';

-- ================================================================
--  12. DOWNLOAD KEYS
--      Secure, time-limited, single-use tokens that authorise
--      a specific user to download a specific project file.
--      Generated on demand after purchase verification.
-- ================================================================
CREATE TABLE IF NOT EXISTS download_keys (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,

  -- The token sent to the client (URL-safe random string, hashed for storage)
  token           CHAR(64)        NOT NULL  COMMENT 'Raw token — shown once, never stored again',
  token_hash      VARCHAR(255)    NOT NULL  COMMENT 'SHA-256(token) — used for lookup',

  -- What this key unlocks
  user_id         INT UNSIGNED    NOT NULL,
  project_id      INT UNSIGNED    NOT NULL,
  order_id        CHAR(36)        NOT NULL,
  file_id         INT UNSIGNED    COMMENT 'NULL = primary file of the project',

  -- Lifecycle
  expires_at      DATETIME        NOT NULL,
  max_uses        TINYINT UNSIGNED NOT NULL DEFAULT 3
                  COMMENT 'How many times this key can be used (0 = unlimited)',
  use_count       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_used_at    DATETIME,
  revoked_at      DATETIME        COMMENT 'Admin or system revocation',

  -- Audit
  ip_address      VARCHAR(45)     COMMENT 'IP that requested the key',
  user_agent      VARCHAR(512),
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_token_hash    (token_hash),
  INDEX  idx_user             (user_id),
  INDEX  idx_project          (project_id),
  INDEX  idx_order            (order_id),
  INDEX  idx_expires          (expires_at),
  CONSTRAINT fk_dk_user
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_dk_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_dk_order
    FOREIGN KEY (order_id)   REFERENCES orders(id),
  CONSTRAINT fk_dk_file
    FOREIGN KEY (file_id)    REFERENCES project_files(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Secure time-limited download tokens issued after purchase verification';

-- ================================================================
--  13. DOWNLOAD LOGS
--      Append-only audit trail of every file download event.
-- ================================================================
CREATE TABLE IF NOT EXISTS download_logs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED    NOT NULL,
  project_id      INT UNSIGNED    NOT NULL,
  file_id         INT UNSIGNED    COMMENT 'Which specific file was downloaded',
  order_id        CHAR(36),
  download_key_id INT UNSIGNED    COMMENT 'Which download_key was consumed',

  -- Network context
  ip_address      VARCHAR(45),
  user_agent      VARCHAR(512),
  country_code    CHAR(2)         COMMENT 'GeoIP resolved country',

  -- Outcome
  status          ENUM('success','failed','expired_key','invalid_key')
                  NOT NULL DEFAULT 'success',
  bytes_sent      BIGINT UNSIGNED COMMENT 'Actual bytes transferred',
  duration_ms     INT UNSIGNED    COMMENT 'Transfer duration in milliseconds',

  downloaded_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_user          (user_id),
  INDEX idx_project       (project_id),
  INDEX idx_order         (order_id),
  INDEX idx_key           (download_key_id),
  INDEX idx_downloaded_at (downloaded_at),
  CONSTRAINT fk_dl_user
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_dl_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_dl_file
    FOREIGN KEY (file_id)    REFERENCES project_files(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Append-only audit trail of every file download event';

-- ================================================================
--  14. WISHLISTS
-- ================================================================
CREATE TABLE IF NOT EXISTS wishlists (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED    NOT NULL,
  project_id  INT UNSIGNED    NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_wishlist      (user_id, project_id),
  INDEX  idx_project          (project_id),
  CONSTRAINT fk_wl_user
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_wl_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='User saved / wishlist projects';

-- ================================================================
--  15. COUPONS
-- ================================================================
CREATE TABLE IF NOT EXISTS coupons (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  code                VARCHAR(50)     NOT NULL,
  description         VARCHAR(255),

  -- Discount definition
  discount_type       ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
  discount_value      DECIMAL(10,2)   NOT NULL
                      COMMENT 'Percentage (0-100) or fixed USD amount',
  max_discount_amount DECIMAL(10,2)   COMMENT 'Cap for percentage discounts',
  min_order_amount    DECIMAL(10,2)   NOT NULL DEFAULT 0.00
                      COMMENT 'Minimum cart value to apply coupon',

  -- Scope
  applies_to          ENUM('all','category','project') NOT NULL DEFAULT 'all',
  applies_to_id       INT UNSIGNED    COMMENT 'category_id or project_id when scoped',

  -- Limits
  max_uses            INT UNSIGNED    COMMENT 'NULL = unlimited',
  max_uses_per_user   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  use_count           INT UNSIGNED    NOT NULL DEFAULT 0,

  -- Validity window
  valid_from          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until         DATETIME,
  is_active           TINYINT(1)      NOT NULL DEFAULT 1,

  created_by          INT UNSIGNED    NOT NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_code      (code),
  INDEX  idx_active       (is_active, valid_from, valid_until),
  CONSTRAINT fk_coupon_creator
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Discount coupon codes';

-- ================================================================
--  16. COUPON USAGES
-- ================================================================
CREATE TABLE IF NOT EXISTS coupon_usages (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  coupon_id   INT UNSIGNED    NOT NULL,
  user_id     INT UNSIGNED    NOT NULL,
  order_id    CHAR(36)        NOT NULL,
  discount_applied DECIMAL(10,2) NOT NULL,
  used_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_coupon_order  (coupon_id, order_id),
  INDEX  idx_user             (user_id),
  CONSTRAINT fk_cu_coupon
    FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  CONSTRAINT fk_cu_user
    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_cu_order
    FOREIGN KEY (order_id)  REFERENCES orders(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tracks which user used which coupon on which order';

-- ================================================================
--  17. SELLER PAYOUTS
-- ================================================================
CREATE TABLE IF NOT EXISTS seller_payouts (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  seller_id           INT UNSIGNED    NOT NULL,

  -- Stripe payout reference
  stripe_transfer_id  VARCHAR(255)    COMMENT 'tr_xxx',
  stripe_payout_id    VARCHAR(255)    COMMENT 'po_xxx',

  amount              DECIMAL(12,2)   NOT NULL,
  currency            CHAR(3)         NOT NULL DEFAULT 'USD',
  platform_fee        DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  net_amount          DECIMAL(12,2)   NOT NULL
                      COMMENT 'amount - platform_fee',

  status              ENUM('pending','processing','paid','failed','cancelled')
                      NOT NULL DEFAULT 'pending',
  period_start        DATE            NOT NULL,
  period_end          DATE            NOT NULL,
  notes               TEXT,

  paid_at             DATETIME,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_seller    (seller_id),
  INDEX idx_status    (status),
  INDEX idx_period    (period_start, period_end),
  CONSTRAINT fk_sp_seller
    FOREIGN KEY (seller_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Seller earnings payout records';

-- ================================================================
--  18. AUDIT LOGS
-- ================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id        INT UNSIGNED    COMMENT 'NULL = system action',
  actor_role      ENUM('buyer','seller','admin','system'),
  action          VARCHAR(100)    NOT NULL
                  COMMENT 'e.g. user.deactivate, project.delete, payout.approve',
  entity_type     VARCHAR(60)     NOT NULL
                  COMMENT 'Table name of the affected record',
  entity_id       VARCHAR(36)     NOT NULL
                  COMMENT 'PK of the affected record (string to support UUID)',
  old_values      JSON            COMMENT 'Snapshot before change',
  new_values      JSON            COMMENT 'Snapshot after change',
  ip_address      VARCHAR(45),
  user_agent      VARCHAR(512),
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_actor         (actor_id),
  INDEX idx_entity        (entity_type, entity_id),
  INDEX idx_action        (action),
  INDEX idx_created       (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Admin-level change history for compliance and debugging';

-- ── Re-enable FK checks ────────────────────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 1;


-- ================================================================
--  VIEWS
-- ================================================================

-- ── v_published_projects ──────────────────────────────────────────
--  Convenience view used by listing and search queries.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_published_projects AS
SELECT
  p.id,
  p.slug,
  p.title,
  p.short_description,
  p.vendor,
  p.topology_type,
  p.difficulty,
  p.price,
  p.original_price,
  p.currency,
  p.avg_rating,
  p.review_count,
  p.download_count,
  p.view_count,
  p.wishlist_count,
  p.preview_image_path,
  p.is_featured,
  p.published_at,
  p.created_at,
  -- Category
  c.id   AS category_id,
  c.name AS category_name,
  c.slug AS category_slug,
  c.icon AS category_icon,
  c.color AS category_color,
  -- Seller
  u.id         AS seller_id,
  u.name       AS seller_name,
  u.avatar_url AS seller_avatar
FROM projects p
JOIN categories c ON p.category_id = c.id
JOIN users      u ON p.seller_id   = u.id
WHERE p.is_published = 1
  AND p.is_deleted   = 0
  AND c.is_active    = 1;

-- ── v_order_summary ───────────────────────────────────────────────
--  Per-order summary with buyer info and item count.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_order_summary AS
SELECT
  o.id            AS order_id,
  o.status,
  o.total_amount,
  o.discount_amount,
  o.currency,
  o.coupon_code,
  o.created_at,
  o.completed_at,
  -- Buyer
  u.id    AS buyer_id,
  u.name  AS buyer_name,
  u.email AS buyer_email,
  -- Aggregates
  COUNT(oi.id)        AS item_count,
  SUM(oi.seller_share) AS total_seller_share,
  SUM(oi.platform_fee) AS total_platform_fee
FROM orders o
JOIN users       u  ON o.user_id  = u.id
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id;

-- ── v_seller_stats ────────────────────────────────────────────────
--  Aggregated stats per seller for the admin dashboard.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_seller_stats AS
SELECT
  u.id            AS seller_id,
  u.name          AS seller_name,
  u.email,
  u.seller_balance,
  u.total_earned,
  u.created_at    AS member_since,
  COUNT(DISTINCT p.id)                                    AS total_projects,
  COUNT(DISTINCT CASE WHEN p.is_published = 1 THEN p.id END) AS published_projects,
  COALESCE(SUM(p.download_count), 0)                      AS total_downloads,
  COALESCE(AVG(p.avg_rating), 0)                          AS avg_project_rating,
  COUNT(DISTINCT oi.order_id)                             AS total_sales
FROM users u
LEFT JOIN projects    p  ON p.seller_id  = u.id AND p.is_deleted = 0
LEFT JOIN order_items oi ON oi.seller_id = u.id
WHERE u.role IN ('seller', 'admin')
GROUP BY u.id;

-- ── v_download_key_status ─────────────────────────────────────────
--  Active (non-expired, non-revoked) download keys.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_download_key_status AS
SELECT
  dk.id,
  dk.token_hash,
  dk.user_id,
  dk.project_id,
  dk.order_id,
  dk.file_id,
  dk.expires_at,
  dk.max_uses,
  dk.use_count,
  dk.last_used_at,
  dk.created_at,
  CASE
    WHEN dk.revoked_at IS NOT NULL        THEN 'revoked'
    WHEN dk.expires_at < NOW()            THEN 'expired'
    WHEN dk.max_uses > 0
     AND dk.use_count >= dk.max_uses      THEN 'exhausted'
    ELSE                                       'active'
  END AS key_status,
  p.title  AS project_title,
  u.email  AS user_email
FROM download_keys dk
JOIN projects p ON dk.project_id = p.id
JOIN users    u ON dk.user_id    = u.id;


-- ================================================================
--  STORED PROCEDURES
-- ================================================================

DELIMITER $$

-- ── sp_issue_download_key ─────────────────────────────────────────
--  Verifies purchase ownership and issues a new download key.
--  Called by the Node.js download controller.
--
--  Parameters:
--    p_user_id    — requesting user
--    p_project_id — project to download
--    p_order_id   — the completed order
--    p_file_id    — specific file (NULL = primary)
--    p_token_hash — SHA-256 of the raw token (computed in app layer)
--    p_ip         — client IP address
--    p_ttl_hours  — key lifetime in hours (default 24)
--    p_max_uses   — max download uses (default 3)
--
--  OUT p_key_id   — inserted download_keys.id (0 = not authorised)
-- ─────────────────────────────────────────────────────────────────
CREATE PROCEDURE IF NOT EXISTS sp_issue_download_key(
  IN  p_user_id     INT UNSIGNED,
  IN  p_project_id  INT UNSIGNED,
  IN  p_order_id    CHAR(36),
  IN  p_file_id     INT UNSIGNED,
  IN  p_token_hash  VARCHAR(255),
  IN  p_ip          VARCHAR(45),
  IN  p_ttl_hours   TINYINT UNSIGNED,
  IN  p_max_uses    TINYINT UNSIGNED,
  OUT p_key_id      INT UNSIGNED
)
BEGIN
  DECLARE v_purchase_exists TINYINT DEFAULT 0;

  -- 1. Confirm the order is completed and belongs to this user
  SELECT COUNT(*) INTO v_purchase_exists
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE o.id         = p_order_id
    AND o.user_id    = p_user_id
    AND oi.project_id = p_project_id
    AND o.status     = 'completed';

  IF v_purchase_exists = 0 THEN
    SET p_key_id = 0;
  ELSE
    -- 2. Insert the key
    INSERT INTO download_keys
      (token, token_hash, user_id, project_id, order_id, file_id,
       expires_at, max_uses, ip_address)
    VALUES
      (p_token_hash, p_token_hash, p_user_id, p_project_id, p_order_id,
       p_file_id,
       DATE_ADD(NOW(), INTERVAL p_ttl_hours HOUR),
       p_max_uses, p_ip);

    SET p_key_id = LAST_INSERT_ID();
  END IF;
END$$

-- ── sp_consume_download_key ───────────────────────────────────────
--  Validates and consumes one use of a download key.
--  Returns the file path if valid, empty string if not.
--
--  OUT p_file_path — relative path to stream, '' = denied
--  OUT p_reason    — human-readable denial reason
-- ─────────────────────────────────────────────────────────────────
CREATE PROCEDURE IF NOT EXISTS sp_consume_download_key(
  IN  p_token_hash  VARCHAR(255),
  IN  p_user_id     INT UNSIGNED,
  IN  p_ip          VARCHAR(45),
  OUT p_file_path   VARCHAR(500),
  OUT p_reason      VARCHAR(100)
)
BEGIN
  DECLARE v_key_id      INT UNSIGNED DEFAULT 0;
  DECLARE v_project_id  INT UNSIGNED;
  DECLARE v_file_id     INT UNSIGNED;
  DECLARE v_expires_at  DATETIME;
  DECLARE v_max_uses    TINYINT UNSIGNED;
  DECLARE v_use_count   TINYINT UNSIGNED;
  DECLARE v_revoked_at  DATETIME;
  DECLARE v_dk_user_id  INT UNSIGNED;

  SET p_file_path = '';
  SET p_reason    = '';

  -- Fetch key record
  SELECT id, user_id, project_id, file_id, expires_at,
         max_uses, use_count, revoked_at
  INTO   v_key_id, v_dk_user_id, v_project_id, v_file_id,
         v_expires_at, v_max_uses, v_use_count, v_revoked_at
  FROM   download_keys
  WHERE  token_hash = p_token_hash
  LIMIT  1;

  IF v_key_id = 0 THEN
    SET p_reason = 'invalid_key';

  ELSEIF v_dk_user_id != p_user_id THEN
    SET p_reason = 'wrong_user';

  ELSEIF v_revoked_at IS NOT NULL THEN
    SET p_reason = 'revoked';

  ELSEIF v_expires_at < NOW() THEN
    SET p_reason = 'expired';

  ELSEIF v_max_uses > 0 AND v_use_count >= v_max_uses THEN
    SET p_reason = 'exhausted';

  ELSE
    -- Resolve file path
    IF v_file_id IS NOT NULL THEN
      SELECT file_path INTO p_file_path
      FROM   project_files
      WHERE  id = v_file_id;
    ELSE
      SELECT project_file_path INTO p_file_path
      FROM   projects
      WHERE  id = v_project_id;
    END IF;

    -- Increment use counter
    UPDATE download_keys
    SET    use_count    = use_count + 1,
           last_used_at = NOW()
    WHERE  id = v_key_id;

    -- Log the download
    INSERT INTO download_logs
      (user_id, project_id, file_id, order_id, download_key_id,
       ip_address, status)
    SELECT
      v_dk_user_id, v_project_id, v_file_id, order_id, v_key_id,
      p_ip, 'success'
    FROM download_keys WHERE id = v_key_id;
  END IF;
END$$

-- ── sp_complete_order ─────────────────────────────────────────────
--  Called by the Stripe webhook handler on checkout.session.completed.
--  Atomically marks the order complete, credits seller balances,
--  and increments project download counters.
--
--  IN  p_order_id          — nagoweb order UUID
--  IN  p_payment_intent    — Stripe pi_xxx
--  IN  p_platform_fee_pct  — platform commission % (e.g. 20.00)
-- ─────────────────────────────────────────────────────────────────
CREATE PROCEDURE IF NOT EXISTS sp_complete_order(
  IN p_order_id         CHAR(36),
  IN p_payment_intent   VARCHAR(255),
  IN p_platform_fee_pct DECIMAL(5,2)
)
BEGIN
  DECLARE v_done        INT DEFAULT 0;
  DECLARE v_seller_id   INT UNSIGNED;
  DECLARE v_price       DECIMAL(10,2);
  DECLARE v_item_id     INT UNSIGNED;
  DECLARE v_proj_id     INT UNSIGNED;
  DECLARE v_fee         DECIMAL(10,2);
  DECLARE v_share       DECIMAL(10,2);

  DECLARE cur_items CURSOR FOR
    SELECT id, seller_id, price_at_purchase, project_id
    FROM   order_items
    WHERE  order_id = p_order_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  START TRANSACTION;

  -- 1. Mark order completed
  UPDATE orders
  SET    status               = 'completed',
         stripe_payment_intent = p_payment_intent,
         completed_at         = NOW()
  WHERE  id     = p_order_id
    AND  status = 'pending';

  IF ROW_COUNT() = 0 THEN
    -- Already processed (idempotency guard)
    ROLLBACK;
    LEAVE sp_complete_order;
  END IF;

  -- 2. Process each line item
  OPEN cur_items;
  item_loop: LOOP
    FETCH cur_items INTO v_item_id, v_seller_id, v_price, v_proj_id;
    IF v_done THEN LEAVE item_loop; END IF;

    SET v_fee   = ROUND(v_price * p_platform_fee_pct / 100, 2);
    SET v_share = v_price - v_fee;

    -- Update line item with fee split
    UPDATE order_items
    SET    seller_share = v_share,
           platform_fee = v_fee
    WHERE  id = v_item_id;

    -- Credit seller balance
    UPDATE users
    SET    seller_balance = seller_balance + v_share,
           total_earned   = total_earned   + v_share
    WHERE  id = v_seller_id;

    -- Increment project download counter
    UPDATE projects
    SET    download_count = download_count + 1
    WHERE  id = v_proj_id;

  END LOOP;
  CLOSE cur_items;

  COMMIT;
END$$

-- ── sp_recalculate_project_rating ─────────────────────────────────
--  Recomputes avg_rating and review_count for a project.
--  Call after INSERT / UPDATE / DELETE on reviews.
-- ─────────────────────────────────────────────────────────────────
CREATE PROCEDURE IF NOT EXISTS sp_recalculate_project_rating(
  IN p_project_id INT UNSIGNED
)
BEGIN
  UPDATE projects p
  SET
    avg_rating   = COALESCE(
                     (SELECT AVG(rating)   FROM reviews WHERE project_id = p.id AND is_hidden = 0),
                     0.00),
    review_count = (SELECT COUNT(*)        FROM reviews WHERE project_id = p.id AND is_hidden = 0)
  WHERE p.id = p_project_id;
END$$

DELIMITER ;


-- ================================================================
--  TRIGGERS
-- ================================================================

DELIMITER $$

-- ── After a review is inserted — recalculate project rating ───────
CREATE TRIGGER IF NOT EXISTS trg_review_after_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
  CALL sp_recalculate_project_rating(NEW.project_id);
END$$

-- ── After a review is updated — recalculate project rating ────────
CREATE TRIGGER IF NOT EXISTS trg_review_after_update
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
  CALL sp_recalculate_project_rating(NEW.project_id);
END$$

-- ── After a review is deleted — recalculate project rating ────────
CREATE TRIGGER IF NOT EXISTS trg_review_after_delete
AFTER DELETE ON reviews
FOR EACH ROW
BEGIN
  CALL sp_recalculate_project_rating(OLD.project_id);
END$$

-- ── After a wishlist row is inserted — increment counter ──────────
CREATE TRIGGER IF NOT EXISTS trg_wishlist_after_insert
AFTER INSERT ON wishlists
FOR EACH ROW
BEGIN
  UPDATE projects SET wishlist_count = wishlist_count + 1 WHERE id = NEW.project_id;
END$$

-- ── After a wishlist row is deleted — decrement counter ───────────
CREATE TRIGGER IF NOT EXISTS trg_wishlist_after_delete
AFTER DELETE ON wishlists
FOR EACH ROW
BEGIN
  UPDATE projects
  SET wishlist_count = GREATEST(wishlist_count - 1, 0)
  WHERE id = OLD.project_id;
END$$

-- ── After a coupon usage is inserted — increment coupon counter ───
CREATE TRIGGER IF NOT EXISTS trg_coupon_usage_after_insert
AFTER INSERT ON coupon_usages
FOR EACH ROW
BEGIN
  UPDATE coupons SET use_count = use_count + 1 WHERE id = NEW.coupon_id;
END$$

DELIMITER ;


-- ================================================================
--  SEED DATA
-- ================================================================

-- ── Categories ────────────────────────────────────────────────────
INSERT IGNORE INTO categories
  (name, slug, description, icon, color, sort_order)
VALUES
  ('Enterprise LAN',
   'enterprise-lan',
   'Campus and enterprise local area network designs using hierarchical and flat topologies.',
   'server', 'cyan', 1),

  ('Cloud Networking',
   'cloud-networking',
   'AWS, Azure, and GCP virtual network architectures including VPCs, VNets, and hybrid connectivity.',
   'cloud', 'blue', 2),

  ('Security & Firewall',
   'security',
   'Perimeter security, firewall policies, IDS/IPS, and zero-trust network designs.',
   'shield', 'red', 3),

  ('Wireless & Wi-Fi',
   'wireless',
   'Enterprise wireless LAN designs, controller-based and cloud-managed deployments.',
   'wifi', 'purple', 4),

  ('SD-WAN',
   'sdwan',
   'Software-defined WAN deployments including Cisco Viptela, VMware VeloCloud, and Fortinet.',
   'zap', 'yellow', 5),

  ('Data Center',
   'data-center',
   'Spine-leaf, three-tier, and hyper-converged data center network designs.',
   'database', 'green', 6),

  ('WAN & MPLS',
   'wan',
   'Wide area network designs including MPLS, BGP, OSPF, and multi-site connectivity.',
   'globe', 'orange', 7),

  ('SMB Networks',
   'smb',
   'Small and medium business network designs — affordable, practical, and easy to deploy.',
   'briefcase', 'pink', 8),

  ('Network Automation',
   'automation',
   'Ansible, Python, and Terraform-based network automation and infrastructure-as-code projects.',
   'terminal', 'teal', 9),

  ('IPv6 & Routing',
   'routing',
   'Advanced routing protocol labs — BGP, OSPF, EIGRP, IS-IS, and IPv6 migration designs.',
   'route', 'indigo', 10);

-- ── Admin user ────────────────────────────────────────────────────
--  Default password: Admin@1234
--  Hash: bcrypt cost 12
INSERT IGNORE INTO users
  (name, email, password_hash, role, is_active, is_email_verified, email_verified_at)
VALUES
  ('Admin',
   'admin@nagoweb.com',
   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i',
   'admin', 1, 1, NOW());

-- ── Demo seller ───────────────────────────────────────────────────
--  Default password: Seller@1234
INSERT IGNORE INTO users
  (name, email, password_hash, role, bio, is_active, is_email_verified, email_verified_at)
VALUES
  ('Demo Seller',
   'seller@nagoweb.com',
   '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'seller', 1, 1, NOW());

-- ── Demo buyer ────────────────────────────────────────────────────
--  Default password: Buyer@1234
INSERT IGNORE INTO users
  (name, email, password_hash, role, is_active, is_email_verified, email_verified_at)
VALUES
  ('Demo Buyer',
   'buyer@nagoweb.com',
   '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'buyer', 1, 1, NOW());

-- ── Welcome coupon ────────────────────────────────────────────────
INSERT IGNORE INTO coupons
  (code, description, discount_type, discount_value, max_discount_amount,
   min_order_amount, applies_to, max_uses, max_uses_per_user,
   valid_from, valid_until, is_active, created_by)
VALUES
  ('WELCOME20',
   '20% off your first purchase',
   'percentage', 20.00, 15.00,
   5.00, 'all', NULL, 1,
   NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR),
   1,
   (SELECT id FROM users WHERE email = 'admin@nagoweb.com' LIMIT 1)),

  ('LAUNCH10',
   '$10 off orders over $50',
   'fixed', 10.00, NULL,
   50.00, 'all', 500, 1,
   NOW(), DATE_ADD(NOW(), INTERVAL 6 MONTH),
   1,
   (SELECT id FROM users WHERE email = 'admin@nagoweb.com' LIMIT 1));


-- ================================================================
--  USEFUL ADMIN QUERIES  (reference — not executed on import)
-- ================================================================

/*
-- ── Revenue summary by month ──────────────────────────────────────
SELECT
  DATE_FORMAT(completed_at, '%Y-%m')  AS month,
  COUNT(*)                            AS orders,
  SUM(total_amount)                   AS gross_revenue,
  SUM(discount_amount)                AS total_discounts,
  SUM(total_amount - discount_amount) AS net_revenue
FROM orders
WHERE status = 'completed'
GROUP BY month
ORDER BY month DESC;

-- ── Top-selling projects ──────────────────────────────────────────
SELECT
  p.id,
  p.title,
  p.vendor,
  p.price,
  p.download_count,
  p.avg_rating,
  p.review_count,
  COUNT(oi.id)      AS times_purchased,
  SUM(oi.price_at_purchase) AS total_revenue
FROM projects p
JOIN order_items oi ON oi.project_id = p.id
JOIN orders      o  ON oi.order_id   = o.id AND o.status = 'completed'
GROUP BY p.id
ORDER BY total_revenue DESC
LIMIT 20;

-- ── Active download keys expiring in the next hour ────────────────
SELECT *
FROM v_download_key_status
WHERE key_status  = 'active'
  AND expires_at <= DATE_ADD(NOW(), INTERVAL 1 HOUR);

-- ── Seller earnings pending payout ───────────────────────────────
SELECT
  u.id, u.name, u.email,
  u.seller_balance AS pending_balance,
  u.total_earned
FROM users u
WHERE u.role           IN ('seller', 'admin')
  AND u.seller_balance  > 0
ORDER BY u.seller_balance DESC;

-- ── Download funnel: purchases vs actual downloads ────────────────
SELECT
  p.id,
  p.title,
  COUNT(DISTINCT oi.order_id)  AS purchase_count,
  COUNT(DISTINCT dl.id)        AS download_events,
  ROUND(
    COUNT(DISTINCT dl.id) / NULLIF(COUNT(DISTINCT oi.order_id), 0) * 100, 1
  ) AS download_rate_pct
FROM projects p
LEFT JOIN order_items oi ON oi.project_id = p.id
LEFT JOIN download_logs dl ON dl.project_id = p.id AND dl.status = 'success'
GROUP BY p.id
ORDER BY purchase_count DESC;

-- ── Expired / exhausted download keys (cleanup candidates) ────────
DELETE FROM download_keys
WHERE (expires_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
       OR (max_uses > 0 AND use_count >= max_uses))
  AND revoked_at IS NULL;
*/
