# NagoWebPage - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Installation & Setup](#installation--setup)
4. [Features](#features)
5. [API Documentation](#api-documentation)
6. [Database Schema](#database-schema)
7. [File Structure](#file-structure)
8. [Configuration](#configuration)
9. [Development Workflow](#development-workflow)
10. [Deployment](#deployment)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Project Overview

### What is NagoWebPage?

NagoWebPage is a **full-stack network design marketplace platform** built with modern web technologies. It enables:

- **Sellers**: Upload and sell network design projects (Cisco, Juniper, etc.)
- **Buyers**: Purchase, download, and review network designs
- **Admins**: Manage users, projects, payments, and monitor platform activity

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19.2 + Vite + Tailwind CSS + React Router v7 |
| **Backend** | Node.js + Express 4.19 |
| **Database** | MySQL 8.0+ (InnoDB, utf8mb4) |
| **Authentication** | JWT (access + refresh tokens) |
| **Payments** | Stripe Checkout + Manual Payment Gateway |
| **File Storage** | Local filesystem (uploads/) |
| **Email** | Nodemailer (SMTP) |
| **Security** | Helmet, CORS, rate limiting, bcryptjs |

### Key Numbers
- **18 database tables** with proper relationships
- **6 database triggers** for automatic data updates
- **4 stored procedures** for complex operations
- **35+ API endpoints** across 6 route modules
- **8 backend controllers** handling business logic
- **20+ React components** for frontend UI
- **9 email templates** for notifications

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│  ├─ Pages (Home, Login, Dashboard, Admin, Projects)         │
│  ├─ Components (Navbar, Cards, Forms, Layouts)              │
│  ├─ Context (AuthContext for state management)              │
│  ├─ Services (API client with token refresh)                │
│  └─ CSS (Tailwind utilities)                                │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/REST (port 5173 dev, 5000 prod)
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                   SERVER (Express.js)                        │
│  ├─ Routes (auth, projects, payments, admin, etc.)          │
│  ├─ Controllers (business logic, API handlers)              │
│  ├─ Middleware (auth, validation, error handling)           │
│  ├─ Services (email, Stripe integration)                    │
│  ├─ Models (query layer, database access)                   │
│  └─ Config (database, security, environment)                │
└────────────────┬────────────────────────────────────────────┘
                 │ TCP/3306
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (MySQL 8.0+)                       │
│  ├─ Tables (users, projects, orders, payments, etc.)        │
│  ├─ Views (aggregated data for fast queries)                │
│  ├─ Triggers (maintain denormalized counts)                 │
│  └─ Stored Procedures (complex multi-step operations)       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Example: Purchase & Download

```
1. Buyer visits ProjectsPage
   ↓
2. Frontend calls GET /api/projects (filtered by category, price, rating)
   ↓
3. Server queries v_published_projects view
   ↓
4. Buyer adds project to order, clicks "Checkout"
   ↓
5. Frontend calls POST /api/payments/checkout
   ↓
6. Server creates Stripe Session, returns session_id
   ↓
7. Buyer completes payment in Stripe Checkout modal
   ↓
8. Stripe webhook (POST /api/payments/webhook) fires
   ↓
9. Server:
   - Marks order as 'completed'
   - Calls sp_issue_download_key() → generates secure token
   - Sends order confirmation email
   ↓
10. Buyer receives email with download link
   ↓
11. Buyer clicks link, server validates token (sp_consume_download_key)
    ↓
12. Server streams file to browser, increments download count
```

---

## Installation & Setup

### Prerequisites

- **Node.js 18+** (runtime)
- **npm 9+** (package manager)
- **MySQL 8.0+** (database)
- **Git** (version control)

### Local Development Setup

#### Step 1: Clone Repository
```bash
git clone <repository-url>
cd NagoWebPage
```

#### Step 2: Database Setup
```bash
# Create database and tables
mysql -u root -p < database/schema.sql

# Verify tables were created
mysql -u root -p nagoweb -e "SHOW TABLES;"
```

**Seed Accounts** (created by schema.sql):
| Email | Password | Role |
|-------|----------|------|
| admin@nagoweb.com | Admin@1234 | admin |
| seller@nagoweb.com | Seller@1234 | seller |
| buyer@nagoweb.com | Buyer@1234 | buyer |

#### Step 3: Backend Setup
```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
# Change JWT secrets, database credentials, API keys
nano .env

# Run development server
npm run dev
# Server starts on http://localhost:5000
```

#### Step 4: Frontend Setup
```bash
cd client

# Install dependencies
npm install

# Run development server
npm run dev
# Client starts on http://localhost:5173
```

#### Step 5: Verify Installation
- Open http://localhost:5173 in browser
- Click "Login" and use buyer@nagoweb.com / Buyer@1234
- Dashboard should load successfully
- Check browser console for any errors
- Check server logs for any warnings

---

## Features

### 1. User Authentication & Authorization

#### Features
- ✅ User registration with email validation
- ✅ Secure password hashing (bcryptjs)
- ✅ JWT authentication (access + refresh tokens)
- ✅ Automatic token refresh (silent re-auth)
- ✅ Password reset via email
- ✅ Role-based access control (buyer, seller, admin)
- ✅ Session management with refresh tokens

#### User Roles
- **Buyer**: Purchase projects, download files, leave reviews, manage wishlist
- **Seller**: Upload projects, manage files, view sales, receive payouts
- **Admin**: Manage all users, moderate content, process payments, view analytics

### 2. Project Marketplace

#### Seller Features
- Create new projects with description, images, category, tags
- Upload multiple file versions (PDF, ZIP, images)
- Edit project details and pricing
- View sales analytics and earnings
- Publish/unpublish projects

#### Buyer Features
- Browse projects with advanced filtering:
  - Category (Network Design, Security, Automation, etc.)
  - Price range (min-max slider)
  - Ratings (1-5 stars)
  - Search by name/description
- Sort by relevance, price, rating, date
- View detailed project information with seller profile
- Leave ratings and reviews (1-5 stars)
- Add/remove from wishlist

#### Admin Features
- List all projects with status
- Publish/unpublish projects
- Feature projects on homepage
- Delete projects
- Review project content moderation

### 3. Payment Processing

#### Stripe Integration
- **Checkout Sessions**: One-click payment via Stripe
- **Webhook Handling**: Automatic order completion on payment success
- **Order History**: Buyers view all purchases
- **Refunds**: Admin can refund orders (marks as refunded)

#### Manual Payment Gateway
- Alternative for non-Stripe regions (Telebirr, CBE Birr, Bank Transfer)
- Upload payment proof (screenshot)
- Admin review & verification
- Email notifications at each stage
- 80/20 split: seller gets 80%, platform gets 20%

### 4. Download Management

#### Secure Download Flow
- One-time download tokens (24-hour expiry)
- Maximum 3 downloads per token
- Secure token hashing in database
- Download audit trail (timestamp, IP, user)
- Email notification with download link

#### Download History
- Buyers view all downloads
- Audit trail for admin

### 5. Reviews & Ratings

#### Review System
- Buyers rate projects 1-5 stars with comments
- Average rating auto-calculated
- Admin can hide/show reviews
- Reviews display on project detail pages

### 6. File Management

#### Project Files
- Upload multiple file versions
- Version control (track changes over time)
- File metadata (size, type, upload date)
- Admin can delete specific files
- Download key restrictions per file

### 7. Admin Dashboard

#### Analytics
- Total users, sellers, buyers
- Revenue metrics (total, this month)
- Project count, active downloads
- Platform health indicators

#### User Management
- List all users with search/filter
- View user details (email, role, status)
- Activate/deactivate users
- Change user roles
- View user purchase/download history

#### Project Management
- List all projects
- Publish/unpublish
- Feature projects
- Delete projects
- Moderate content

#### Order Management
- View all orders
- Filter by status (pending, completed, refunded)
- View order details with items
- Refund orders
- Payment method breakdown (Stripe vs Manual)

#### Manual Payment Review
- List payment proofs awaiting review
- View screenshot verification
- Approve with automatic order completion
- Reject with admin note
- Email notifications sent automatically

#### Payment Settings
- Configure manual payment account details
- Set payment methods available
- Update payment instructions shown to buyers

---

## API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Buyer",
  "email": "buyer@example.com",
  "password": "SecurePass@123"
}
```

**Response (201)**:
```json
{
  "status": "success",
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 1,
      "email": "buyer@example.com",
      "name": "John Buyer",
      "role": "buyer"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "buyer@example.com",
  "password": "SecurePass@123"
}
```

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": { ... }
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGc..."
  }
}
```

#### Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "oldPassword": "OldPass@123",
  "newPassword": "NewPass@456"
}
```

### Projects

#### List Projects (with filtering)
```http
GET /api/projects?category=networking&minPrice=0&maxPrice=500&minRating=3&page=1&limit=20&search=OSPF&sort=rating
Authorization: Bearer <accessToken>
```

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "projects": [
      {
        "id": 1,
        "name": "OSPF Design Template",
        "description": "Complete OSPF network design",
        "category": "networking",
        "price": 99.99,
        "rating": 4.5,
        "reviewCount": 12,
        "seller": {
          "id": 5,
          "name": "Expert Seller",
          "email": "seller@example.com"
        },
        "tags": ["OSPF", "Enterprise", "High-Availability"],
        "isPublished": true,
        "isFeatured": true,
        "createdAt": "2024-05-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

#### Get Single Project
```http
GET /api/projects/:id
```

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "OSPF Design Template",
    "description": "...",
    "category": "networking",
    "price": 99.99,
    "rating": 4.5,
    "reviews": [
      {
        "id": 1,
        "rating": 5,
        "comment": "Excellent design",
        "buyer": "John Doe",
        "createdAt": "2024-05-15T10:00:00Z"
      }
    ],
    "files": [
      {
        "id": 1,
        "filename": "design.pdf",
        "fileSize": 2048000,
        "uploadedAt": "2024-05-01T10:00:00Z"
      }
    ],
    "seller": { ... }
  }
}
```

#### Create Project (Seller)
```http
POST /api/projects
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description",
  "category": "networking",
  "price": 150.00,
  "tags": ["BGP", "Enterprise"]
}
```

#### Update Project (Seller)
```http
PUT /api/projects/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Updated Name",
  "price": 199.99
}
```

#### Delete Project (Admin only)
```http
DELETE /api/projects/:id
Authorization: Bearer <adminToken>
```

### Orders & Payments

#### Create Stripe Checkout Session
```http
POST /api/payments/checkout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "projectIds": [1, 2, 3],
  "couponCode": "SAVE10" // optional
}
```

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "sessionId": "cs_test_...",
    "url": "https://checkout.stripe.com/pay/..."
  }
}
```

#### List User Orders
```http
GET /api/payments/orders
Authorization: Bearer <accessToken>
```

**Response (200)**:
```json
{
  "status": "success",
  "data": {
    "orders": [
      {
        "id": 1,
        "items": [
          {
            "projectId": 1,
            "projectName": "OSPF Design",
            "price": 99.99
          }
        ],
        "total": 99.99,
        "status": "completed",
        "paymentMethod": "stripe",
        "createdAt": "2024-05-15T10:00:00Z"
      }
    ]
  }
}
```

#### Manual Payment - Initiate
```http
POST /api/payments/manual/initiate
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "projectIds": [1, 2],
  "paymentMethod": "telebirr" // telebirr, cbe_birr, bank_transfer
}
```

**Response (201)**:
```json
{
  "status": "success",
  "data": {
    "orderId": 42,
    "total": 199.98,
    "paymentSettings": {
      "method": "telebirr",
      "accountNumber": "0987654321",
      "instructions": "Send payment to this number..."
    }
  }
}
```

#### Manual Payment - Upload Proof
```http
POST /api/payments/manual/:orderId/proof
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

{
  "screenshot": <file>,
  "senderName": "John Buyer",
  "senderPhone": "+251911234567",
  "transactionRef": "TXN123456",
  "amountPaid": 199.98
}
```

### Downloads

#### Request Download Token
```http
POST /api/downloads/token/:projectId
Authorization: Bearer <accessToken>
```

**Response (201)**:
```json
{
  "status": "success",
  "data": {
    "token": "sec_token_...",
    "expiresAt": "2024-05-16T10:00:00Z",
    "maxUses": 3,
    "downloadUrl": "/api/downloads/file?token=sec_token_..."
  }
}
```

#### Download File
```http
GET /api/downloads/file?token=sec_token_...
```

**Response (200)**: File binary stream

### Reviews

#### Create Review
```http
POST /api/projects/:projectId/reviews
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "rating": 5,
  "comment": "Excellent design, very detailed!"
}
```

#### Update Review
```http
PUT /api/projects/:projectId/reviews/:reviewId
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "rating": 4,
  "comment": "Updated comment"
}
```

#### Delete Review
```http
DELETE /api/projects/:projectId/reviews/:reviewId
Authorization: Bearer <accessToken>
```

### Admin Endpoints

#### List Users
```http
GET /api/admin/users?page=1&limit=20&search=john&role=buyer
Authorization: Bearer <adminToken>
```

#### Change User Role
```http
PATCH /api/admin/users/:userId/role
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "role": "seller"
}
```

#### List Orders
```http
GET /api/admin/orders?page=1&status=completed&paymentMethod=stripe
Authorization: Bearer <adminToken>
```

#### Refund Order
```http
PATCH /api/admin/orders/:orderId/refund
Authorization: Bearer <adminToken>
```

#### List Manual Payment Proofs
```http
GET /api/admin/manual-payments?status=pending&method=telebirr
Authorization: Bearer <adminToken>
```

#### Approve Manual Payment
```http
PATCH /api/admin/manual-payments/:proofId/approve
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "note": "Payment verified and confirmed"
}
```

#### Reject Manual Payment
```http
PATCH /api/admin/manual-payments/:proofId/reject
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "note": "Transaction reference not found in bank records"
}
```

---

## Database Schema

### Core Tables

#### Users
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('buyer', 'seller', 'admin') DEFAULT 'buyer',
  avatar_url VARCHAR(255),
  bio TEXT,
  seller_balance DECIMAL(12,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Projects
```sql
CREATE TABLE projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  seller_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description LONGTEXT,
  category_id INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  avg_rating DECIMAL(3,2) DEFAULT 0.00,
  review_count INT DEFAULT 0,
  wishlist_count INT DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX (seller_id, is_published),
  INDEX (price, avg_rating)
);
```

#### Orders
```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  stripe_session_id VARCHAR(255) UNIQUE,
  stripe_payment_intent VARCHAR(255),
  payment_method ENUM('stripe', 'telebirr', 'cbe_birr', 'bank_transfer'),
  total DECIMAL(12,2) NOT NULL,
  status ENUM('pending', 'completed', 'refunded', 'expired') DEFAULT 'pending',
  manual_status ENUM('none', 'screenshot_uploaded', 'under_review', 'approved', 'rejected'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX (user_id, status),
  INDEX (stripe_session_id),
  INDEX (created_at)
);
```

#### Project Files
```sql
CREATE TABLE project_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size_bytes INT,
  file_type VARCHAR(50),
  is_primary BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX (project_id)
);
```

#### Download Keys
```sql
CREATE TABLE download_keys (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  project_id INT NOT NULL,
  file_id INT,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  use_count INT DEFAULT 0,
  max_uses INT DEFAULT 3,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (file_id) REFERENCES project_files(id),
  INDEX (expires_at, use_count),
  INDEX (project_id)
);
```

#### Reviews
```sql
CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  buyer_id INT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  UNIQUE KEY (project_id, buyer_id),
  INDEX (rating)
);
```

#### Payment Proofs (Manual Payments)
```sql
CREATE TABLE payment_proofs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  payment_method VARCHAR(50),
  sender_name VARCHAR(100),
  sender_phone VARCHAR(20),
  transaction_ref VARCHAR(100),
  amount_paid DECIMAL(12,2),
  screenshot_path VARCHAR(255),
  screenshot_name VARCHAR(255),
  file_size_bytes INT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by INT,
  reviewed_at TIMESTAMP NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  INDEX (status, submitted_at),
  INDEX (user_id, submitted_at)
);
```

### Views

#### v_published_projects
Shows all published projects with seller and category info, used for public browsing.

#### v_order_summary
Aggregates orders with buyer info and itemized totals, used for order history.

#### v_seller_stats
Per-seller earnings, project count, average ratings - used for seller analytics.

#### v_download_key_status
Shows download key validity status (active/expired/exhausted).

### Stored Procedures

#### sp_issue_download_key()
Verifies buyer owns the order, creates a download token with 24h expiry and 3 uses.

#### sp_consume_download_key()
Validates token, increments use counter, logs download, prevents re-use after limit.

#### sp_complete_order()
Atomically marks order completed, issues download keys, credits seller balance.

#### sp_recalculate_project_rating()
Recalculates avg_rating and review_count for a project (called on review change).

---

## File Structure

```
NagoWebPage/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── Categories.jsx
│   │   │   ├── FeaturedProjects.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── ProjectCard.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── Pricing.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/                   # Page components
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ProjectsPage.jsx
│   │   │   ├── ManualPaymentPage.jsx
│   │   │   ├── DashboardPage.jsx    # Main dashboard with sub-sections
│   │   │   └── admin/               # Admin pages
│   │   │       ├── AdminLayout.jsx
│   │   │       ├── AdminOverview.jsx
│   │   │       ├── AdminUsers.jsx
│   │   │       ├── AdminProjects.jsx
│   │   │       ├── AdminOrders.jsx
│   │   │       ├── AdminFiles.jsx
│   │   │       ├── AdminReviews.jsx
│   │   │       ├── AdminUpload.jsx
│   │   │       └── AdminManualPayments.jsx
│   │   ├── layouts/                 # Layout wrappers
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── DashboardLayout.jsx
│   │   │   └── index.js
│   │   ├── context/                 # State management
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/                   # Custom hooks
│   │   │   └── useFormState.js
│   │   ├── lib/                     # Utilities
│   │   │   └── api.js               # API client with token refresh
│   │   ├── services/                # Service layer
│   │   │   ├── api.js
│   │   │   └── index.js
│   │   ├── App.jsx                  # Main app with routing
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Global styles
│   ├── public/                      # Static assets
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── package.json
│   ├── vite.config.js               # Vite configuration
│   ├── eslint.config.js
│   └── index.html
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── controllers/             # Request handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── admin.controller.js
│   │   │   ├── projects.controller.js
│   │   │   ├── payments.controller.js
│   │   │   ├── manualPayments.controller.js
│   │   │   ├── downloads.controller.js
│   │   │   ├── uploads.controller.js
│   │   │   └── users.controller.js
│   │   ├── routes/                  # API endpoints
│   │   │   ├── auth.routes.js
│   │   │   ├── projects.routes.js
│   │   │   ├── payments.routes.js
│   │   │   ├── downloads.routes.js
│   │   │   ├── users.routes.js
│   │   │   └── admin.routes.js
│   │   ├── middleware/              # Custom middleware
│   │   │   ├── auth.js              # JWT verification
│   │   │   ├── validate.js          # Request validation
│   │   │   ├── upload.js            # Multer file upload
│   │   │   └── errorHandler.js      # Error handling
│   │   ├── models/                  # Database queries
│   │   │   └── index.js
│   │   ├── services/                # Business logic services
│   │   │   ├── emailService.js      # Email templates & sending
│   │   │   └── tokenService.js      # JWT utilities
│   │   ├── config/                  # Configuration
│   │   │   ├── db.js                # MySQL connection pool
│   │   │   └── stripe.js            # Stripe SDK setup
│   │   ├── utils/                   # Helper functions
│   │   │   └── index.js
│   │   └── app.js                   # Express app setup
│   ├── uploads/                     # User-uploaded files
│   │   ├── projects/                # Project files
│   │   ├── avatars/                 # User avatars
│   │   └── payment_proofs/          # Manual payment screenshots
│   ├── server.js                    # Entry point
│   ├── .env.example                 # Environment template
│   ├── package.json
│   └── jest.config.js               # Test configuration
│
├── database/                        # Database files
│   ├── schema.sql                   # Full database schema
│   ├── migrate.sql                  # Migration reference
│   ├── reset.sql                    # Development reset script
│   ├── manual_payments_migration.sql # Manual payment schema
│   ├── notifications_migration.sql   # Notifications schema
│   └── README.md                    # Database documentation
│
├── docs/                            # Documentation
│   ├── SETUP.md                     # Installation guide
│   ├── API.md                       # API reference
│   ├── DATABASE.md                  # Database schema details
│   ├── STRIPE_SETUP.md              # Stripe configuration
│   ├── MANUAL_PAYMENTS.md           # Manual payment workflow
│   ├── EMAIL_CONFIG.md              # Email setup guide
│   ├── DEPLOYMENT.md                # Deployment guide
│   └── TROUBLESHOOTING.md           # Common issues & fixes
│
├── .github/                         # GitHub configuration
│   └── workflows/                   # CI/CD pipelines
│       ├── test.yml
│       └── build.yml
│
├── .gitignore
├── README.md                        # Project overview
├── DOCUMENTATION.md                 # This file
└── LICENSE
```

---

## Configuration

### Environment Variables

#### Server (.env)

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nagoweb

# JWT
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=30d

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# File Storage
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=50

# Client URL
CLIENT_URL=http://localhost:5173

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM_NAME=NagoWeb
EMAIL_FROM_ADDR=noreply@nagoweb.com

# Download Settings
DOWNLOAD_TOKEN_TTL_HOURS=24
DOWNLOAD_TOKEN_MAX_USES=3
```

