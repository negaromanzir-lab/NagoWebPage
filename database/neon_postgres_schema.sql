-- ================================================================
--  NagoWebPage — Full PostgreSQL Schema (Neon-compatible)
--  Converted from MySQL schema.sql + all migrations
--  Run this in Neon SQL Editor in one shot.
-- ================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Helper: auto-update updated_at columns ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
--  01. USERS
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(100)    NOT NULL,
  email               VARCHAR(255)    NOT NULL UNIQUE,
  password_hash       VARCHAR(255)    NOT NULL,
  role                VARCHAR(20)     NOT NULL DEFAULT 'buyer'
                      CHECK (role IN ('buyer','seller','admin')),
  bio                 TEXT,
  website             VARCHAR(500),
  avatar_url          VARCHAR(500),
  phone               VARCHAR(30),
  country             CHAR(2),
  timezone            VARCHAR(64)     DEFAULT 'UTC',
  stripe_customer_id  VARCHAR(64),
  is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
  is_email_verified   BOOLEAN         NOT NULL DEFAULT FALSE,
  email_verified_at   TIMESTAMP,
  seller_balance      NUMERIC(12,2)   NOT NULL DEFAULT 0.00,
  total_earned        NUMERIC(12,2)   NOT NULL DEFAULT 0.00,
  last_login_at       TIMESTAMP,
  created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role            ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_stripe          ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_active          ON users(is_active);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
--  02. REFRESH TOKENS
-- ================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          CHAR(36)        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  user_id     INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT            NOT NULL,
  user_agent  VARCHAR(512),
  ip_address  VARCHAR(45),
  expires_at  TIMESTAMP       NOT NULL,
  revoked_at  TIMESTAMP,
  created_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rt_user_id  ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_rt_expires  ON refresh_tokens(expires_at);

-- ================================================================
--  03. PASSWORD RESETS
-- ================================================================
CREATE TABLE IF NOT EXISTS password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255)    NOT NULL,
  expires_at  TIMESTAMP       NOT NULL,
  used_at     TIMESTAMP,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pr_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_pr_token   ON password_resets(token_hash);

-- ================================================================
--  04. CATEGORIES
-- ================================================================
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100)    NOT NULL,
  slug        VARCHAR(100)    NOT NULL UNIQUE,
  description TEXT,
  icon        VARCHAR(100),
  color       VARCHAR(50),
  sort_order  SMALLINT        NOT NULL DEFAULT 0,
  is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_sort   ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
