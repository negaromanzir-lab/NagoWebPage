# NagoWebPage — Database

MySQL 8.0+ schema for the NagoWebPage network design marketplace.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | Full schema — tables, views, procedures, triggers, seed data |
| `migrate.sql` | Incremental migration reference for future changes |
| `reset.sql` | ⚠️ Dev-only — drops and recreates the database |

---

## Quick Start

```bash
# Create database and apply full schema
mysql -u root -p < database/schema.sql

# Verify tables were created
mysql -u root -p nagoweb -e "SHOW TABLES;"
```

---

## Schema Overview

### Tables (18)

```
users               — Accounts: buyer / seller / admin
refresh_tokens      — JWT refresh token store (one row per session)
password_resets     — One-time password-reset tokens
categories          — Project taxonomy (10 seeded)
projects            — Network design listings
project_tags        — Many-to-many tag labels
project_files       — Versioned file attachments per project
reviews             — Buyer ratings & comments (1–5 stars)
orders              — Stripe Checkout Sessions
order_items         — Line items inside an order
payments            — Immutable Stripe event ledger
download_keys       — Secure time-limited download tokens
download_logs       — Append-only download audit trail
wishlists           — Saved projects per user
coupons             — Discount codes (% or fixed)
coupon_usages       — Tracks coupon redemptions
seller_payouts      — Seller earnings & payout records
audit_logs          — Admin change history
```

### Views (4)

| View | Description |
|---|---|
| `v_published_projects` | Published projects with category and seller info |
| `v_order_summary` | Orders with buyer info and aggregated totals |
| `v_seller_stats` | Per-seller aggregated earnings and project stats |
| `v_download_key_status` | Active/expired/exhausted download key status |

### Stored Procedures (4)

| Procedure | Description |
|---|---|
| `sp_issue_download_key` | Verifies purchase and issues a download token |
| `sp_consume_download_key` | Validates token, increments use count, logs download |
| `sp_complete_order` | Atomically completes an order and credits seller balances |
| `sp_recalculate_project_rating` | Recomputes avg_rating and review_count |

### Triggers (6)

| Trigger | Event | Action |
|---|---|---|
| `trg_review_after_insert` | reviews INSERT | Recalculate project rating |
| `trg_review_after_update` | reviews UPDATE | Recalculate project rating |
| `trg_review_after_delete` | reviews DELETE | Recalculate project rating |
| `trg_wishlist_after_insert` | wishlists INSERT | Increment wishlist_count |
| `trg_wishlist_after_delete` | wishlists DELETE | Decrement wishlist_count |
| `trg_coupon_usage_after_insert` | coupon_usages INSERT | Increment coupon use_count |

---

## Entity Relationship Summary

```
users ──< refresh_tokens
users ──< password_resets
users ──< projects (as seller)
users ──< orders   (as buyer)
users ──< reviews
users ──< wishlists
users ──< seller_payouts
users ──< audit_logs

categories ──< projects

projects ──< project_tags
projects ──< project_files
projects ──< reviews
projects ──< order_items
projects ──< download_keys
projects ──< download_logs
projects ──< wishlists

orders ──< order_items
orders ──< payments
orders ──< download_keys
orders ──< coupon_usages

coupons ──< coupon_usages

download_keys ──< download_logs
project_files ──< download_keys
project_files ──< download_logs
```

---

## Seed Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@nagoweb.com | `Admin@1234` |
| Seller | seller@nagoweb.com | `Seller@1234` |
| Buyer | buyer@nagoweb.com | `Buyer@1234` |

> Change all passwords immediately in any non-development environment.

---

## Download Key Flow

```
1. Buyer completes checkout → order status = 'completed'
2. Buyer requests download → POST /api/downloads/:projectId
3. Server calls sp_issue_download_key()
   → Verifies order ownership
   → Inserts row in download_keys (expires in 24h, max 3 uses)
   → Returns token to client
4. Client uses token → GET /api/downloads/file?token=<raw_token>
5. Server calls sp_consume_download_key()
   → Validates token hash, expiry, use count
   → Increments use_count, logs to download_logs
   → Returns file_path for streaming
```

---

## Platform Fee

The `sp_complete_order` procedure accepts a `p_platform_fee_pct` parameter
(e.g. `20.00` for 20%). It splits each line item into:

- `seller_share = price × (1 - fee%)`
- `platform_fee = price × fee%`

And credits `users.seller_balance` accordingly.