#### Client (.env.local - Vite)

```env
VITE_API_URL=http://localhost:5000
```

### Security Best Practices

1. **Never commit .env file** - Add to .gitignore
2. **Change all default secrets** - JWT secrets, database password
3. **Use environment-specific configs** - .env.development, .env.production
4. **Enable HTTPS in production** - Update CLIENT_URL, STRIPE_WEBHOOK_SECRET
5. **Rotate API keys regularly** - Stripe, email service
6. **Use strong passwords** - MySQL root, email app password

---

## Development Workflow

### Running the Application

#### Terminal 1: Database
```bash
# Ensure MySQL is running
# macOS: brew services start mysql
# Linux: sudo systemctl start mysql
# Windows: mysql.exe (in background)

# Verify connection
mysql -u root -p -e "SELECT 1"
```

#### Terminal 2: Backend
```bash
cd server
npm install      # First time only
npm run dev      # Start with hot-reload
```

Watch for log output:
```
✅ MySQL connected → localhost:3306/nagoweb
Express server running on port 5000
```

#### Terminal 3: Frontend
```bash
cd client
npm install      # First time only
npm run dev      # Start with hot-reload
```

Watch for:
```
VITE v8.0.10 ready in 234 ms
➜  Local: http://localhost:5173/
```

#### Browser
Open http://localhost:5173 and test login with:
- Email: buyer@nagoweb.com
- Password: Buyer@1234

