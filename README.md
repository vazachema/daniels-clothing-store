# Daniel Store — Full-Stack E-Commerce Platform

A production-grade clothing e-commerce platform built from scratch with a modern, scalable architecture. This project covers the full software development lifecycle: system design, database modeling, REST API development, authentication, payment processing, and a server-side rendered storefront.
- Full-stack: Next.js 14 frontend, Node.js + Fastify backend, PostgreSQL + Redis
- Features: Authentication (JWT + refresh rotation), Cart, Orders, Stripe payments, Admin panel
- Status: Backend complete, frontend in progress

---

**Role:** Solo developer — designed and implemented the backend, building system architecture, database schema, and APIs independently.
**Tech Stack Highlights:** TypeScript, Node.js, Fastify, Next.js, PostgreSQL, Redis, Stripe, Zod, Tailwind CSS

---

## Overview

Daniel Store is a real-world e-commerce application for a clothing retailer, designed with scalability and professional engineering standards in mind. It handles the full purchase flow — from product browsing to order confirmation — including secure authentication, inventory management, and payment processing via Stripe.

The project is structured as a **monorepo** with a clear separation between frontend and backend, following the same architectural patterns used in production systems.

---

## Architecture

```
daniel-store/
├── frontend/          # Next.js 14 — SSR/SSG storefront
└── backend/           # Node.js + Fastify — REST API
```

```
Browser / Mobile
      │
      ▼
Next.js Frontend (Vercel)
  ├── SSG pages: home, product catalog
  ├── ISR pages: product detail
  └── SSR pages: cart, checkout, account
      │
      │ REST API (HTTPS)
      ▼
Fastify Backend (Railway)
  ├── Auth (JWT + Refresh Token rotation)
  ├── Products, Categories, Inventory
  ├── Cart (anonymous + authenticated + merge)
  ├── Orders & Stripe PaymentIntents
  └── Webhook processor
      │
      ▼
PostgreSQL (Railway)         Redis (Upstash)
  └── Persistent data           └── Cache + Sessions
      │
      ▼
External Services
  ├── Stripe   — Payment processing
  ├── Resend   — Transactional email
  └── Cloudinary — Image storage & CDN
```

---

## Tech Stack

### Backend
| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js 20 | Performance, ecosystem |
| Framework | Fastify | Faster than Express, schema-first |
| Language | TypeScript | Type safety across the codebase |
| ORM | Prisma | Type-safe DB access, migrations |
| Database | PostgreSQL | ACID transactions (critical for orders) |
| Cache | Redis (Upstash) | Session storage, cart caching |
| Auth | JWT + bcrypt | Stateless, secure, industry standard |
| Payments | Stripe | PCI-compliant, webhook-driven |
| Email | Resend + Nodemailer | Order confirmation, password reset |
| Validation | Zod | Runtime type validation on all inputs |

### Frontend
| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, SEO, Image optimization |
| Language | TypeScript | End-to-end type safety |
| Styling | Tailwind CSS | Utility-first, consistent design |
| State | Zustand | Lightweight, no boilerplate |
| HTTP | Axios | Interceptors for token refresh |
| Forms | React Hook Form + Zod | Performant, validated forms |
| Payments | Stripe.js + React Stripe | PCI-compliant card UI |

### Infrastructure
| Service | Use |
|---|---|
| Vercel | Frontend hosting + edge CDN |
| Railway | Backend + PostgreSQL hosting |
| Cloudinary | Product image storage and transformation |
| Cloudflare | DNS + DDoS protection |

---

## Key Features

### Authentication System
- JWT-based auth with **Access Token / Refresh Token rotation**
- Access Tokens live in memory (XSS-resistant), Refresh Tokens in `httpOnly` cookies (CSRF-resistant)
- Refresh tokens stored in DB — full session invalidation on logout or password change
- Secure password reset via single-use time-limited tokens sent by email
- Role-based access control (`USER` / `ADMIN`)

### Product Catalog
- Products with multiple variants (size × color matrix)
- Per-variant SKU and stock tracking
- Slug-based URLs for SEO
- Full-text search across name and description
- Cursor-based pagination

### Cart System
- **Anonymous cart** — identified by a `sessionId` cookie, persists 7 days
- **Authenticated cart** — linked to `userId`, never expires
- **Cart merge** — on login, anonymous cart items are merged into the user's cart
- Real-time stock validation on every add/update operation

### Payment Flow (Stripe)
- `PaymentIntent` created server-side with the order total (never trusting frontend prices)
- `clientSecret` passed to the frontend for Stripe Elements rendering
- **Webhook-driven confirmation** — order status updated only after Stripe's `payment_intent.succeeded` event
- Atomic transaction on confirmation: order status, stock decrement, cart clear — all or nothing
- Price snapshot on `OrderItem` — historical orders are immutable even if product prices change

### Security
- All inputs validated with Zod before touching the database
- Passwords hashed with bcrypt (cost factor 12)
- SQL injection impossible — Prisma uses parameterized queries exclusively
- Rate limiting on auth endpoints
- Webhook signature verification on every Stripe event
- Environment secrets never committed — `.env` gitignored from day one
- HTTPS enforced in production; `secure` and `sameSite` flags on all cookies

---

## Database Schema

The data model is designed for correctness and scalability:

