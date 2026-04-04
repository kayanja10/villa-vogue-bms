# Villa Vogue BMS — Web Platform v2.0

**Where Fashion Finds a Home** · Full-Stack Business Management System

---

## 🚀 What's Included

| Layer | Technology |
|---|---|
| Frontend Dashboard | React 18 + Vite + Tailwind CSS + Zustand |
| Customer E-Store | Same React app at `/store` route, SSR-ready |
| Backend API | Node.js 20 + Express + Socket.io |
| Database | PostgreSQL + Prisma ORM |
| Authentication | JWT + Refresh Tokens + **Email 2FA for Admin** |
| Payments | MTN MoMo · Airtel Money · Stripe |
| Real-time | Socket.io (live stock, orders, payments) |
| File Uploads | Cloudinary |
| Email | Gmail SMTP (nodemailer) |
| Deployment | Docker / Render (API) / Vercel (Frontend) |

---

## ✨ Features

### Admin Dashboard
- Live KPIs — today's sales, orders, profit, expenses
- 7-day sales chart with area graph
- Top products by units sold
- Low stock alerts (real-time)
- Pending orders indicator

### Point of Sale (POS)
- Product grid with image, stock, price
- Category filter tabs
- Customer search & attach to sale
- Discount code validation
- Cart with quantity controls
- Payment: Cash / MTN MoMo / Airtel / Card
- Mobile money prompt with phone number
- Order receipt on completion

### Inventory Management
- Full product CRUD (name, SKU, barcode, images, variants)
- Category management
- Stock adjustment (in/out/set)
- Profit margin display per product
- Low stock threshold alerts
- Stock movement history
- Dead stock report
- Inventory valuation

### Orders
- All orders with search & filter
- Order detail with items, payment, customer
- Void order (restores stock)
- Export to Excel/PDF

### Customers
- Full customer profiles
- Loyalty points system (1 point per UGX 1,000)
- Customer tiers: Bronze → Silver → Gold → Platinum
- Birthday tracking
- Purchase history
- Customer debts management
- Customer portal (self-service login)

### Finance
- Expense tracking by category
- Cash float (open/close daily)
- Customer debt recording & payments
- Income vs Expense chart
- Cash flow statement
- Layaway management (deposits, payments)

### Procurement
- Supplier management
- Purchase orders (create, receive, track)
- Supplier transaction history
- Physical stock count & reconciliation

### Staff
- Clock in / Clock out
- Shift history
- Sales performance per staff member
- Sales targets setting

### Reports & Analytics
- Daily sales report
- Monthly summary
- Staff performance
- Category performance
- Hourly sales heatmap
- Profit margins report
- Dead stock report

### Security
- **Admin login requires email OTP (sent to kayanjawilfred@gmail.com)**
- Account lockout after 5 failed attempts (30 min)
- OTP expires in 10 minutes
- Resend code with 60-second cooldown
- Activity audit log
- Role-based access control (Admin / Manager / Staff)

### Customer E-Store (`/store`)
- Product browsing with search & category filter
- Featured products hero section
- "Add to Cart" with hover animation
- Wishlist (heart) toggle
- Customer account (register/login)
- Loyalty points display

### Payments
- **MTN Mobile Money** (Uganda) — real API integration
- **Airtel Money** (Uganda) — real API integration
- **Stripe** — card payments with webhook verification
- Real-time payment confirmation via Socket.io

---

## 📁 Project Structure

```
villavogue-bms/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Full PostgreSQL schema
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js            # Login + 2FA OTP
│   │   │   ├── products.js        # Full product CRUD
│   │   │   ├── orders.js          # Order management
│   │   │   ├── customers.js       # Customer management
│   │   │   ├── payments.js        # MTN/Airtel/Stripe
│   │   │   ├── analytics.js       # Dashboard + reports
│   │   │   ├── users.js           # User management
│   │   │   └── allRoutes.js       # All other routes
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT + role guards
│   │   ├── services/
│   │   │   └── emailService.js    # OTP emails (Gmail)
│   │   ├── sockets/
│   │   │   └── socketHandler.js   # Real-time events
│   │   ├── utils/
│   │   │   └── seed.js            # DB seed data
│   │   └── server.js              # Express + Socket.io
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/
│   │   │       └── Layout.jsx     # Sidebar + topbar
│   │   ├── hooks/
│   │   │   └── useSocket.js       # Socket.io real-time
│   │   ├── lib/
│   │   │   └── api.js             # Axios + all API calls
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Login + 2FA OTP UI
│   │   │   ├── Dashboard.jsx      # Live dashboard
│   │   │   ├── POS.jsx            # Full POS system
│   │   │   ├── index.jsx          # All other pages
│   │   │   └── customer/
│   │   │       └── CustomerPortal.jsx  # E-store
│   │   ├── store/
│   │   │   └── useStore.js        # Zustand global state
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css              # Design system CSS
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vercel.json
│   └── package.json
│
├── docker-compose.yml             # Full stack Docker
├── render.yaml                    # Render.com config
└── package.json                   # Root monorepo scripts
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or Docker)
- Gmail App Password (for 2FA emails)

### 1. Clone and install

```bash
git clone <your-repo>
cd villavogue-bms
npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/villavogue_bms"
JWT_SECRET="generate-a-random-64-char-string-here"
JWT_REFRESH_SECRET="another-random-64-char-string-here"
EMAIL_USER="kayanjawilfred@gmail.com"
EMAIL_PASS="your-gmail-app-password"   # See step below
```

### 3. Get Gmail App Password (for 2FA)

1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords → Generate
4. Select "Mail" → Copy the 16-char password
5. Paste into `EMAIL_PASS` in your `.env`

### 4. Set up database

```bash
cd backend
npx prisma migrate dev --name init
npm run db:seed
```

### 5. Configure frontend environment

```bash
cp frontend/.env.example frontend/.env
# Edit to point to your backend
```

### 6. Start development servers

```bash
# From root directory
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Customer Store: http://localhost:3000/store

