# NagoWeb — Network Design Marketplace

A full-stack marketplace for buying and selling professional network design projects (Cisco Packet Tracer, GNS3, EVE-NG topologies, and more). Buyers browse, purchase, and securely download network designs. Sellers publish and monetize their work. Admins manage the platform end-to-end.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
- [User Roles](#user-roles)
- [Payment Flows](#payment-flows)
- [Email Notifications](#email-notifications)
- [File Downloads](#file-downloads)
- [Admin Panel](#admin-panel)
- [Scripts](#scripts)
- [Seed Accounts](#seed-accounts)
- [Troubleshooting](#troubleshooting)

---

## Overview

NagoWeb is a two-sided marketplace built for network engineers. Sellers upload topology files with preview images and metadata. Buyers pay via Stripe (card) or manual transfer (Telebirr / CBE Birr / Bank Transfer). After payment is confirmed, buyers receive time-limited, cryptographically secure download links.

**Live URLs (local development)**

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Health check | http://localhost:5000/health |
| Admin panel | http://localhost:5173/admin |

---

## Tech Stack

### Backend (`/server`)

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | MySQL 8.0 via `mysql2` |
| Authentication | JWT (access + refresh tokens) |
| Payments | Stripe Checkout + Manual (Telebirr / CBE Birr) |
| File uploads | Multer |
| Email | Nodemailer (SMTP) |
| Validation | express-validator |
| Security | Helmet, CORS, bcryptjs, express-rate-limit |
| Dev server | Nodemon |

### Frontend (`/client`)

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 8 |
| Routing | React Router DOM 7 |
| Styling | Tailwind CSS 4 |
| HTTP client | Native `fetch` (custom wrapper in `src/lib/api.js`) |
| State | React Context + useReducer |

### Database (`/database`)

| | |
|---|---|
| Engine | MySQL 8.0+ |
| Tables | 20 (including manual payment tables) |
| Views | 4 |
| Stored Procedures | 4 |
| Triggers | 6 |

---

## Project Structure

```
NagoWebPage/
│
├── client/                         # React frontend (Vite)
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── assets/                 # Static images
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Categories.jsx      # Category grid (links to /projects)
│   │   │   ├── FeaturedProjects.jsx# Featured projects (API-connected)
│   │   │   ├── Footer.jsx
│   │   │   ├── Hero.jsx            # Landing hero with search
│   │   │   ├── Navbar.jsx          # Top navigation bar
│   │   │   ├── Pricing.jsx         # Pricing section
│   │   │   ├── ProjectCard.jsx     # Project listing card (API + legacy)
│   │   │   ├── ProtectedRoute.jsx  # Auth guard component
│   │   │   └── SearchBar.jsx       # Search → navigates to /projects
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Auth state (login/logout/register)
│   │   ├── hooks/
│   │   │   └── useFormState.js     # Generic form state hook
│   │   ├── layouts/                # Layout wrappers
│   │   │   ├── AdminLayout.jsx     # Re-export of admin layout
│   │   │   ├── DashboardLayout.jsx # Re-export of dashboard layout
│   │   │   └── index.js
│   │   ├── lib/
│   │   │   └── api.js              # API client (fetch wrapper + all API helpers)
│   │   ├── pages/
│   │   │   ├── admin/              # Admin dashboard pages
│   │   │   │   ├── AdminLayout.jsx # Admin sidebar + shell
│   │   │   │   ├── AdminFiles.jsx
│   │   │   │   ├── AdminManualPayments.jsx
│   │   │   │   ├── AdminOrders.jsx
│   │   │   │   ├── AdminOverview.jsx
│   │   │   │   ├── AdminProjects.jsx
│   │   │   │   ├── AdminReviews.jsx
│   │   │   │   ├── AdminUpload.jsx
│   │   │   │   └── AdminUsers.jsx
│   │   │   ├── DashboardPage.jsx   # User dashboard (overview/projects/downloads/payments/profile)
│   │   │   ├── DashboardSections.jsx
│   │   │   ├── HomePage.jsx        # Public landing page
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ManualPaymentPage.jsx # Telebirr / CBE Birr payment flow
│   │   │   ├── ProjectsPage.jsx    # Advanced search & filter page
│   │   │   └── RegisterPage.jsx
│   │   ├── services/               # Service layer (re-exports from lib/api.js)
│   │   │   ├── api.js
│   │   │   └── index.js
│   │   ├── App.jsx                 # Router + route definitions
│   │   ├── App.css
│   │   ├── index.css               # Tailwind base styles
│   │   └── main.jsx                # React entry point
│   ├── .env                        # VITE_API_URL
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                         # Express API backend
│   ├── server.js                   # Entry point (loads src/app.js)
│   ├── src/
│   │   ├── app.js                  # Express app config, middleware, routes
│   │   ├── config/
│   │   │   ├── db.js               # MySQL connection pool
│   │   │   └── stripe.js           # Stripe client singleton
│   │   ├── controllers/            # Route handler functions
│   │   │   ├── admin.controller.js
│   │   │   ├── auth.controller.js
│   │   │   ├── downloads.controller.js
│   │   │   ├── manualPayments.controller.js
│   │   │   ├── payments.controller.js
│   │   │   ├── projects.controller.js
│   │   │   ├── uploads.controller.js
│   │   │   └── users.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT authenticate / authorize / optionalAuth
│   │   │   ├── errorHandler.js     # Global error handler + 404
│   │   │   ├── upload.js           # Multer config (avatars, projects, proofs)
│   │   │   └── validate.js         # express-validator result handler
│   │   ├── models/
│   │   │   └── index.js            # Model layer placeholder (raw SQL)
│   │   ├── routes/
│   │   │   ├── admin.routes.js
│   │   │   ├── auth.routes.js
│   │   │   ├── downloads.routes.js
│   │   │   ├── payments.routes.js
│   │   │   ├── projects.routes.js
│   │   │   └── users.routes.js
│   │   ├── services/
│   │   │   ├── emailService.js     # Nodemailer — 9 notification types
│   │   │   └── tokenService.js     # Secure download token generation
│   │   └── utils/
│   │       └── index.js            # Shared helpers (buildFileUrl, formatPrice, etc.)
│   ├── uploads/                    # Uploaded files (gitignored)
│   │   ├── avatars/
│   │   ├── payment_proofs/
│   │   └── projects/
│   ├── .env                        # Server environment variables
│   ├── .env.example                # Template for .env
│   └── package.json
│
├── database/
│   ├── schema.sql                  # Full schema (run first)
│   ├── manual_payments_migration.sql # Manual payment tables (run second)
│   ├── notifications_migration.sql # Notification preferences (run third)
│   ├── migrate.sql                 # Incremental migration reference
│   ├── reset.sql                   # ⚠️ Dev-only: drops and recreates DB
│   └── README.md
│
├── docs/                           # Documentation assets
├── screenshots/                    # UI screenshots
└── README.md                       # ← You are here
```

---

## Features

### Public
- Browse and search network design projects
- Advanced filtering by **category**, **difficulty**, **price range**, **vendor/technology**, **topology type**
- Sort by newest, most popular, highest rated, price
- URL-synced filters (shareable links)
- Project detail pages with reviews and ratings

### Buyers
- Register / login with JWT authentication
- Purchase projects via **Stripe** (card) or **manual transfer** (Telebirr, CBE Birr, Bank Transfer)
- Secure download links (SHA-256 hashed tokens, 24h TTL, 3 max uses)
- Download history and token management
- Wishlist
- Leave reviews (verified purchasers only)
- Dashboard: purchases, downloads, payment history, profile

### Sellers
- Publish network design projects with preview images, topology diagrams, and source files
- Set pricing, difficulty, vendor, topology type, and tags
- Receive 80% of each sale (20% platform fee)
- Track earnings and download counts

### Admins
- Full admin dashboard with analytics (revenue, users, top projects)
- User management (activate/deactivate, change roles)
- Project management (publish/unpublish, feature, delete)
- Order management and manual refunds
- File management (upload, update metadata, delete)
- Review moderation (hide/show)
- Manual payment verification (approve/reject Telebirr/CBE Birr screenshots)
- Configure payment account details (account numbers, instructions)

### Notifications (Email)
- Welcome email on registration
- Order confirmation after Stripe payment
- Payment proof received (manual payments)
- Payment approved / rejected
- Download link generated
- Password changed (security alert)
- Account activated / deactivated
- Project published (seller notification)

---

## Prerequisites

| Tool | Version | Download |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/ |
| npm | 9+ | Included with Node.js |

Verify your versions:
```bash
node -v    # v18.x.x or higher
mysql --version
npm -v
```

---

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd NagoWebPage
```

### 2. Set up the database

Start MySQL, then run the SQL files in order:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/manual_payments_migration.sql
mysql -u root -p < database/notifications_migration.sql
```

Verify:
```bash
mysql -u root -p nagoweb -e "SHOW TABLES;"
```

You should see ~20 tables.

### 3. Configure the server

```bash
cp server/.env.example server/.env
```

Open `server/.env` and update at minimum:

```env
DB_PASSWORD=your_mysql_root_password
JWT_SECRET=replace_with_a_long_random_string_min_32_chars
JWT_REFRESH_SECRET=replace_with_a_different_long_random_string
```

Everything else works out of the box for local development. Stripe and email are optional — the app runs without them.

### 4. Install dependencies

```bash
# Server
cd server && npm install

# Client (open a new terminal)
cd client && npm install
```

### 5. Start the development servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

Expected output:
```
✅  MySQL connected → localhost:3306/nagoweb
🚀  Server running on http://localhost:5000 [development]
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Expected output:
```
  VITE v8.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### 6. Open the app

Go to **http://localhost:5173**

### 7. Create an admin account

Register a normal account at `/register`, then promote it:

```sql
USE nagoweb;
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Then visit **http://localhost:5173/admin**

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | — | `development` | Environment mode |
| `PORT` | — | `5000` | Server port |
| `DB_HOST` | ✅ | `localhost` | MySQL host |
| `DB_PORT` | — | `3306` | MySQL port |
| `DB_USER` | ✅ | `root` | MySQL username |
| `DB_PASSWORD` | ✅ | — | MySQL password |
| `DB_NAME` | — | `nagoweb` | Database name |
| `JWT_SECRET` | ✅ | — | Access token signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | — | `7d` | Access token TTL |
| `JWT_REFRESH_SECRET` | ✅ | — | Refresh token signing secret |
| `JWT_REFRESH_EXPIRES_IN` | — | `30d` | Refresh token TTL |
| `STRIPE_SECRET_KEY` | optional | — | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | optional | — | Stripe webhook signing secret |
| `UPLOAD_DIR` | — | `uploads` | Directory for uploaded files |
| `MAX_FILE_SIZE_MB` | — | `50` | Max upload size in MB |
| `CLIENT_URL` | — | `http://localhost:5173` | Frontend URL (used in CORS + email links) |
| `EMAIL_HOST` | optional | — | SMTP host (leave blank for console preview mode) |
| `EMAIL_PORT` | optional | `587` | SMTP port |
| `EMAIL_SECURE` | optional | `false` | Use TLS (`true` for port 465) |
| `EMAIL_USER` | optional | — | SMTP username / sender address |
| `EMAIL_PASS` | optional | — | SMTP password or app password |
| `EMAIL_FROM_NAME` | optional | `NagoWeb` | Sender display name |
| `EMAIL_FROM_ADDR` | optional | `EMAIL_USER` | Sender email address |
| `DOWNLOAD_TOKEN_TTL_HOURS` | — | `24` | Download link expiry in hours |
| `DOWNLOAD_TOKEN_MAX_USES` | — | `3` | Max downloads per token |

### Client (`client/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Backend API base URL |

---

## Database

### Schema files (run in order)

| File | Description |
|---|---|
| `database/schema.sql` | Full schema — all tables, views, procedures, triggers, seed data |
| `database/manual_payments_migration.sql` | Adds Telebirr / CBE Birr payment tables |
| `database/notifications_migration.sql` | Adds notification preferences table |
| `database/reset.sql` | ⚠️ Dev-only — drops and recreates the entire database |

### Key tables

| Table | Description |
|---|---|
| `users` | Accounts (buyer / seller / admin) |
| `categories` | Project taxonomy (10 seeded) |
| `projects` | Network design listings |
| `project_tags` | Searchable tags per project |
| `project_files` | Versioned file attachments |
| `orders` | Payment sessions (Stripe + manual) |
| `order_items` | Line items with seller/platform fee split |
| `payment_proofs` | Manual payment screenshots |
| `download_keys` | Secure time-limited download tokens |
| `download_logs` | Audit trail of every download |
| `reviews` | Buyer ratings (1–5 stars, verified purchasers only) |
| `notification_preferences` | Per-user email opt-in/out settings |

### Platform fee split

Every sale is split automatically:
- **80%** → seller (`users.seller_balance`)
- **20%** → platform fee

---

## API Reference

Base URL: `http://localhost:5000`

All protected routes require: `Authorization: Bearer <access_token>`

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | — | Register new user, returns tokens |
| `POST` | `/login` | — | Login, returns tokens |
| `POST` | `/refresh` | — | Exchange refresh token for new access token |
| `POST` | `/logout` | ✅ | Revoke refresh token |
| `GET` | `/me` | ✅ | Get current user profile |
| `PUT` | `/change-password` | ✅ | Change password |

### Projects — `/api/projects`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | optional | List projects with filters, sort, pagination |
| `GET` | `/categories` | — | All categories with project counts |
| `GET` | `/filter-meta` | — | All filter options (vendors, price range, tags) |
| `GET` | `/search?q=` | optional | Full-text search |
| `GET` | `/:id` | optional | Project detail + reviews |
| `POST` | `/` | seller/admin | Create project (multipart/form-data) |
| `PUT` | `/:id` | seller/admin | Update project |
| `DELETE` | `/:id` | seller/admin | Soft-delete project |
| `POST` | `/:id/reviews` | buyer (purchased) | Submit a review |

**Project list query parameters:**

| Param | Type | Description |
|---|---|---|
| `q` | string | Full-text search |
| `category` | string | Category slug |
| `vendor` | string | Vendor name (e.g. `Cisco`) |
| `topology_type` | string | `star`, `mesh`, `ring`, `hierarchical`, `bus`, `hybrid`, `cloud`, `sdwan` |
| `difficulty` | string | `beginner`, `intermediate`, `advanced` |
| `price_min` | number | Minimum price |
| `price_max` | number | Maximum price |
| `rating_min` | number | Minimum average rating (0–5) |
| `is_featured` | boolean | `1` or `true` for featured only |
| `tags` | string | Comma-separated tag list |
| `sort` | string | `newest`, `oldest`, `price_asc`, `price_desc`, `rating`, `popular` |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 12, max: 100) |

### Payments — `/api/payments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/checkout` | ✅ | Create Stripe Checkout Session |
| `POST` | `/webhook` | Stripe sig | Stripe webhook (fulfills orders) |
| `GET` | `/orders` | ✅ | List user's orders |
| `GET` | `/orders/:orderId` | ✅ | Get order details |
| `GET` | `/manual/settings` | — | Get enabled manual payment methods |
| `POST` | `/manual/initiate` | ✅ | Create pending manual payment order |
| `POST` | `/manual/:orderId/proof` | ✅ | Upload payment screenshot |
| `GET` | `/manual/my-proofs` | ✅ | List user's manual payment submissions |

### Downloads — `/api/downloads`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/token/:projectId` | ✅ (purchased) | Request a download token |
| `GET` | `/file?token=` | — | Redeem token and stream file |
| `GET` | `/my-tokens` | ✅ | List user's download tokens |
| `GET` | `/history` | ✅ | Download audit history |
| `DELETE` | `/token/:tokenId` | ✅ | Revoke a token |

### Users — `/api/users`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/profile` | ✅ | Get profile + stats |
| `PUT` | `/profile` | ✅ | Update profile |
| `POST` | `/avatar` | ✅ | Upload avatar (multipart) |
| `GET` | `/wishlist` | ✅ | Get wishlist |
| `POST` | `/wishlist/:id` | ✅ | Add to wishlist |
| `DELETE` | `/wishlist/:id` | ✅ | Remove from wishlist |

### Admin — `/api/admin`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/analytics` | admin | Platform KPIs and charts |
| `GET` | `/users` | admin | List all users |
| `GET` | `/users/:id` | admin | User detail |
| `PATCH` | `/users/:id/status` | admin | Toggle active/inactive |
| `PATCH` | `/users/:id/role` | admin | Change role |
| `GET` | `/projects` | admin | All projects (including unpublished) |
| `PATCH` | `/projects/:id/publish` | admin | Toggle published |
| `PATCH` | `/projects/:id/feature` | admin | Toggle featured |
| `DELETE` | `/projects/:id` | admin | Hard-delete project |
| `GET` | `/orders` | admin | All orders |
| `PATCH` | `/orders/:id/refund` | admin | Mark order refunded |
| `GET` | `/files` | admin | All project files |
| `DELETE` | `/files/:projectId` | admin | Delete project file |
| `GET` | `/reviews` | admin | All reviews |
| `PATCH` | `/reviews/:id/hide` | admin | Toggle review visibility |
| `GET` | `/manual-payments` | admin | All manual payment proofs |
| `GET` | `/manual-payments/:id` | admin | Proof detail |
| `GET` | `/manual-payments/:id/screenshot` | admin | Stream screenshot securely |
| `PATCH` | `/manual-payments/:id/approve` | admin | Approve payment |
| `PATCH` | `/manual-payments/:id/reject` | admin | Reject payment |
| `GET` | `/manual-payments/settings` | admin | Get payment account settings |
| `PUT` | `/manual-payments/settings/:method` | admin | Update payment account settings |

---

## User Roles

| Role | Capabilities |
|---|---|
| `buyer` | Browse, search, purchase, download, review, wishlist |
| `seller` | All buyer capabilities + create / edit / delete own projects, view earnings |
| `admin` | All capabilities + manage all users, projects, orders, files, reviews, payments |

Roles are assigned in the `users.role` column. Promote a user via SQL or the admin panel.

---

## Payment Flows

### Stripe (Card)

```
1. Buyer clicks "Buy" → POST /api/payments/checkout
2. Redirected to Stripe Checkout page
3. Stripe sends webhook → POST /api/payments/webhook
4. Server marks order completed, issues download tokens
5. Buyer receives order confirmation email
6. Buyer goes to dashboard → requests download link
```

### Manual Payment (Telebirr / CBE Birr / Bank Transfer)

```
1. Buyer selects manual payment → POST /api/payments/manual/initiate
2. Buyer sees payment account details (account number, instructions)
3. Buyer makes transfer in their banking app
4. Buyer uploads screenshot → POST /api/payments/manual/:orderId/proof
5. Buyer receives "proof received" email
6. Admin reviews screenshot in admin panel
7. Admin approves → order completed, download tokens issued, approval email sent
   Admin rejects → rejection email sent with reason
```

---

## Email Notifications

Email is optional. If `EMAIL_HOST` is not set in `.env`, all emails are logged to the console instead of being sent (preview mode).

| Trigger | Recipient | Description |
|---|---|---|
| Registration | Buyer | Welcome email |
| Stripe payment | Buyer | Order confirmation |
| Manual proof uploaded | Buyer | Proof received, under review |
| Manual payment approved | Buyer | Payment approved, download ready |
| Manual payment rejected | Buyer | Rejection with reason |
| Download token generated | Buyer | Download link with expiry info |
| Password changed | User | Security alert |
| Account activated/deactivated | User | Account status change |
| Project published | Seller | Project is now live |

### Gmail setup (recommended for development)

1. Enable 2-factor authentication on your Google account
2. Generate an App Password: Google Account → Security → App Passwords
3. Add to `server/.env`:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your@gmail.com
   EMAIL_PASS=your_16_char_app_password
   ```

---

## File Downloads

Download tokens are cryptographically secure:

- **Raw token**: 32 random bytes encoded as base64url — sent to the client once
- **Stored hash**: SHA-256 of the raw token — stored in the database
- **TTL**: 24 hours (configurable via `DOWNLOAD_TOKEN_TTL_HOURS`)
- **Max uses**: 3 downloads per token (configurable via `DOWNLOAD_TOKEN_MAX_USES`)
- **Revocable**: tokens can be revoked by the owner or on refund

Even if the database is compromised, raw tokens cannot be recovered from the stored hashes.

### Static file access

| Path | Access |
|---|---|
| `/uploads/avatars/*` | Public |
| `/uploads/projects/previews/*` | Public |
| `/uploads/projects/diagrams/*` | Public |
| `/uploads/projects/source/*` | **Private** — only via `/api/downloads/file?token=` |
| `/uploads/payment_proofs/*` | **Private** — only via `/api/admin/manual-payments/:id/screenshot` |

---

## Admin Panel

Access at **http://localhost:5173/admin** (requires `admin` role).

| Section | Path | Description |
|---|---|---|
| Overview | `/admin` | KPIs, revenue chart, top projects, recent orders |
| Users | `/admin/users` | List, search, activate/deactivate, change roles |
| Projects | `/admin/projects` | Publish/unpublish, feature, delete |
| Orders | `/admin/orders` | View all orders, issue refunds |
| Files | `/admin/files` | Manage uploaded project files |
| Reviews | `/admin/reviews` | Moderate reviews (hide/show) |
| Upload | `/admin/upload` | Upload files to existing projects |
| Payments | `/admin/manual-payments` | Review and approve/reject manual payment screenshots |

---

## Scripts

### Server

```bash
cd server

npm run dev      # Start with nodemon (auto-restart on file changes)
npm start        # Start in production mode
npm test         # Run tests with Jest
npm run test:watch  # Run tests in watch mode
```

### Client

```bash
cd client

npm run dev      # Start Vite dev server (HMR)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

### Database

```bash
# Apply full schema (first time)
mysql -u root -p < database/schema.sql
mysql -u root -p < database/manual_payments_migration.sql
mysql -u root -p < database/notifications_migration.sql

# Reset database (⚠️ destroys all data)
mysql -u root -p < database/reset.sql

# Verify tables
mysql -u root -p nagoweb -e "SHOW TABLES;"
```

---

## Seed Accounts

The schema seeds three default accounts:

| Role | Email | Password |
|---|---|---|
| Admin | admin@nagoweb.com | `Admin@1234` |
| Seller | seller@nagoweb.com | `Seller@1234` |
| Buyer | buyer@nagoweb.com | `Buyer@1234` |

> **Change all passwords immediately** in any non-development environment.

---

## Troubleshooting

**MySQL connection refused**
```
❌  Failed to start server: connect ECONNREFUSED 127.0.0.1:3306
```
- Make sure MySQL is running:
  - Windows: `net start MySQL` or start via XAMPP/WAMP control panel
  - macOS: `brew services start mysql`
  - Linux: `sudo systemctl start mysql`
- Check `DB_PASSWORD` in `server/.env`

---

**Port already in use**
```
Error: listen EADDRINUSE :::5000
```
- Change the port: set `PORT=5001` in `server/.env` and `VITE_API_URL=http://localhost:5001` in `client/.env`

---

**`npm install` fails**
- Make sure you're on Node.js 18+: `node -v`
- Delete `node_modules` and `package-lock.json`, then retry:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

---

**Stripe webhook not working locally**
- Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:
  ```bash
  stripe listen --forward-to localhost:5000/api/payments/webhook
  ```
- Copy the printed webhook secret into `STRIPE_WEBHOOK_SECRET` in `server/.env`

---

**Emails not sending**
- If `EMAIL_HOST` is not set, emails are logged to the console — this is expected in development
- For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password
- Check spam folder for test emails

---

**File uploads not working**
- Make sure the `server/uploads/` directory exists and is writable
- The directory is created automatically on first upload, but you can create it manually:
  ```bash
  mkdir -p server/uploads/avatars server/uploads/projects server/uploads/payment_proofs
  ```

---

## License

ISC
