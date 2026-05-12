-- ================================================================
--  NagoWebPage — Database Reset Script
--  ⚠️  DESTRUCTIVE — drops and recreates the entire database.
--  Use only in development / CI environments.
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS nagoweb;

SET FOREIGN_KEY_CHECKS = 1;

-- Re-run the full schema
SOURCE schema.sql;