```
User ──────────┬── RefreshToken (many)
               ├── PasswordResetToken (many)
               ├── Cart (one)
               ├── Order (many)
               └── Address (many)

Product ───────┬── ProductVariant (many)   [size × color, unique SKU, stock]
               ├── ProductImage (many)
               └── Category

Cart ──────────└── CartItem (many) ──── ProductVariant

Order ─────────└── OrderItem (many)    [price snapshot, immutable]
```

Key decisions:
- **PostgreSQL** over MongoDB — ACID transactions are non-negotiable for inventory and payments
- **`OrderItem` snapshots** — `snapshotName`, `snapshotSize`, `snapshotColor`, `unitPrice` are recorded at purchase time so historical orders are never affected by future product changes
- **Prisma transactions** (`$transaction`) used for any multi-table write to guarantee consistency

---

## API Endpoints

```
Auth
  POST   /auth/register
  POST   /auth/login
  POST   /auth/refresh
  POST   /auth/logout
  POST   /auth/forgot-password
  POST   /auth/reset-password

Products
  GET    /products              (public, paginated, filterable)
  GET    /products/:slug        (public)
  POST   /products              (admin only)
  PATCH  /products/:id          (admin only)

Categories
  GET    /categories
  POST   /categories            (admin only)

Cart
  GET    /cart
  POST   /cart/items
  PATCH  /cart/items/:id
  DELETE /cart/items/:id
  DELETE /cart
  POST   /cart/merge            (authenticated — merges anonymous cart on login)

Orders
  POST   /orders                (authenticated)
  GET    /orders                (authenticated — own orders)
  GET    /orders/:id            (authenticated — own order)
  POST   /orders/webhook        (Stripe — signature-verified)

Users
  GET    /users/me              (authenticated)
  PATCH  /users/me              (authenticated)
```

---

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Single source of truth for the data model
└── src/
    ├── index.ts               # Server bootstrap, plugin registration
    ├── lib/
    │   ├── db.ts              # Prisma singleton
    │   ├── jwt.ts             # Token creation and verification
    │   ├── stripe.ts          # Stripe client
    │   └── email.ts           # Transactional email
    ├── middleware/
    │   └── auth.middleware.ts # requireAuth, requireAdmin
    ├── schemas/               # Zod validation schemas
    ├── services/              # Business logic layer
    └── routes/                # HTTP layer — thin, delegates to services

frontend/
└── src/
    ├── app/                   # Next.js App Router pages
    │   ├── page.tsx           # Home
    │   ├── products/          # Catalog + product detail
    │   ├── cart/              # Cart page
    │   ├── checkout/          # Checkout + Stripe Elements
    │   ├── auth/              # Login + Register
    │   └── account/           # Order history + profile
    ├── components/            # Reusable UI components
    ├── lib/
    │   └── api.ts             # Axios instance with token refresh interceptor
    └── store/                 # Zustand stores (auth, cart)
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL (or a Railway account)
- Stripe account (test mode)

### 1. Clone and install

```bash
git clone https://github.com/your-username/daniel-store.git
cd daniel-store

cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment variables

```bash
# backend/.env
DATABASE_URL="postgresql://..."
JWT_ACCESS_SECRET="..."          # generate with: node -e "require('crypto').randomBytes(64).toString('hex')"
JWT_REFRESH_SECRET="..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
RESEND_API_KEY="..."
FRONTEND_URL="http://localhost:3000"

# frontend/.env.local
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 3. Database setup

```bash
cd backend
npx prisma migrate dev --name init
npx prisma studio   # visual DB explorer at localhost:5555
```

### 4. Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev       # http://localhost:4000

# Terminal 2 — Frontend
cd frontend && npm run dev      # http://localhost:3000

# Terminal 3 — Stripe webhook forwarding (development)
stripe listen --forward-to localhost:4000/orders/webhook
```

### 5. Test the payment flow

Use Stripe's test card: `4242 4242 4242 4242` — any future date, any CVC.

---

## Engineering Decisions

**Why Fastify over Express?**  
Fastify is ~20% faster than Express in benchmarks and has a schema-first design that pairs well with Zod. Its plugin system keeps the codebase modular.

**Why PostgreSQL over MongoDB?**  
An e-commerce platform performs multi-table writes constantly — creating an order must atomically update order status, decrement stock, and clear the cart. MongoDB's multi-document transaction support is a late addition and not its strength. PostgreSQL's ACID guarantees are the right tool here.

**Why webhook-driven order confirmation?**  
Frontend-driven confirmation is unreliable — if the user closes the browser after payment but before the success page loads, the order is never confirmed even though money was collected. Stripe retries webhook delivery until your server acknowledges it, making it the only reliable source of truth.

**Why Refresh Token rotation?**  
A static, long-lived refresh token is a single point of failure. With rotation, each use invalidates the previous token and issues a new one. If a token is stolen and used by an attacker, the legitimate user's next request will fail — signaling a compromise and allowing full session invalidation.

---

## Roadmap

- [ ] Algolia integration for fast, typo-tolerant product search
- [ ] Cloudinary image upload pipeline in the admin panel
- [ ] Discount codes and promotional pricing
- [ ] Order tracking with carrier integration
- [ ] Multi-language support (ES / EN) with `next-intl`
- [ ] E2E test suite with Playwright covering the full checkout flow
- [ ] Docker Compose setup for fully local development

---

## License

MIT