### Code Organization Rules

**Controllers**: Handle HTTP requests, delegate to services/models
```javascript
// ✅ Good
exports.listProjects = async (req, res, next) => {
  try {
    const projects = await Project.list(req.query);
    res.json({ status: 'success', data: { projects } });
  } catch (error) {
    next(error);
  }
};

// ❌ Bad - business logic in controller
const projects = await db.query("SELECT ...");
```

**Models**: Direct database queries
```javascript
// ✅ Good
async function list(filters) {
  return db.query(
    "SELECT * FROM v_published_projects WHERE ...",
    [filters]
  );
}

// ❌ Bad - ORM/abstraction
Project.find().filter().populate()...
```

**Services**: Email, Stripe, external APIs
```javascript
// ✅ Good - stateless email service
exports.sendOrderConfirmation = async (order) => {
  const html = template('orderConfirmation', { order });
  return transporter.sendMail({ to, subject, html });
};
```

**Middleware**: Cross-cutting concerns
```javascript
// ✅ Good - thin, focused middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  // ...
};
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/user-signup

# Make changes...
git add server/src/controllers/auth.controller.js
git commit -m "feat: add email verification to signup"

# Push and create PR
git push origin feature/user-signup
```

**Commit Message Format**:
```
feat: add feature description
fix: fix bug description
docs: update documentation
test: add/update tests
refactor: code improvement
chore: maintenance
```

