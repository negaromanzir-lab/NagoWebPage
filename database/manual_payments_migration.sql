-- ================================================================
--  NagoWebPage — Manual Payment Migration
--  Adds Telebirr / CBE Birr payment verification workflow.
--  Run AFTER schema.sql has been applied.
-- ================================================================

USE nagoweb;

-- ── 1. Extend orders table ────────────────────────────────────────────────────
--  Add payment_method and manual payment tracking columns.

ALTER TABLE orders
  ADD COLUMN payment_method   ENUM('stripe','telebirr','cbe_birr','bank_transfer')
                              NOT NULL DEFAULT 'stripe'
                              COMMENT 'Payment channel used'
                              AFTER currency,

  ADD COLUMN manual_status    ENUM('none','screenshot_uploaded','under_review','approved','rejected')
                              NOT NULL DEFAULT 'none'
                              COMMENT 'Manual payment verification state'
                              AFTER payment_method,

  ADD COLUMN admin_note       TEXT
                              COMMENT 'Admin note on approval or rejection'
                              AFTER manual_status,

  ADD COLUMN reviewed_by      INT UNSIGNED
                              COMMENT 'Admin user who approved/rejected'
                              AFTER admin_note,

  ADD COLUMN reviewed_at      DATETIME
                              COMMENT 'When the admin reviewed the payment'
                              AFTER reviewed_by,

  ADD INDEX idx_payment_method (payment_method),
  ADD INDEX idx_manual_status  (manual_status);

-- ── 2. payment_proofs table ───────────────────────────────────────────────────
--  Stores payment screenshots uploaded by buyers.

CREATE TABLE IF NOT EXISTS payment_proofs (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  order_id            CHAR(36)        NOT NULL,
  user_id             INT UNSIGNED    NOT NULL,

  -- Payment method details
  payment_method      ENUM('telebirr','cbe_birr','bank_transfer')
                      NOT NULL,
  sender_name         VARCHAR(150)    NOT NULL
                      COMMENT 'Name on the sender account',
  sender_phone        VARCHAR(30)
                      COMMENT 'Phone number used for Telebirr / CBE Birr',
  transaction_ref     VARCHAR(100)
                      COMMENT 'Transaction reference / confirmation number',
  amount_paid         DECIMAL(10,2)   NOT NULL
                      COMMENT 'Amount shown on the screenshot (ETB)',
  currency            CHAR(3)         NOT NULL DEFAULT 'ETB',

  -- Screenshot file
  screenshot_path     VARCHAR(500)    NOT NULL
                      COMMENT 'Relative path under uploads/payment_proofs/',
  screenshot_name     VARCHAR(255)    NOT NULL
                      COMMENT 'Original filename',
  file_size_bytes     BIGINT UNSIGNED,

  -- Review state
  status              ENUM('pending','approved','rejected')
                      NOT NULL DEFAULT 'pending',
  admin_note          TEXT
                      COMMENT 'Reason for rejection or approval note',
  reviewed_by         INT UNSIGNED,
  reviewed_at         DATETIME,

  -- Timestamps
  submitted_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_order     (order_id),
  INDEX idx_user      (user_id),
  INDEX idx_status    (status),
  INDEX idx_method    (payment_method),
  INDEX idx_submitted (submitted_at),

  CONSTRAINT fk_pp_order
    FOREIGN KEY (order_id)     REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_pp_user
    FOREIGN KEY (user_id)      REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_pp_reviewer
    FOREIGN KEY (reviewed_by)  REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Payment screenshots submitted by buyers for manual verification';

-- ── 3. manual_payment_settings table ─────────────────────────────────────────
--  Admin-configurable payment account details shown to buyers.

CREATE TABLE IF NOT EXISTS manual_payment_settings (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  method          ENUM('telebirr','cbe_birr','bank_transfer')
                  NOT NULL UNIQUE,
  is_enabled      TINYINT(1)      NOT NULL DEFAULT 1,
  account_name    VARCHAR(150)    NOT NULL,
  account_number  VARCHAR(50)     NOT NULL,
  instructions    TEXT
                  COMMENT 'Step-by-step instructions shown to buyer',
  updated_by      INT UNSIGNED,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_mps_updater
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Admin-configurable manual payment account details';

-- ── 4. Seed default payment settings ─────────────────────────────────────────

INSERT IGNORE INTO manual_payment_settings
  (method, is_enabled, account_name, account_number, instructions)
VALUES
  ('telebirr', 1,
   'NagoWeb Ethiopia',
   '0912345678',
   '1. Open your Telebirr app\n2. Go to "Send Money"\n3. Enter the account number above\n4. Enter the exact order amount in ETB\n5. Complete the transfer and take a screenshot\n6. Upload the screenshot below'),

  ('cbe_birr', 1,
   'NagoWeb PLC',
   '1000123456789',
   '1. Open CBE Birr app or visit a CBE branch\n2. Transfer to the account number above\n3. Use your Order ID as the payment reference\n4. Take a screenshot of the confirmation\n5. Upload the screenshot below'),

  ('bank_transfer', 0,
   'NagoWeb Technologies PLC',
   'CBE 1000123456789',
   '1. Transfer to the bank account above\n2. Include your Order ID in the transfer description\n3. Upload your bank transfer receipt below');
