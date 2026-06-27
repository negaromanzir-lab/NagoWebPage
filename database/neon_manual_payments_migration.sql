-- ================================================================
--  NagoWebPage — Manual Payments Migration (PostgreSQL / Neon)
--  Adds Telebirr / CBE Birr payment verification workflow.
--  Run AFTER neon_postgres_schema.sql if adding to an existing DB.
--  Each statement is idempotent (safe to re-run).
-- ================================================================

-- ── 1. Extend orders table ────────────────────────────────────────────────────
--  Add payment_method and manual payment tracking columns.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'stripe'
    CHECK (payment_method IN ('stripe','telebirr','cbe_birr','bank_transfer')),

  ADD COLUMN IF NOT EXISTS manual_status VARCHAR(30) NOT NULL DEFAULT 'none'
    CHECK (manual_status IN ('none','screenshot_uploaded','under_review','approved','rejected')),

  ADD COLUMN IF NOT EXISTS admin_note    TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_orders_pay_method    ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_manual_status ON orders(manual_status);

-- ── 2. payment_proofs table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_proofs (
  id                  SERIAL PRIMARY KEY,
  order_id            CHAR(36)        NOT NULL REFERENCES orders(id)  ON DELETE CASCADE,
  user_id             INTEGER         NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  payment_method      VARCHAR(20)     NOT NULL
                      CHECK (payment_method IN ('telebirr','cbe_birr','bank_transfer')),
  sender_name         VARCHAR(150)    NOT NULL,
  sender_phone        VARCHAR(30),
  transaction_ref     VARCHAR(100),
  amount_paid         NUMERIC(10,2)   NOT NULL,
  currency            CHAR(3)         NOT NULL DEFAULT 'ETB',
  screenshot_path     VARCHAR(500)    NOT NULL,
  screenshot_name     VARCHAR(255)    NOT NULL,
  file_size_bytes     BIGINT,
  status              VARCHAR(20)     NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected')),
  admin_note          TEXT,
  reviewed_by         INTEGER         REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMP,
  submitted_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pp_order     ON payment_proofs(order_id);
CREATE INDEX IF NOT EXISTS idx_pp_user      ON payment_proofs(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_status    ON payment_proofs(status);
CREATE INDEX IF NOT EXISTS idx_pp_method    ON payment_proofs(payment_method);
CREATE INDEX IF NOT EXISTS idx_pp_submitted ON payment_proofs(submitted_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pp_updated_at ON payment_proofs;
CREATE TRIGGER trg_pp_updated_at
  BEFORE UPDATE ON payment_proofs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. manual_payment_settings table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS manual_payment_settings (
  id              SERIAL PRIMARY KEY,
  method          VARCHAR(20)     NOT NULL UNIQUE
                  CHECK (method IN ('telebirr','cbe_birr','bank_transfer')),
  is_enabled      BOOLEAN         NOT NULL DEFAULT TRUE,
  account_name    VARCHAR(150)    NOT NULL,
  account_number  VARCHAR(50)     NOT NULL,
  instructions    TEXT,
  updated_by      INTEGER         REFERENCES users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_mps_updated_at ON manual_payment_settings;
CREATE TRIGGER trg_mps_updated_at
  BEFORE UPDATE ON manual_payment_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. Seed default payment settings ─────────────────────────────────────────

INSERT INTO manual_payment_settings (method, is_enabled, account_name, account_number, instructions)
VALUES
  ('telebirr', TRUE, 'NagoWeb Ethiopia', '0912345678',
   E'1. Open your Telebirr app\n2. Go to "Send Money"\n3. Enter the account number above\n4. Enter the exact order amount in ETB\n5. Complete the transfer and take a screenshot\n6. Upload the screenshot below'),

  ('cbe_birr', TRUE, 'NagoWeb PLC', '1000123456789',
   E'1. Open CBE Birr app or visit a CBE branch\n2. Transfer to the account number above\n3. Use your Order ID as the payment reference\n4. Take a screenshot of the confirmation\n5. Upload the screenshot below'),

  ('bank_transfer', FALSE, 'NagoWeb Technologies PLC', 'CBE 1000123456789',
   E'1. Transfer to the bank account above\n2. Include your Order ID in the transfer description\n3. Upload your bank transfer receipt below')

ON CONFLICT (method) DO NOTHING;

SELECT 'Manual payments migration applied successfully' AS status;
