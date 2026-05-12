-- ================================================================
--  NagoWebPage — Incremental Migration Script
--  Run this AFTER the initial schema.sql has been applied.
--  Each migration block is idempotent (safe to re-run).
-- ================================================================

USE nagoweb;

-- ── Migration 001 — Add stripe_customer_id to users ──────────────
--  (Already in schema.sql — included here as migration reference)
-- ALTER TABLE users
--   ADD COLUMN stripe_customer_id VARCHAR(64) AFTER avatar_url;

-- ── Migration 002 — Add short_description to projects ────────────
--  (Already in schema.sql — included here as migration reference)
-- ALTER TABLE projects
--   ADD COLUMN short_description VARCHAR(500) AFTER description;

-- ── Migration 003 — Add project_files table ───────────────────────
--  (Already in schema.sql — included here as migration reference)
-- CREATE TABLE IF NOT EXISTS project_files ( ... );

-- ── Migration 004 — Add payments ledger table ─────────────────────
--  (Already in schema.sql — included here as migration reference)
-- CREATE TABLE IF NOT EXISTS payments ( ... );

-- ── Template for future migrations ───────────────────────────────
-- Migration NNN — Description
-- ALTER TABLE <table> ADD COLUMN <col> <type> AFTER <col>;
-- UPDATE schema_version SET version = 'NNN', applied_at = NOW();
