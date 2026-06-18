-- ================================================================
--  NagoWebPage — Courses Migration
--  Adds the full courses / e-learning feature.
--  Run AFTER schema.sql, manual_payments_migration.sql,
--  and notifications_migration.sql have been applied.
-- ================================================================

USE nagoweb;

-- ── 1. courses ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS courses (
  id                INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  instructor_id     INT UNSIGNED      NOT NULL
                    COMMENT 'FK → users.id (seller or admin)',
  category_id       INT UNSIGNED
                    COMMENT 'FK → categories.id (optional)',

  -- Identity
  title             VARCHAR(200)      NOT NULL,
  slug              VARCHAR(220)      NOT NULL UNIQUE,
  description       VARCHAR(1000),
  short_description VARCHAR(300),
  long_description  TEXT,

  -- Media
  image_url         VARCHAR(500)
                    COMMENT 'Relative path: /uploads/courses/<filename>',

  -- Pricing
  price             DECIMAL(10,2)     NOT NULL DEFAULT 0.00,
  original_price    DECIMAL(10,2)     COMMENT 'Pre-discount price',

  -- Metadata
  difficulty        ENUM('beginner','intermediate','advanced')
                    NOT NULL DEFAULT 'beginner',
  duration_hours    DECIMAL(5,1)      COMMENT 'Total estimated hours',
  language          VARCHAR(50)       DEFAULT 'English',

  -- Metrics (denormalised)
  student_count     INT UNSIGNED      NOT NULL DEFAULT 0,
  rating            DECIMAL(3,2)      NOT NULL DEFAULT 0.00,
  review_count      INT UNSIGNED      NOT NULL DEFAULT 0,

  -- State
  is_published      TINYINT(1)        NOT NULL DEFAULT 0,
  is_featured       TINYINT(1)        NOT NULL DEFAULT 0,
  is_deleted        TINYINT(1)        NOT NULL DEFAULT 0,

  -- Timestamps
  created_at        DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_slug           (slug),
  INDEX   idx_instructor        (instructor_id),
  INDEX   idx_category          (category_id),
  INDEX   idx_is_published      (is_published),
  INDEX   idx_is_featured       (is_featured),
  INDEX   idx_difficulty        (difficulty),

  CONSTRAINT fk_course_instructor
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_course_category
    FOREIGN KEY (category_id)   REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Online courses offered on the platform';

-- ── 2. course_modules ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_modules (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  course_id       INT UNSIGNED    NOT NULL,
  title           VARCHAR(200)    NOT NULL,
  description     TEXT,
  order_position  SMALLINT        NOT NULL DEFAULT 0,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_course (course_id),
  CONSTRAINT fk_module_course
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Modules (sections) within a course';

-- ── 3. course_lessons ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_lessons (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  module_id       INT UNSIGNED    NOT NULL,
  title           VARCHAR(200)    NOT NULL,
  content         TEXT            COMMENT 'Lesson body / description',
  video_url       VARCHAR(500),
  duration_mins   SMALLINT UNSIGNED,
  order_position  SMALLINT        NOT NULL DEFAULT 0,
  is_free_preview TINYINT(1)      NOT NULL DEFAULT 0,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_module (module_id),
  CONSTRAINT fk_lesson_module
    FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Individual lessons inside a course module';

-- ── 4. course_enrollments ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_enrollments (
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  course_id    INT UNSIGNED    NOT NULL,
  user_id      INT UNSIGNED    NOT NULL,
  enrolled_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,

  PRIMARY KEY (id),
  UNIQUE KEY uq_enrollment (course_id, user_id),
  INDEX idx_user   (user_id),
  INDEX idx_course (course_id),

  CONSTRAINT fk_enrollment_course
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_enrollment_user
    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tracks which users are enrolled in which courses';

-- ── 5. course_reviews ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_reviews (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  course_id   INT UNSIGNED    NOT NULL,
  user_id     INT UNSIGNED    NOT NULL,
  rating      TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_review (course_id, user_id),
  INDEX idx_course (course_id),
  INDEX idx_user   (user_id),

  CONSTRAINT fk_review_course
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_user
    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Student reviews and ratings for courses';

-- ── 6. Trigger — recalculate course rating on review insert/update/delete ────

DROP TRIGGER IF EXISTS trg_course_review_after_insert;
CREATE TRIGGER trg_course_review_after_insert
AFTER INSERT ON course_reviews
FOR EACH ROW
  UPDATE courses
  SET rating       = (SELECT COALESCE(AVG(rating),0) FROM course_reviews WHERE course_id = NEW.course_id),
      review_count = (SELECT COUNT(*)                FROM course_reviews WHERE course_id = NEW.course_id)
  WHERE id = NEW.course_id;

DROP TRIGGER IF EXISTS trg_course_review_after_update;
CREATE TRIGGER trg_course_review_after_update
AFTER UPDATE ON course_reviews
FOR EACH ROW
  UPDATE courses
  SET rating       = (SELECT COALESCE(AVG(rating),0) FROM course_reviews WHERE course_id = NEW.course_id),
      review_count = (SELECT COUNT(*)                FROM course_reviews WHERE course_id = NEW.course_id)
  WHERE id = NEW.course_id;

DROP TRIGGER IF EXISTS trg_course_review_after_delete;
CREATE TRIGGER trg_course_review_after_delete
AFTER DELETE ON course_reviews
FOR EACH ROW
  UPDATE courses
  SET rating       = (SELECT COALESCE(AVG(rating),0) FROM course_reviews WHERE course_id = OLD.course_id),
      review_count = (SELECT COUNT(*)                FROM course_reviews WHERE course_id = OLD.course_id)
  WHERE id = OLD.course_id;

-- ── 7. Trigger — increment student_count on enrollment ───────────────────────

DROP TRIGGER IF EXISTS trg_enrollment_after_insert;
CREATE TRIGGER trg_enrollment_after_insert
AFTER INSERT ON course_enrollments
FOR EACH ROW
  UPDATE courses
  SET student_count = student_count + 1
  WHERE id = NEW.course_id;

DROP TRIGGER IF EXISTS trg_enrollment_after_delete;
CREATE TRIGGER trg_enrollment_after_delete
AFTER DELETE ON course_enrollments
FOR EACH ROW
  UPDATE courses
  SET student_count = GREATEST(student_count - 1, 0)
  WHERE id = OLD.course_id;

-- ── Done ──────────────────────────────────────────────────────────────────────
SELECT 'Courses migration applied successfully' AS status;