---

## Deployment

### Heroku Deployment

```bash
# Create Heroku app
heroku create nagoweb-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=<production-secret>
heroku config:set DB_HOST=<heroku-mysql-host>
# ... add all env vars

# Deploy
git push heroku main

# Monitor
heroku logs --tail
```

### Docker Deployment

```bash
# Build image
docker build -t nagoweb:latest .

# Run container
docker run -d \
  -p 5000:5000 \
  -e DB_HOST=mysql \
  -e NODE_ENV=production \
  --name nagoweb-app \
  nagoweb:latest
```

### AWS EC2 Deployment

```bash
# SSH into instance
ssh -i key.pem ec2-user@your-instance.compute.amazonaws.com

# Install dependencies
sudo yum install nodejs mysql-server nginx

# Clone repo, install packages
git clone <repo>
cd NagoWebPage/server
npm install --production

# Start with PM2
npm install -g pm2
pm2 start server.js --name "nagoweb-api"
pm2 startup
pm2 save

# Configure Nginx reverse proxy
sudo vi /etc/nginx/conf.d/nagoweb.conf
# upstream app { server 127.0.0.1:5000; }
# server { listen 80; proxy_pass http://app; }

sudo systemctl restart nginx
```

---

## Testing

### Running Tests

```bash
# Server tests
cd server
npm test                  # Run all tests with coverage
npm run test:watch       # Watch mode for development

# Client tests
cd client
npm test                 # Run all tests
npm run test:ui         # Interactive UI
npm run test:coverage   # Coverage report
```

