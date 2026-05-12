# NagoWebPage — Express API Server

Node.js + Express backend for the NagoWebPage network design marketplace.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | MySQL 8 via `mysql2` |
| Auth | JWT (access + refresh tokens) |
| Payments | Stripe Checkout |
| File uploads | Multer |
| Validation | express-validator |
| Security | Helmet, CORS, express-rate-limit, bcryptjs |

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials, JWT secrets, and Stripe keys
```

### 3. Initialize the database
```bash
mysql -u root -p < ../database/schema.sql
```

### 4. Start the server
```bash
npm run dev      # development (nodemon)
npm start        # production
```

Server runs on **http://localhost:5000** by default.

---

## API Reference

### Auth  `/api/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Register a new user |
| POST | `/login` | — | Login, returns JWT + refresh token |
| POST | `/refresh` | — | Exchange refresh token for new access token |
| POST | `/logout` | ✅ | Revoke refresh token |
| GET | `/me` | ✅ | Get current user profile |
| PUT | `/change-password` | ✅ | Change password |

### Projects  `/api/projects`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | optional | List projects (filter, sort, paginate) |
| GET | `/categories` | — | List all categories |
| GET | `/search?q=` | optional | Full-text search |
| GET | `/:id` | optional | Get project details + reviews |
| POST | `/` | seller/admin | Create project (multipart/form-data) |
| PUT | `/:id` | seller/admin | Update project |
| DELETE | `/:id` | seller/admin | Soft-delete project |
| POST | `/:id/reviews` | buyer (purchased) | Add a review |

### Payments  `/api/payments`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/checkout` | ✅ | Create Stripe Checkout Session |
| POST | `/webhook` | Stripe sig | Stripe webhook (fulfills orders) |
| GET | `/orders` | ✅ | List user's orders |
| GET | `/orders/:id` | ✅ | Get order details |

### Downloads  `/api/downloads`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:projectId` | ✅ (purchased) | Secure file download |
| GET | `/history` | ✅ | Download history |

### Users  `/api/users`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/profile` | ✅ | Get profile + stats |
| PUT | `/profile` | ✅ | Update profile |
| POST | `/avatar` | ✅ | Upload avatar |
| GET | `/wishlist` | ✅ | Get wishlist |
| POST | `/wishlist/:id` | ✅ | Add to wishlist |
| DELETE | `/wishlist/:id` | ✅ | Remove from wishlist |
| GET | `/` | admin | List all users |
| PATCH | `/:id/role` | admin | Change user role |

---

## Project Upload (multipart/form-data)

```
POST /api/projects
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
  title            string (required)
  description      string (required)
  category_id      integer (required)
  vendor           string (required)
  price            number >= 0 (required)
  topology_type    star|mesh|ring|hierarchical|bus|hybrid|cloud|sdwan
  difficulty       beginner|intermediate|advanced
  tags[]           string array (optional)
  preview_image    file (image)
  project_file     file (zip, pkt, gns3, yml, pdf)
```

---

## Stripe Webhook Setup

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Forward events to your local server:
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```
3. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET` in `.env`

---

## Roles

| Role | Permissions |
|------|-------------|
| `buyer` | Browse, purchase, download, review, wishlist |
| `seller` | All buyer permissions + create/edit/delete own projects |
| `admin` | All permissions + manage users and any project |

---

## Security Notes

- Passwords hashed with bcrypt (cost factor 12)
- JWT access tokens expire in 7 days; refresh tokens in 30 days
- Refresh tokens stored in DB and can be revoked on logout / password change
- Project source files are **never** served statically — only via authenticated `/api/downloads/:id`
- Rate limiting: 300 req/15 min globally, 10 req/15 min on auth endpoints, 50 downloads/hour
- Helmet sets secure HTTP headers on all responses
- Input validated with express-validator on every route