### Default Login Credentials

| Role | Username | Password | 2FA Required |
|------|----------|----------|--------------|
| Admin | `admin` | `VillaVogue@2024!` | ✅ Email OTP |
| Manager | `manager` | `Manager@2024!` | ❌ |
| Staff | `staff1` | `Staff@2024!` | ❌ |

**Admin 2FA**: Code sent to `kayanjawilfred@gmail.com`

---

## 🐳 Docker Deployment

```bash
# Copy and fill environment file
cp backend/.env.example .env

# Start all services
docker-compose up -d

# Run migrations + seed
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend node src/utils/seed.js

# View logs
docker-compose logs -f
```

Services started:
- PostgreSQL on port 5432
- Backend API on port 5000
- Frontend on port 3000
- Nginx reverse proxy on port 80

---

## ☁️ Cloud Deployment (Recommended)

### Backend → Render.com

1. Create account at render.com
2. New → Web Service → Connect GitHub repo
3. Set root directory: `backend`
4. Build: `npm install && npx prisma generate && npx prisma migrate deploy`
5. Start: `node src/server.js`
6. Add PostgreSQL database in Render
7. Set all environment variables from `.env.example`
8. Deploy!

### Frontend → Vercel

1. Create account at vercel.com
2. Import GitHub repo → Set root to `frontend`
3. Framework: Vite
4. Add environment variables:
   ```
   VITE_API_URL = https://your-render-backend.onrender.com/api
   VITE_SOCKET_URL = https://your-render-backend.onrender.com
   ```
5. Deploy!

---

## 💳 Payment Setup

### MTN Mobile Money (Uganda)
1. Register at: https://momodeveloper.mtn.com
2. Create sandbox credentials
3. Add to backend `.env`:
   ```
   MTN_MOMO_SUBSCRIPTION_KEY=xxx
   MTN_MOMO_API_USER=xxx
   MTN_MOMO_API_KEY=xxx
   ```

### Airtel Money (Uganda)
1. Register at: https://developers.airtel.africa
2. Create app credentials
3. Add to backend `.env`:
   ```
   AIRTEL_CLIENT_ID=xxx
   AIRTEL_CLIENT_SECRET=xxx
   ```

### Stripe (International Cards)
1. Create account at stripe.com
2. Get API keys from Dashboard → Developers
3. Add to backend `.env`:
   ```
   STRIPE_SECRET_KEY=sk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

---

## 📱 Mobile Access

The web app is fully responsive and works on:
- Android phones & tablets
- iPhones & iPads
- Any modern browser

The POS works great on tablets (recommended for in-store use).

---

## 🔒 Security Features

| Feature | Details |
|---|---|
| Admin 2FA | 6-digit OTP via email, 10min expiry |
| Password hashing | bcrypt (12 rounds) |
| JWT | Access token (15min) + Refresh token (7 days) |
| Account lockout | 5 failed attempts → 30min lock |
| Rate limiting | 10 auth requests/15min, 300 API/15min |
| Role-based access | Admin / Manager / Staff |
| Audit log | All actions tracked with user + timestamp |
| SQL injection | Prisma ORM parameterised queries |
| XSS | Helmet.js security headers |

---

## 📊 API Reference

Base URL: `https://your-api.onrender.com/api`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/auth/login` | POST | No | Login (returns 2FA flag for admin) |
| `/auth/verify-2fa` | POST | No | Verify OTP code |
| `/auth/refresh` | POST | No | Refresh JWT token |
| `/products` | GET | Yes | List products |
| `/products/public` | GET | No | Public product listing (store) |
| `/orders` | GET/POST | Yes | Orders CRUD |
| `/analytics/dashboard` | GET | Yes | Dashboard stats |
| `/payments/initiate` | POST | Yes | Mobile money payment |
| `/customers/portal/login` | POST | No | Customer store login |

Full API docs available at: `http://localhost:5000/api/health`

---

## 🛠 Extending the System

### Adding a new page
1. Create component in `frontend/src/pages/`
2. Add route in `App.jsx`
3. Add nav link in `Layout.jsx`

### Adding a new API endpoint
1. Add route handler in `backend/src/routes/`
2. Register in `server.js`
3. Add API call in `frontend/src/lib/api.js`

### Adding a new database table
1. Add model to `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name your_migration`
3. Regenerate client: `npx prisma generate`

---

## 📞 Support

**Villa Vogue Fashions**
- Email: villavoguef@gmail.com
- Phone: +256 782 860372 / +256 745 903189
- Location: Kampala, Uganda
- Admin email (2FA): kayanjawilfred@gmail.com

---

*Built for Villa Vogue Fashions — Production-grade, mobile-first, East Africa-ready.*
