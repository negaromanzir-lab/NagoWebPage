-- ================================================================
--  NagoWebPage — Books Migration
--  Adds the books / e-library feature.
--  Run AFTER courses_migration.sql
-- ================================================================

USE nagoweb;

-- ── 1. books ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS books (
  id                INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  uploaded_by       INT UNSIGNED      NOT NULL COMMENT 'FK → users.id (admin/seller)',
  category_id       INT UNSIGNED      COMMENT 'FK → categories.id',

  -- Identity
  title             VARCHAR(300)      NOT NULL,
  slug              VARCHAR(320)      NOT NULL UNIQUE,
  author            VARCHAR(200)      NOT NULL,
  publisher         VARCHAR(200),
  description       TEXT,
  short_description VARCHAR(500),

  -- Edition / year
  edition           VARCHAR(50),
  published_year    YEAR,
  isbn              VARCHAR(30),
  pages             SMALLINT UNSIGNED,
  language          VARCHAR(50)       DEFAULT 'English',

  -- Files (stored under uploads/books/)
  cover_image_path  VARCHAR(500)      COMMENT 'Book cover image',
  pdf_file_path     VARCHAR(500)      NOT NULL COMMENT 'Downloadable PDF',
  file_size_bytes   BIGINT UNSIGNED,

  -- Pricing (0 = free)
  price             DECIMAL(10,2)     NOT NULL DEFAULT 0.00,

  -- Metrics
  download_count    INT UNSIGNED      NOT NULL DEFAULT 0,
  view_count        INT UNSIGNED      NOT NULL DEFAULT 0,
  rating            DECIMAL(3,2)      NOT NULL DEFAULT 0.00,
  review_count      INT UNSIGNED      NOT NULL DEFAULT 0,

  -- Flags
  is_published      TINYINT(1)        NOT NULL DEFAULT 0,
  is_featured       TINYINT(1)        NOT NULL DEFAULT 0,
  is_free           TINYINT(1)        NOT NULL DEFAULT 1,
  is_deleted        TINYINT(1)        NOT NULL DEFAULT 0,

  -- Timestamps
  created_at        DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_slug         (slug),
  INDEX   idx_uploader        (uploaded_by),
  INDEX   idx_category        (category_id),
  INDEX   idx_is_published    (is_published),
  INDEX   idx_is_featured     (is_featured),
  INDEX   idx_author          (author),
  FULLTEXT KEY ft_search      (title, author, description),

  CONSTRAINT fk_book_uploader
    FOREIGN KEY (uploaded_by)  REFERENCES users(id)       ON DELETE CASCADE,
  CONSTRAINT fk_book_category
    FOREIGN KEY (category_id)  REFERENCES categories(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Downloadable books / e-library';

-- ── 2. book_tags ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS book_tags (
  book_id   INT UNSIGNED  NOT NULL,
  tag       VARCHAR(100)  NOT NULL,
  PRIMARY KEY (book_id, tag),
  INDEX idx_tag (tag),
  CONSTRAINT fk_btag_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. book_reviews ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS book_reviews (
  id         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  book_id    INT UNSIGNED     NOT NULL,
  user_id    INT UNSIGNED     NOT NULL,
  rating     TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
             ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_review (book_id, user_id),
  INDEX idx_book (book_id),
  INDEX idx_user (user_id),

  CONSTRAINT fk_breview_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  CONSTRAINT fk_breview_user FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. book_download_logs ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS book_download_logs (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  book_id       INT UNSIGNED  NOT NULL,
  user_id       INT UNSIGNED,
  ip_address    VARCHAR(45),
  downloaded_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_book (book_id),
  INDEX idx_user (user_id),

  CONSTRAINT fk_bdl_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. Triggers — rating ──────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_book_review_insert;
CREATE TRIGGER trg_book_review_insert AFTER INSERT ON book_reviews FOR EACH ROW
  UPDATE books SET
    rating       = (SELECT COALESCE(AVG(rating),0) FROM book_reviews WHERE book_id = NEW.book_id),
    review_count = (SELECT COUNT(*) FROM book_reviews WHERE book_id = NEW.book_id)
  WHERE id = NEW.book_id;

DROP TRIGGER IF EXISTS trg_book_review_update;
CREATE TRIGGER trg_book_review_update AFTER UPDATE ON book_reviews FOR EACH ROW
  UPDATE books SET
    rating       = (SELECT COALESCE(AVG(rating),0) FROM book_reviews WHERE book_id = NEW.book_id),
    review_count = (SELECT COUNT(*) FROM book_reviews WHERE book_id = NEW.book_id)
  WHERE id = NEW.book_id;

DROP TRIGGER IF EXISTS trg_book_review_delete;
CREATE TRIGGER trg_book_review_delete AFTER DELETE ON book_reviews FOR EACH ROW
  UPDATE books SET
    rating       = (SELECT COALESCE(AVG(rating),0) FROM book_reviews WHERE book_id = OLD.book_id),
    review_count = (SELECT COUNT(*) FROM book_reviews WHERE book_id = OLD.book_id)
  WHERE id = OLD.book_id;

SELECT 'Books migration applied successfully' AS status;
