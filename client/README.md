# NagoWeb — React Frontend

React 19 + Vite frontend for the NagoWeb network design marketplace.

## Stack

| | |
|---|---|
| Framework | React 19 |
| Build tool | Vite 8 |
| Routing | React Router DOM 7 |
| Styling | Tailwind CSS 4 |
| HTTP client | Native `fetch` (custom wrapper) |
| State management | React Context + useReducer |

## Project Structure

```
src/
├── assets/             # Static images
├── components/         # Reusable UI components
│   ├── Categories.jsx  # Category grid → links to /projects with filter
│   ├── FeaturedProjects.jsx  # API-connected featured projects
│   ├── Footer.jsx
│   ├── Hero.jsx        # Landing hero with search bar
│   ├── Navbar.jsx      # Top nav with auth state
│   ├── Pricing.jsx
│   ├── ProjectCard.jsx # Project card (API data + legacy static mode)
│   ├── ProtectedRoute.jsx  # Auth + role guard
│   └── SearchBar.jsx   # Navigates to /projects?q=
├── context/
│   └── AuthContext.jsx # Auth state: login / logout / register / updateUser
├── hooks/
│   └── useFormState.js # Generic form state + validation hook
├── layouts/            # Layout wrappers (re-exports)
│   ├── AdminLayout.jsx
│   ├── DashboardLayout.jsx
│   └── index.js
├── lib/
│   └── api.js          # Fetch wrapper + all API helper functions
├── pages/
│   ├── admin/          # Admin dashboard pages
│   │   ├── AdminLayout.jsx
│   │   ├── AdminFiles.jsx
│   │   ├── AdminManualPayments.jsx
│   │   ├── AdminOrders.jsx
│   │   ├── AdminOverview.jsx
│   │   ├── AdminProjects.jsx
│   │   ├── AdminReviews.jsx
│   │   ├── AdminUpload.jsx
│   │   └── AdminUsers.jsx
│   ├── DashboardPage.jsx     # User dashboard (all sections)
│   ├── HomePage.jsx          # Public landing page
│   ├── LoginPage.jsx
│   ├── ManualPaymentPage.jsx # Telebirr / CBE Birr flow
│   ├── ProjectsPage.jsx      # Advanced search & filter
│   └── RegisterPage.jsx
├── services/           # Service layer (re-exports from lib/api.js)
│   ├── api.js
│   └── index.js
├── App.jsx             # Route definitions
├── index.css           # Tailwind base
└── main.jsx            # Entry point
```

## Routes

| Path | Component | Auth |
|---|---|---|
| `/` | `HomePage` | — |
| `/projects` | `ProjectsPage` | — |
| `/login` | `LoginPage` | — |
| `/register` | `RegisterPage` | — |
| `/pay` | `ManualPaymentPage` | — |
| `/dashboard` | `DashboardLayout` → `DashboardOverview` | ✅ |
| `/dashboard/projects` | `DashboardProjects` | ✅ |
| `/dashboard/downloads` | `DashboardDownloads` | ✅ |
| `/dashboard/payments` | `DashboardPayments` | ✅ |
| `/dashboard/profile` | `DashboardProfile` | ✅ |
| `/admin` | `AdminLayout` → `AdminOverview` | admin |
| `/admin/users` | `AdminUsers` | admin |
| `/admin/projects` | `AdminProjects` | admin |
| `/admin/orders` | `AdminOrders` | admin |
| `/admin/files` | `AdminFiles` | admin |
| `/admin/reviews` | `AdminReviews` | admin |
| `/admin/upload` | `AdminUpload` | admin |
| `/admin/manual-payments` | `AdminManualPayments` | admin |

## API Client (`src/lib/api.js`)

The API client wraps `fetch` with:
- Automatic `Authorization: Bearer <token>` header injection
- Silent token refresh on 401 (one retry)
- Forced logout on refresh failure
- Structured `ApiError` class with `status` and `errors` fields

**Available API helpers:**

```js
import { authApi, projectsApi, userApi, downloadApi, ordersApi, manualPaymentApi, adminApi } from './lib/api';

// Auth
authApi.login({ email, password })
authApi.register({ name, email, password })
authApi.logout(refreshToken)
authApi.me()
authApi.changePassword({ currentPassword, newPassword })

// Projects
projectsApi.list({ q, category, difficulty, price_min, price_max, vendor, topology_type, sort, page })
projectsApi.getFilterMeta()
projectsApi.search(q)
projectsApi.getOne(id)

// Downloads
downloadApi.requestToken(projectId)
downloadApi.listMyTokens()
downloadApi.getHistory()
downloadApi.revokeToken(tokenId)
downloadApi.fileUrl(token)  // returns full download URL

// Orders
ordersApi.listOrders()
ordersApi.getOrder(orderId)

// Manual payments
manualPaymentApi.getSettings()
manualPaymentApi.initiateOrder({ project_ids, payment_method })
manualPaymentApi.uploadProof(orderId, formData)
manualPaymentApi.listMyProofs()
```

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build
npm run lint     # ESLint
```

## Environment

```env
# client/.env
VITE_API_URL=http://localhost:5000
```