### Test Coverage Targets

- **Server**: 80% line coverage for critical paths
- **Client**: 70% component coverage
- **Focus areas**: Auth, payments, file handling

---

## Troubleshooting

### Common Issues

#### 1. "Error: connect ECONNREFUSED 127.0.0.1:3306"
**Problem**: MySQL not running
**Solution**:
```bash
# macOS
brew services start mysql

# Linux
sudo systemctl start mysql

# Windows
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --datadir="C:\ProgramData\MySQL\MySQL Server 8.0\Data"
```

#### 2. "EADDRINUSE: address already in use :::5000"
**Problem**: Port 5000 already in use
**Solution**:
```bash
# Find and kill process
lsof -i :5000
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

#### 3. "ER_NO_REFERENCED_ROW_2"
**Problem**: Foreign key constraint violation
**Solution**: Check that referenced records exist in parent table
```bash
mysql> SELECT * FROM categories; # Must not be empty
```

#### 4. "jwt malformed"
**Problem**: Token not sent correctly
**Solution**: Ensure Authorization header format is "Bearer TOKEN"
```javascript
// ✅ Correct
fetch('/api/projects', {
  headers: { 'Authorization': 'Bearer ' + token }
});
```

#### 5. "Maximum call stack size exceeded"
**Problem**: Infinite redirect loop in auth
**Solution**: Check token expiry and refresh logic, clear localStorage
```javascript
localStorage.removeItem('nw_access_token');
localStorage.removeItem('nw_refresh_token');
```

### Debugging Tips

1. **Backend**:
```bash
# Enable verbose logging
DEBUG=* npm run dev

# Check database
mysql> SELECT * FROM users WHERE email = 'test@example.com';

# Verify JWT
https://jwt.io  # Paste token to inspect
```

2. **Frontend**:
```javascript
// In browser console
localStorage.getItem('nw_access_token')
// Use Network tab to inspect requests
```

3. **Database Queries**:
```bash
# Log all queries
SET GLOBAL general_log = 'ON';
tail -f /var/log/mysql/mysql.log
```

---

## Support & Contributing

- **Issues**: GitHub Issues (description, steps to reproduce, environment)
- **Pull Requests**: Follow Git workflow above
- **Documentation**: Keep README.md and DOCUMENTATION.md in sync

---

**Last Updated**: May 2024
**Maintained By**: NagoWeb Team
**License**: ISC
