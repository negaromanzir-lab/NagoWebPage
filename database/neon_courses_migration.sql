-- ================================================================
--  NagoWebPage — Courses Migration (PostgreSQL / Neon)
--  Adds the full courses / e-learning feature.
--  Run AFTER neon_postgres_schema.sql if you need to add courses
--  tables separately to an existing database.
--  Each statement is idempotent (safe to re-run).
-- ================================================================

-- ── 1. courses ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS courses (
  id                SERIAL PRIMARY KEY,
  instructor_id     INTEGER         NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  category_id       INTEGER         REFERENCES categories(id)           ON DELETE SET NULL,
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

-- auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. course_modules ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_modules (
  id              SERIAL PRIMARY KEY,
  course_id       INTEGER         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title           VARCHAR(200)    NOT NULL,
  description     TEXT,
  order_position  SMALLINT        NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cmod_course ON course_modules(course_id);

-- ── 3. course_lessons ─────────────────────────────────────────────────────────

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

-- ── 4. course_enrollments ─────────────────────────────────────────────────────

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

-- ── 5. course_reviews ─────────────────────────────────────────────────────────

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

DROP TRIGGER IF EXISTS trg_course_reviews_updated_at ON course_reviews;
CREATE TRIGGER trg_course_reviews_updated_at
  BEFORE UPDATE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. Trigger — sync course rating on review insert/update/delete ────────────

CREATE OR REPLACE FUNCTION sync_course_rating() RETURNS TRIGGER AS $$
DECLARE cid INTEGER;
BEGIN
  cid := COALESCE(NEW.course_id, OLD.course_id);
  UPDATE courses SET
    rating       = (SELECT COALESCE(AVG(rating), 0) FROM course_reviews WHERE course_id = cid),
    review_count = (SELECT COUNT(*)                 FROM course_reviews WHERE course_id = cid)
  WHERE id = cid;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crev_insert ON course_reviews;
DROP TRIGGER IF EXISTS trg_crev_update ON course_reviews;
DROP TRIGGER IF EXISTS trg_crev_delete ON course_reviews;

CREATE TRIGGER trg_crev_insert AFTER INSERT ON course_reviews FOR EACH ROW EXECUTE FUNCTION sync_course_rating();
CREATE TRIGGER trg_crev_update AFTER UPDATE ON course_reviews FOR EACH ROW EXECUTE FUNCTION sync_course_rating();
CREATE TRIGGER trg_crev_delete AFTER DELETE ON course_reviews FOR EACH ROW EXECUTE FUNCTION sync_course_rating();

-- ── 7. Trigger — sync student_count on enrollment insert/delete ───────────────

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

DROP TRIGGER IF EXISTS trg_enroll_insert ON course_enrollments;
DROP TRIGGER IF EXISTS trg_enroll_delete ON course_enrollments;

CREATE TRIGGER trg_enroll_insert AFTER INSERT ON course_enrollments FOR EACH ROW EXECUTE FUNCTION sync_course_students();
CREATE TRIGGER trg_enroll_delete AFTER DELETE ON course_enrollments FOR EACH ROW EXECUTE FUNCTION sync_course_students();

SELECT 'Courses migration applied successfully' AS status;
