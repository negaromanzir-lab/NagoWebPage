Full Stractures of the Projects.

NagoWebPage/
├── client/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Categories.jsx
│   │   │   ├── FeaturedProjects.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Pricing.jsx
│   │   │   ├── ProjectCard.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── SearchBar.jsx
│   │   ├── pages/               # Route-level page components
│   │   │   ├── admin/
│   │   │   │   ├── AdminLayout.jsx
│   │   │   │   ├── AdminFiles.jsx
│   │   │   │   ├── AdminManualPayments.jsx
│   │   │   │   ├── AdminOrders.jsx
│   │   │   │   ├── AdminOverview.jsx
│   │   │   │   ├── AdminProjects.jsx
│   │   │   │   ├── AdminReviews.jsx
│   │   │   │   ├── AdminUpload.jsx
│   │   │   │   └── AdminUsers.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ManualPaymentPage.jsx
│   │   │   ├── ProjectsPage.jsx
│   │   │   └── RegisterPage.jsx
│   │   ├── layouts/             # ✅ NEW — layout wrappers
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── DashboardLayout.jsx
│   │   │   └── index.js
│   │   ├── services/            # ✅ NEW — external communication layer
│   │   │   ├── api.js
│   │   │   └── index.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   └── useFormState.js
│   │   ├── lib/
│   │   │   └── api.js           # canonical API client
│   │   └── App.jsx
│   ├── index.html
│   └── package.json
├── server/
│   ├── server.js                # ✅ NEW — entry point
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── models/              # ✅ NEW — model/query layer
│   │   │   └── index.js
│   │   ├── config/
│   │   ├── services/
│   │   │   ├── emailService.js
│   │   │   └── tokenService.js
│   │   ├── utils/               # ✅ NEW — shared helpers
│   │   │   └── index.js
│   │   └── app.js
│   ├── uploads/
│   └── package.json             # main → server.js
├── database/
└── README.md
