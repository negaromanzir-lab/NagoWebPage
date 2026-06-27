-- ================================================================
--  NagoWebPage — Books Migration (PostgreSQL / Neon)
--  Adds the books / e-library feature.
--  Run AFTER neon_postgres_schema.sql if you need to add books
--  tables separately to an existing database.
--  Each statement is idempotent (safe to re-run).
-- ================================================================

-- ── 1. books ──────────────────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_books_uploader  ON books(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_books_category  ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_published ON books(is_published);
CREATE INDEX IF NOT EXISTS idx_books_featured  ON books(is_featured);
CREATE INDEX IF NOT EXISTS idx_books_author    ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_fts ON books
  USING GIN (to_tsvector('english', title || ' ' || author || ' ' || COALESCE(description, '')));

-- auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_books_updated_at ON books;
CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. book_tags ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS book_tags (
  book_id   INTEGER       NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  tag       VARCHAR(100)  NOT NULL,
  PRIMARY KEY (book_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_btag_tag ON book_tags(tag);

-- ── 3. book_reviews ───────────────────────────────────────────────────────────

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

DROP TRIGGER IF EXISTS trg_book_reviews_updated_at ON book_reviews;
CREATE TRIGGER trg_book_reviews_updated_at
  BEFORE UPDATE ON book_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. book_download_logs ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS book_download_logs (
  id            SERIAL PRIMARY KEY,
  book_id       INTEGER         NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id       INTEGER         REFERENCES users(id),
  ip_address    VARCHAR(45),
  downloaded_at TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bdl_book ON book_download_logs(book_id);
CREATE INDEX IF NOT EXISTS idx_bdl_user ON book_download_logs(user_id);

-- ── 5. Trigger — sync book rating on review insert/update/delete ──────────────

CREATE OR REPLACE FUNCTION sync_book_rating() RETURNS TRIGGER AS $$
DECLARE bid INTEGER;
BEGIN
  bid := COALESCE(NEW.book_id, OLD.book_id);
  UPDATE books SET
    rating       = (SELECT COALESCE(AVG(rating), 0) FROM book_reviews WHERE book_id = bid),
    review_count = (SELECT COUNT(*)                 FROM book_reviews WHERE book_id = bid)
  WHERE id = bid;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_book_review_insert ON book_reviews;
DROP TRIGGER IF EXISTS trg_book_review_update ON book_reviews;
DROP TRIGGER IF EXISTS trg_book_review_delete ON book_reviews;

CREATE TRIGGER trg_book_review_insert AFTER INSERT ON book_reviews FOR EACH ROW EXECUTE FUNCTION sync_book_rating();
CREATE TRIGGER trg_book_review_update AFTER UPDATE ON book_reviews FOR EACH ROW EXECUTE FUNCTION sync_book_rating();
CREATE TRIGGER trg_book_review_delete AFTER DELETE ON book_reviews FOR EACH ROW EXECUTE FUNCTION sync_book_rating();

SELECT 'Books migration applied successfully' AS status;
