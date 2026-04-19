# CashTraka — WhatsApp Sales & Cash Tracker

**Know who paid, know who owes, and follow up fast.**

CashTraka is a lean, mobile-first web app that helps small WhatsApp-based sellers in Nigeria
track payments, track customers who owe them, automatically save customer records, and send
follow-up / debt reminder messages through WhatsApp.

This repository contains the 2-week MVP.

---

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (mobile-first design)
- **PostgreSQL** via **Prisma ORM**
- **JWT session cookies** (`jose` + `bcryptjs`) — no NextAuth required
- **Zod** for input validation
- **wa.me** deep links for WhatsApp messaging (no official API)
- **Progressive Web App** — installable on Android/iOS, offline-capable shell

## PWA

CashTraka is a fully installable Progressive Web App.

- **Install it**: open in Chrome (Android/desktop) or Safari (iOS). An install
  banner appears on the dashboard. After install, launching from the home
  screen opens it standalone (no browser chrome) straight into the dashboard.
- **Works offline (partially)**: the landing page, login, and signup pages are
  cached — they load instantly without a connection. Authed routes still need
  the network (money data is never cached for freshness/security). When a
  request fails due to being offline, the app shows a branded `/offline` page
  with a "Try again" button instead of a blank white screen.
- **Home-screen shortcuts** (Android only): long-press the installed app icon
  for quick actions — "Add payment", "Add debt", "Send follow-up".

### Regenerating icons

If you change the brand mark, regenerate the PNGs:

```bash
npm run icons
```

This rasterises `public/icon.svg` into `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, `apple-touch-icon.png`, and `favicon.ico`.

### Testing the PWA locally

Service workers only register in production. To test:

```bash
npm run build
npm run start
```

Then open `http://localhost:3000`, log in, go to the dashboard. DevTools →
Application → Service Workers should show `/sw.js` active. Toggle Network
to "Offline" and reload — the `/offline` page should appear.

### Updating after deploy

Bump `CACHE_VERSION` in `public/sw.js` whenever you ship a UI change that
should invalidate cached assets. The next time users open the app, the new
service worker activates and deletes the old caches.

## Features (MVP)

- Seller auth: sign up, log in, persistent session, log out
- Dashboard: money received, outstanding debt, total customers, recent activity, quick actions
- Payment tracking: add, search, filter by Paid / Pending / All
- Debt ledger: add, view total outstanding, mark as paid, send reminder via WhatsApp
- Auto-managed customer database (unique per seller + phone)
- Customer detail with payment + debt timeline
- One-tap follow-up composer (editable prefilled WhatsApp message)
- Settings: business name, seller WhatsApp number, logout
- Guided 5-step onboarding (first payment → first debt → first reminder → done)
- Mobile bottom nav + desktop sidebar
- Clear empty, loading, and error states
- Route protection via middleware

## Project structure

```
hookik/
├── prisma/
│   ├── schema.prisma        # User, Customer, Payment, Debt
│   └── seed.ts              # Demo data (login: demo@hookik.app / password123)
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout
│   │   ├── globals.css      # Tailwind + base component classes
│   │   ├── page.tsx         # /           Landing
│   │   ├── login/           # /login
│   │   ├── signup/          # /signup
│   │   ├── onboarding/      # /onboarding
│   │   ├── dashboard/       # /dashboard
│   │   ├── payments/        # /payments, /payments/new
│   │   ├── debts/           # /debts, /debts/new
│   │   ├── customers/       # /customers, /customers/[id]
│   │   ├── follow-up/       # /follow-up
│   │   ├── settings/        # /settings
│   │   └── api/             # Auth, payments, debts, settings, onboarding
│   ├── components/          # AppShell, BottomNav, forms, Onboarding, etc.
│   ├── lib/
│   │   ├── prisma.ts        # Singleton Prisma client
│   │   ├── auth.ts          # JWT session cookies, password hashing
│   │   ├── guard.ts         # Server-side auth + onboarding redirect
│   │   ├── customers.ts     # Upsert + recompute totals
│   │   ├── whatsapp.ts      # Phone normalization + wa.me links
│   │   ├── validators.ts    # Zod schemas
│   │   ├── format.ts        # Naira + date helpers
│   │   └── utils.ts         # cn() helper
│   └── middleware.ts        # Route protection
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Getting started

### 1. Prerequisites

- Node.js 18+ (20+ recommended)
- PostgreSQL 14+ running locally (or a hosted instance)
- npm / pnpm / yarn

### 2. Install

```bash
cd hookik
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hookik?schema=public"
AUTH_SECRET="<generate with: openssl rand -base64 32>"
```

### 4. Create the database schema

```bash
npm run db:push
```

### 5. Seed demo data (optional)

```bash
npm run db:seed
```

This creates a demo seller:

- **email:** `demo@hookik.app`
- **password:** `password123`

### 6. Run in dev mode

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Scripts

| Script              | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Next.js dev server                                             |
| `npm run build`     | `prisma generate` + `next build`                               |
| `npm run start`     | Start production build                                         |
| `npm run lint`      | ESLint                                                         |
| `npm run db:push`   | Push schema to the database (no migrations folder)             |
| `npm run db:seed`   | Run `prisma/seed.ts`                                           |
| `npm run db:reset`  | Drop + recreate the database, then seed                        |

## Business rules

- Each seller only ever sees their own data.
- A customer is unique per `(userId, normalizedPhone)`.
- Adding a payment or debt will automatically create or touch the customer.
- Customer totals (`totalPaid`, `totalOwed`, `transactionCount`, `lastActivityAt`) are
  recomputed after each insert/update — not stored as deltas.
- Marking a debt as paid removes it from `totalOwed`.
- Amounts are stored as integers (Naira, no kobo) and displayed as `₦1,500`.

## WhatsApp links

Phone numbers are normalized before building a `wa.me` URL:

| Input              | Normalized      |
| ------------------ | --------------- |
| `08012345678`      | `2348012345678` |
| `+234 801 234 5678`| `2348012345678` |
| `2348012345678`    | `2348012345678` |

### Default messages

- **Debt reminder:** _Hi [Name], you have an outstanding balance of ₦[Amount]. Kindly complete your payment. Thank you._
- **Follow-up:** _Hi [Name], we have new stock available. Let me know if you'd like to order._

## Onboarding activation

A user is "activated" once they have:

1. added their first payment
2. added their first debt
3. tapped to send their first reminder

The 5-step onboarding walks them through all three, then marks
`User.onboardingCompleted = true` so future visits land on `/dashboard`.

## License

MIT — do what you like.
