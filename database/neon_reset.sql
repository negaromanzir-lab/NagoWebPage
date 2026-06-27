-- ================================================================
--  NagoWebPage — PostgreSQL Reset Script (Neon-compatible)
--  ⚠️  DESTRUCTIVE — drops ALL tables and recreates them.
--  Use only in development. Run in Neon SQL Editor.
-- ================================================================

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS notification_preferences    CASCADE;
DROP TABLE IF EXISTS manual_payment_settings     CASCADE;
DROP TABLE IF EXISTS payment_proofs              CASCADE;
DROP TABLE IF EXISTS book_download_logs          CASCADE;
DROP TABLE IF EXISTS book_reviews                CASCADE;
DROP TABLE IF EXISTS book_tags                   CASCADE;
DROP TABLE IF EXISTS books                       CASCADE;
DROP TABLE IF EXISTS course_enrollments          CASCADE;
DROP TABLE IF EXISTS course_reviews              CASCADE;
DROP TABLE IF EXISTS course_lessons              CASCADE;
DROP TABLE IF EXISTS course_modules              CASCADE;
DROP TABLE IF EXISTS courses                     CASCADE;
DROP TABLE IF EXISTS audit_logs                  CASCADE;
DROP TABLE IF EXISTS seller_payouts              CASCADE;
DROP TABLE IF EXISTS coupon_usages               CASCADE;
DROP TABLE IF EXISTS coupons                     CASCADE;
DROP TABLE IF EXISTS wishlists                   CASCADE;
DROP TABLE IF EXISTS download_logs               CASCADE;
DROP TABLE IF EXISTS download_keys               CASCADE;
DROP TABLE IF EXISTS payments                    CASCADE;
DROP TABLE IF EXISTS order_items                 CASCADE;
DROP TABLE IF EXISTS orders                      CASCADE;
DROP TABLE IF EXISTS reviews                     CASCADE;
DROP TABLE IF EXISTS project_files               CASCADE;
DROP TABLE IF EXISTS project_tags                CASCADE;
DROP TABLE IF EXISTS projects                    CASCADE;
DROP TABLE IF EXISTS categories                  CASCADE;
DROP TABLE IF EXISTS password_resets             CASCADE;
DROP TABLE IF EXISTS refresh_tokens              CASCADE;
DROP TABLE IF EXISTS users                       CASCADE;

-- Drop helper function
DROP FUNCTION IF EXISTS set_updated_at()         CASCADE;
DROP FUNCTION IF EXISTS sync_book_rating()       CASCADE;
DROP FUNCTION IF EXISTS sync_course_rating()     CASCADE;
DROP FUNCTION IF EXISTS sync_course_students()   CASCADE;

-- Drop extension (optional — only if you want a full clean slate)
-- DROP EXTENSION IF EXISTS "pgcrypto";

SELECT 'All tables dropped successfully. Now run neon_postgres_schema.sql to recreate.' AS status;