--  05. PROJECTS
-- ================================================================
CREATE TABLE IF NOT EXISTS projects (
  id                    SERIAL PRIMARY KEY,
  seller_id             INTEGER         NOT NULL REFERENCES users(id),
  category_id           INTEGER         NOT NULL REFERENCES categories(id),
  title                 VARCHAR(200)    NOT NULL,
  slug                  VARCHAR(220)    NOT NULL UNIQUE,
  description           TEXT            NOT NULL,
  short_description     VARCHAR(500),
  vendor                VARCHAR(100)    NOT NULL,
  topology_type         VARCHAR(20)     NOT NULL
                        CHECK (topology_type IN ('star','mesh','ring','hierarchical','bus','hybrid','cloud','sdwan')),
  difficulty            VARCHAR(20)     NOT NULL DEFAULT 'intermediate'
                        CHECK (difficulty IN ('beginner','intermediate','advanced')),
  software_version      VARCHAR(100),
  device_count          SMALLINT,
  lab_duration_hours    NUMERIC(4,1),
  preview_image_path    VARCHAR(500),
  project_file_path     VARCHAR(500),
  price                 NUMERIC(10,2)   NOT NULL DEFAULT 0.00,
  original_price        NUMERIC(10,2),
  currency              CHAR(3)         NOT NULL DEFAULT 'USD',
  avg_rating            NUMERIC(3,2)    NOT NULL DEFAULT 0.00,
  review_count          INTEGER         NOT NULL DEFAULT 0,
  download_count        INTEGER         NOT NULL DEFAULT 0,
  view_count            INTEGER         NOT NULL DEFAULT 0,
  wishlist_count        INTEGER         NOT NULL DEFAULT 0,
  is_published          BOOLEAN         NOT NULL DEFAULT FALSE,
  is_featured           BOOLEAN         NOT NULL DEFAULT FALSE,
  is_deleted            BOOLEAN         NOT NULL DEFAULT FALSE,
  meta_title            VARCHAR(200),
  meta_description      VARCHAR(500),
  published_at          TIMESTAMP,
  created_at            TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proj_seller     ON projects(seller_id);
CREATE INDEX IF NOT EXISTS idx_proj_category   ON projects(category_id);
CREATE INDEX IF NOT EXISTS idx_proj_price      ON projects(price);
CREATE INDEX IF NOT EXISTS idx_proj_rating     ON projects(avg_rating);
CREATE INDEX IF NOT EXISTS idx_proj_published  ON projects(is_published, is_deleted);
CREATE INDEX IF NOT EXISTS idx_proj_featured   ON projects(is_featured, is_published);
CREATE INDEX IF NOT EXISTS idx_proj_vendor     ON projects(vendor);
-- Full-text search index (PostgreSQL GIN)
CREATE INDEX IF NOT EXISTS idx_proj_fts ON projects
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(short_description,'') || ' ' || description || ' ' || vendor));
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
--  06. PROJECT TAGS
-- ================================================================
CREATE TABLE IF NOT EXISTS project_tags (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag         VARCHAR(60)     NOT NULL,
  UNIQUE (project_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_ptag_tag ON project_tags(tag);

-- ================================================================
--  07. PROJECT FILES
-- ================================================================
CREATE TABLE IF NOT EXISTS project_files (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name       VARCHAR(255)    NOT NULL,
  stored_name     VARCHAR(255)    NOT NULL,
  file_path       VARCHAR(500)    NOT NULL,
  mime_type       VARCHAR(127),
  file_size_bytes BIGINT,
  file_type       VARCHAR(20)     NOT NULL DEFAULT 'source'
                  CHECK (file_type IN ('source','preview','diagram','documentation','other')),
  version         VARCHAR(20)     DEFAULT '1.0',
  is_primary      BOOLEAN         NOT NULL DEFAULT FALSE,
  download_count  INTEGER         NOT NULL DEFAULT 0,
  uploaded_by     INTEGER         NOT NULL REFERENCES users(id),
  created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pf_project  ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_pf_type     ON project_files(file_type);
CREATE INDEX IF NOT EXISTS idx_pf_primary  ON project_files(project_id, is_primary);

-- ================================================================
--  08. REVIEWS
-- ================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  project_id  INTEGER         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_id    CHAR(36),
  rating      SMALLINT        NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       VARCHAR(150),
  comment     TEXT,
  is_verified BOOLEAN         NOT NULL DEFAULT TRUE,
  is_hidden   BOOLEAN         NOT NULL DEFAULT FALSE,
  helpful_count INTEGER       NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_project ON reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating  ON reviews(rating);
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
--  09. ORDERS
-- ================================================================
CREATE TABLE IF NOT EXISTS orders (
  id                      CHAR(36)        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  user_id                 INTEGER         NOT NULL REFERENCES users(id),
  stripe_session_id       VARCHAR(255),
  stripe_payment_intent   VARCHAR(255),
  stripe_charge_id        VARCHAR(255),
  coupon_id               INTEGER,
  coupon_code             VARCHAR(50),
  discount_amount         NUMERIC(10,2)   NOT NULL DEFAULT 0.00,
  subtotal_amount         NUMERIC(10,2)   NOT NULL DEFAULT 0.00,
  total_amount            NUMERIC(10,2)   NOT NULL,
  currency                CHAR(3)         NOT NULL DEFAULT 'USD',
  -- Manual payment columns (from manual_payments_migration)
  payment_method          VARCHAR(20)     NOT NULL DEFAULT 'stripe'
                          CHECK (payment_method IN ('stripe','telebirr','cbe_birr','bank_transfer')),
  manual_status           VARCHAR(30)     NOT NULL DEFAULT 'none'
                          CHECK (manual_status IN ('none','screenshot_uploaded','under_review','approved','rejected')),
  admin_note              TEXT,
  reviewed_by             INTEGER         REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at             TIMESTAMP,
  status                  VARCHAR(20)     NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','completed','expired','refunded','partial_refund')),
  completed_at            TIMESTAMP,
  refunded_at             TIMESTAMP,
  created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user           ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status         ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_intent  ON orders(stripe_payment_intent);
CREATE INDEX IF NOT EXISTS idx_orders_created        ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_pay_method     ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_manual_status  ON orders(manual_status);
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
--  10. ORDER ITEMS
-- ================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id                  SERIAL PRIMARY KEY,
  order_id            CHAR(36)        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  project_id          INTEGER         NOT NULL REFERENCES projects(id),
  project_title       VARCHAR(200)    NOT NULL,
  price_at_purchase   NUMERIC(10,2)   NOT NULL,
  seller_id           INTEGER         NOT NULL REFERENCES users(id),
  seller_share        NUMERIC(10,2)   NOT NULL DEFAULT 0.00,
  platform_fee        NUMERIC(10,2)   NOT NULL DEFAULT 0.00,
  refunded_at         TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_oi_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_oi_project ON order_items(project_id);
CREATE INDEX IF NOT EXISTS idx_oi_seller  ON order_items(seller_id);

-- ================================================================
--  11. PAYMENTS
-- ================================================================
CREATE TABLE IF NOT EXISTS payments (
  id                  SERIAL PRIMARY KEY,
  order_id            CHAR(36)        NOT NULL REFERENCES orders(id),
  user_id             INTEGER         NOT NULL REFERENCES users(id),
  stripe_event_id     VARCHAR(255)    NOT NULL UNIQUE,
  stripe_object_id    VARCHAR(255),
  event_type          VARCHAR(100)    NOT NULL,
  amount              NUMERIC(10,2)   NOT NULL,
  currency            CHAR(3)         NOT NULL DEFAULT 'USD',
  direction           VARCHAR(10)     NOT NULL CHECK (direction IN ('credit','debit')),
  stripe_payload      JSONB,
  processed_at        TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pay_order        ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_pay_user         ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_stripe_event ON payments(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_pay_processed    ON payments(processed_at);

-- ================================================================
--  12. DOWNLOAD KEYS
-- ================================================================
CREATE TABLE IF NOT EXISTS download_keys (
  id              SERIAL PRIMARY KEY,
  token           CHAR(64)        NOT NULL,
  token_hash      VARCHAR(255)    NOT NULL UNIQUE,
  user_id         INTEGER         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  project_id      INTEGER         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_id        CHAR(36)        NOT NULL REFERENCES orders(id),
  file_id         INTEGER         REFERENCES project_files(id)     ON DELETE SET NULL,
  expires_at      TIMESTAMP       NOT NULL,
  max_uses        SMALLINT        NOT NULL DEFAULT 3,
  use_count       SMALLINT        NOT NULL DEFAULT 0,
  last_used_at    TIMESTAMP,
  revoked_at      TIMESTAMP,
  ip_address      VARCHAR(45),
  user_agent      VARCHAR(512),
  created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dk_user     ON download_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_dk_project  ON download_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_dk_order    ON download_keys(order_id);
CREATE INDEX IF NOT EXISTS idx_dk_expires  ON download_keys(expires_at);

-- ================================================================
--  13. DOWNLOAD LOGS
-- ================================================================
CREATE TABLE IF NOT EXISTS download_logs (
  id              BIGSERIAL PRIMARY KEY,
  user_id         INTEGER         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  project_id      INTEGER         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id         INTEGER         REFERENCES project_files(id)     ON DELETE SET NULL,
  order_id        CHAR(36),
  download_key_id INTEGER,
  ip_address      VARCHAR(45),
  user_agent      VARCHAR(512),
  country_code    CHAR(2),
  status          VARCHAR(20)     NOT NULL DEFAULT 'success'
                  CHECK (status IN ('success','failed','expired_key','invalid_key')),
  bytes_sent      BIGINT,
  duration_ms     INTEGER,
  downloaded_at   TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dl_user         ON download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dl_project      ON download_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_dl_order        ON download_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_dl_downloaded   ON download_logs(downloaded_at);

-- ================================================================
--  14. WISHLISTS
-- ================================================================
CREATE TABLE IF NOT EXISTS wishlists (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  project_id  INTEGER         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_wl_project ON wishlists(project_id);

-- ================================================================
--  15. COUPONS
-- ================================================================
CREATE TABLE IF NOT EXISTS coupons (
  id                  SERIAL PRIMARY KEY,
  code                VARCHAR(50)     NOT NULL UNIQUE,
  description         VARCHAR(255),
  discount_type       VARCHAR(15)     NOT NULL DEFAULT 'percentage'
                      CHECK (discount_type IN ('percentage','fixed')),
  discount_value      NUMERIC(10,2)   NOT NULL,
  max_discount_amount NUMERIC(10,2),
  min_order_amount    NUMERIC(10,2)   NOT NULL DEFAULT 0.00,
  applies_to          VARCHAR(20)     NOT NULL DEFAULT 'all'
                      CHECK (applies_to IN ('all','category','project')),
  applies_to_id       INTEGER,
  max_uses            INTEGER,
  max_uses_per_user   SMALLINT        NOT NULL DEFAULT 1,
  use_count           INTEGER         NOT NULL DEFAULT 0,
  valid_from          TIMESTAMP       NOT NULL DEFAULT NOW(),
  valid_until         TIMESTAMP,
  is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
  created_by          INTEGER         NOT NULL REFERENCES users(id),
  created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, valid_from, valid_until);
CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
--  16. COUPON USAGES
-- ================================================================
CREATE TABLE IF NOT EXISTS coupon_usages (
  id               SERIAL PRIMARY KEY,
  coupon_id        INTEGER         NOT NULL REFERENCES coupons(id),
  user_id          INTEGER         NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  order_id         CHAR(36)        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount_applied NUMERIC(10,2)   NOT NULL,
  used_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
  UNIQUE (coupon_id, order_id)
);
CREATE INDEX IF NOT EXISTS idx_cu_user ON coupon_usages(user_id);

-- ================================================================
--  17. SELLER PAYOUTS
-- ================================================================
CREATE TABLE IF NOT EXISTS seller_payouts (
  id                  SERIAL PRIMARY KEY,
  seller_id           INTEGER         NOT NULL REFERENCES users(id),
  stripe_transfer_id  VARCHAR(255),
  stripe_payout_id    VARCHAR(255),
  amount              NUMERIC(12,2)   NOT NULL,
  currency            CHAR(3)         NOT NULL DEFAULT 'USD',
  platform_fee        NUMERIC(12,2)   NOT NULL DEFAULT 0.00,
  net_amount          NUMERIC(12,2)   NOT NULL,
  status              VARCHAR(20)     NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  period_start        DATE            NOT NULL,
  period_end          DATE            NOT NULL,
  notes               TEXT,
  paid_at             TIMESTAMP,
  created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sp_seller ON seller_payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_sp_status ON seller_payouts(status);
CREATE INDEX IF NOT EXISTS idx_sp_period ON seller_payouts(period_start, period_end);
CREATE TRIGGER trg_sp_updated_at BEFORE UPDATE ON seller_payouts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
--  18. AUDIT LOGS
-- ================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    INTEGER,
  actor_role  VARCHAR(10) CHECK (actor_role IN ('buyer','seller','admin','system')),
  action      VARCHAR(100)    NOT NULL,
  entity_type VARCHAR(60)     NOT NULL,
  entity_id   VARCHAR(36)     NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  VARCHAR(45),
  user_agent  VARCHAR(512),
  created_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_al_actor  ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_al_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_al_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_al_created ON audit_logs(created_at);

-- ================================================================
--  19. BOOKS  (from books_migration.sql)
-- ================================================================
CREATE TABLE IF NOT EXISTS books (
  id                SERIAL PRIMARY KEY,
  uploaded_by       INTEGER         NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  category_id       INTEGER         REFERENCES categories(id)           ON DELETE SET NULL,
  title             VARCHAR(300)    NOT NULL,
  slug              VARCHAR(320)    NOT NULL UNIQUE,
  author            VARCHAR(200)    NOT NULL,
  publisher         VARCHAR(200),
  description       TEXT,
  short_description VARCHAR(500),
  edition           VARCHAR(50),
  published_year    SMALLINT,
  isbn              VARCHAR(30),
  pages             SMALLINT,
  language          VARCHAR(50)     DEFAULT 'English',
  cover_image_path  VARCHAR(500),
  pdf_file_path     VARCHAR(500)    NOT NULL,
  file_size_bytes   BIGINT,
  price             NUMERIC(10,2)   NOT NULL DEFAULT 0.00,
  download_count    INTEGER         NOT NULL DEFAULT 0,
  view_count        INTEGER         NOT NULL DEFAULT 0,
  rating            NUMERIC(3,2)    NOT NULL DEFAULT 0.00,
  review_count      INTEGER         NOT NULL DEFAULT 0,
  is_published      BOOLEAN         NOT NULL DEFAULT FALSE,
  is_featured       BOOLEAN         NOT NULL DEFAULT FALSE,
  is_free           BOOLEAN         NOT NULL DEFAULT TRUE,
  is_deleted        BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_books_uploader    ON books(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_books_category    ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_published   ON books(is_published);
CREATE INDEX IF NOT EXISTS idx_books_featured    ON books(is_featured);
CREATE INDEX IF NOT EXISTS idx_books_author      ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_fts ON books
  USING GIN (to_tsvector('english', title || ' ' || author || ' ' || COALESCE(description,'')));
CREATE TRIGGER trg_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS book_tags (
  book_id   INTEGER       NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  tag       VARCHAR(100)  NOT NULL,
  PRIMARY KEY (book_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_btag_tag ON book_tags(tag);

CREATE TABLE IF NOT EXISTS book_reviews (
  id         SERIAL PRIMARY KEY,
  book_id    INTEGER         NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id    INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     SMALLINT        NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP       NOT NULL DEFAULT NOW(),
  UNIQUE (book_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_breview_book ON book_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_breview_user ON book_reviews(user_id);
CREATE TRIGGER trg_book_reviews_updated_at BEFORE UPDATE ON book_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: recalculate book rating on review change
CREATE OR REPLACE FUNCTION sync_book_rating() RETURNS TRIGGER AS $$
DECLARE bid INTEGER;
BEGIN
  bid := COALESCE(NEW.book_id, OLD.book_id);
  UPDATE books SET
    rating       = (SELECT COALESCE(AVG(rating),0) FROM book_reviews WHERE book_id = bid),
    review_count = (SELECT COUNT(*)                FROM book_reviews WHERE book_id = bid)
  WHERE id = bid;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_book_review_insert AFTER INSERT ON book_reviews FOR EACH ROW EXECUTE FUNCTION sync_book_rating();
CREATE TRIGGER trg_book_review_update AFTER UPDATE ON book_reviews FOR EACH ROW EXECUTE FUNCTION sync_book_rating();
CREATE TRIGGER trg_book_review_delete AFTER DELETE ON book_reviews FOR EACH ROW EXECUTE FUNCTION sync_book_rating();

CREATE TABLE IF NOT EXISTS book_download_logs (
  id            SERIAL PRIMARY KEY,
  book_id       INTEGER         NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id       INTEGER         REFERENCES users(id),
  ip_address    VARCHAR(45),
  downloaded_at TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bdl_book ON book_download_logs(book_id);
CREATE INDEX IF NOT EXISTS idx_bdl_user ON book_download_logs(user_id);

-- ================================================================
--  20. COURSES  (from courses_migration.sql)
-- ================================================================
CREATE TABLE IF NOT EXISTS courses (
  id                SERIAL PRIMARY KEY,
  instructor_id     INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id       INTEGER         REFERENCES categories(id)     ON DELETE SET NULL,
  title             VARCHAR(200)    NOT NULL,
  slug              VARCHAR(220)    NOT NULL UNIQUE,
  description       VARCHAR(1000),
  short_description VARCHAR(300),
  long_description  TEXT,
  image_url         VARCHAR(500),
  price             NUMERIC(10,2)   NOT NULL DEFAULT 0.00,
  original_price    NUMERIC(10,2),
  difficulty        VARCHAR(20)     NOT NULL DEFAULT 'beginner'
                    CHECK (difficulty IN ('beginner','intermediate','advanced')),
  duration_hours    NUMERIC(5,1),
  language          VARCHAR(50)     DEFAULT 'English',
  student_count     INTEGER         NOT NULL DEFAULT 0,
  rating            NUMERIC(3,2)    NOT NULL DEFAULT 0.00,
  review_count      INTEGER         NOT NULL DEFAULT 0,
  is_published      BOOLEAN         NOT NULL DEFAULT FALSE,
  is_featured       BOOLEAN         NOT NULL DEFAULT FALSE,
  is_deleted        BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category   ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_published  ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_featured   ON courses(is_featured);
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS course_modules (
  id              SERIAL PRIMARY KEY,
  course_id       INTEGER         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title           VARCHAR(200)    NOT NULL,
  description     TEXT,
  order_position  SMALLINT        NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cmod_course ON course_modules(course_id);

CREATE TABLE IF NOT EXISTS course_lessons (
  id              SERIAL PRIMARY KEY,
  module_id       INTEGER         NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title           VARCHAR(200)    NOT NULL,
  content         TEXT,
  video_url       VARCHAR(500),
  duration_mins   SMALLINT,
  order_position  SMALLINT        NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lesson_module ON course_lessons(module_id);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id           SERIAL PRIMARY KEY,
  course_id    INTEGER         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id      INTEGER         NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  enrolled_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  UNIQUE (course_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_enroll_user   ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enroll_course ON course_enrollments(course_id);

CREATE TABLE IF NOT EXISTS course_reviews (
  id          SERIAL PRIMARY KEY,
  course_id   INTEGER         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id     INTEGER         NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  rating      SMALLINT        NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_crev_course ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_crev_user   ON course_reviews(user_id);
CREATE TRIGGER trg_course_reviews_updated_at BEFORE UPDATE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: recalculate course rating
CREATE OR REPLACE FUNCTION sync_course_rating() RETURNS TRIGGER AS $$
DECLARE cid INTEGER;
BEGIN
  cid := COALESCE(NEW.course_id, OLD.course_id);
  UPDATE courses SET
    rating       = (SELECT COALESCE(AVG(rating),0) FROM course_reviews WHERE course_id = cid),
    review_count = (SELECT COUNT(*)                FROM course_reviews WHERE course_id = cid)
  WHERE id = cid;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_crev_insert AFTER INSERT ON course_reviews FOR EACH ROW EXECUTE FUNCTION sync_course_rating();
CREATE TRIGGER trg_crev_update AFTER UPDATE ON course_reviews FOR EACH ROW EXECUTE FUNCTION sync_course_rating();
CREATE TRIGGER trg_crev_delete AFTER DELETE ON course_reviews FOR EACH ROW EXECUTE FUNCTION sync_course_rating();

-- Trigger: increment/decrement student_count
CREATE OR REPLACE FUNCTION sync_course_students() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE courses SET student_count = student_count + 1 WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE courses SET student_count = GREATEST(student_count - 1, 0) WHERE id = OLD.course_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enroll_insert AFTER INSERT ON course_enrollments FOR EACH ROW EXECUTE FUNCTION sync_course_students();
CREATE TRIGGER trg_enroll_delete AFTER DELETE ON course_enrollments FOR EACH ROW EXECUTE FUNCTION sync_course_students();

-- ================================================================
--  21. PAYMENT PROOFS  (from manual_payments_migration.sql)
-- ================================================================
CREATE TABLE IF NOT EXISTS payment_proofs (
  id                  SERIAL PRIMARY KEY,
  order_id            CHAR(36)        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id             INTEGER         NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
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
CREATE TRIGGER trg_pp_updated_at BEFORE UPDATE ON payment_proofs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
--  22. MANUAL PAYMENT SETTINGS
-- ================================================================
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
CREATE TRIGGER trg_mps_updated_at BEFORE UPDATE ON manual_payment_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO manual_payment_settings (method, is_enabled, account_name, account_number, instructions)
VALUES
  ('telebirr', TRUE,  'NagoWeb Ethiopia',          '0912345678',     E'1. Open your Telebirr app\n2. Go to "Send Money"\n3. Enter the account number above\n4. Enter the exact order amount in ETB\n5. Complete the transfer and take a screenshot\n6. Upload the screenshot below'),
  ('cbe_birr', TRUE,  'NagoWeb PLC',                '1000123456789',  E'1. Open CBE Birr app or visit a CBE branch\n2. Transfer to the account number above\n3. Use your Order ID as the payment reference\n4. Take a screenshot of the confirmation\n5. Upload the screenshot below'),
  ('bank_transfer', FALSE, 'NagoWeb Technologies PLC', 'CBE 1000123456789', E'1. Transfer to the bank account above\n2. Include your Order ID in the transfer description\n3. Upload your bank transfer receipt below')
ON CONFLICT (method) DO NOTHING;

-- ================================================================
--  23. NOTIFICATION PREFERENCES  (from notifications_migration.sql)
-- ================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TRIGGER trg_np_updated_at BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
--  END OF SCHEMA
-- ================================================================
SELECT 'NagoWebPage PostgreSQL schema created successfully' AS status;
