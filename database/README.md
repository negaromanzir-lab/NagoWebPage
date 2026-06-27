# NagoWebPage — Database

This project uses **PostgreSQL** hosted on [Neon](https://neon.tech) (free tier).  
All MySQL files are kept for reference. Use the `neon_*.sql` files for deployment.

---

## File Reference

| File | Purpose | Use? |
|---|---|---|
| `neon_postgres_schema.sql` | ✅ **Full schema** — all 30 tables at once | **Run this first (recommended)** |
| `neon_migrate.sql` | ✅ Incremental migrations (idempotent) | Run after schema |
| `neon_reset.sql` | ✅ Drop all tables (dev only) | Dev / CI reset |
| `neon_books_migration.sql` | ✅ Books tables only (if adding separately) | Optional |
| `neon_courses_migration.sql` | ✅ Courses tables only (if adding separately) | Optional |
| `neon_manual_payments_migration.sql` | ✅ Manual payments tables only (if adding separately) | Optional |
| `neon_notifications_migration.sql` | ✅ Notification preferences only (if adding separately) | Optional |
| `schema.sql` | 🗄️ Original MySQL schema (reference only) | Do not use |
| `migrate.sql` | 🗄️ Original MySQL migrations (reference only) | Do not use |
| `books_migration.sql` | 🗄️ MySQL books (reference only) | Do not use |
| `courses_migration.sql` | 🗄️ MySQL courses (reference only) | Do not use |
| `manual_payments_migration.sql` | 🗄️ MySQL manual payments (reference only) | Do not use |
| `notifications_migration.sql` | 🗄️ MySQL notifications (reference only) | Do not use |
| `reset.sql` | 🗄️ MySQL reset script (reference only) | Do not use |

---

## First-Time Setup (Neon)

### 1. Create a Neon project
1. Go to [neon.tech](https://neon.tech) → Sign up free
2. Create a new project → name it `nagoweb`
3. Go to **Dashboard → Connection Details** → copy the connection string:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/nagoweb?sslmode=require
   ```

### 2. Run the schema
1. In Neon dashboard → click **SQL Editor**
2. Open `neon_postgres_schema.sql`, copy the entire contents
3. Paste into the SQL Editor → click **Run**
4. You should see:
   ```
   NagoWebPage PostgreSQL schema created successfully
   ```

### 3. Configure the server
In `server/.env`, set:
```env
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/nagoweb?sslmode=require
```

---

## Reset (Development Only)

To wipe and recreate the database:
1. Run `neon_reset.sql` in Neon SQL Editor
2. Run `neon_postgres_schema.sql` again

---

## Tables Overview

| # | Table | Description |
|---|---|---|
| 01 | `users` | Accounts (buyer / seller / admin) |
| 02 | `refresh_tokens` | JWT refresh token store |
| 03 | `password_resets` | One-time reset tokens |
| 04 | `categories` | Project/book taxonomy |
| 05 | `projects` | Network design listings |
| 06 | `project_tags` | Many-to-many tags |
| 07 | `project_files` | Versioned file attachments |
| 08 | `reviews` | Buyer ratings & comments |
| 09 | `orders` | Payment sessions (Stripe + manual) |
| 10 | `order_items` | Line items inside an order |
| 11 | `payments` | Stripe event ledger |
| 12 | `download_keys` | Secure time-limited download tokens |
| 13 | `download_logs` | Audit trail of every download |
| 14 | `wishlists` | Saved projects per user |
| 15 | `coupons` | Discount codes |
| 16 | `coupon_usages` | Coupon usage tracking |
| 17 | `seller_payouts` | Seller earnings & payout records |
| 18 | `audit_logs` | Admin-level change history |
| 19 | `books` | E-library / downloadable books |
| 20 | `book_tags` | Tags for books |
| 21 | `book_reviews` | Book ratings & comments |
| 22 | `book_download_logs` | Book download audit trail |
| 23 | `courses` | Online courses |
| 24 | `course_modules` | Course sections |
| 25 | `course_lessons` | Individual lessons |
| 26 | `course_enrollments` | Student enrollments |
| 27 | `course_reviews` | Course ratings |
| 28 | `payment_proofs` | Manual payment screenshots |
| 29 | `manual_payment_settings` | Telebirr / CBE Birr config |
| 30 | `notification_preferences` | Per-user email opt-in settings |

---

## MySQL → PostgreSQL Key Differences

| MySQL | PostgreSQL |
|---|---|
| `INT UNSIGNED AUTO_INCREMENT` | `SERIAL` |
| `TINYINT(1)` | `BOOLEAN` |
| `?` placeholders | `$1, $2, $3` |
| `GROUP_CONCAT(x SEPARATOR ',')` | `STRING_AGG(x, ',')` |
| `DATE_SUB(NOW(), INTERVAL 30 DAY)` | `NOW() - INTERVAL '30 days'` |
| `CURDATE()` | `CURRENT_DATE` |
| `INSERT ... VALUES ?` (bulk) | Individual inserts or `unnest()` |
| `ON DUPLICATE KEY UPDATE` | `ON CONFLICT DO UPDATE SET` |
| `INSERT IGNORE` | `ON CONFLICT DO NOTHING` |
| `LIKE` (case-sensitive) | `ILIKE` (case-insensitive) |
| `result.insertId` | `RETURNING id` |
| `affectedRows` | `result.length` after `RETURNING` |
| `ENGINE=InnoDB CHARSET=utf8mb4` | Not needed |
| `FULLTEXT INDEX` | `GIN` index with `tsvector` |
