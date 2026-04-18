# CashTraka — Local Setup

This is the full project copied from `~/Desktop/Product Demo/hookik`. Everything is ready to run locally.

## What's included
- Full Next.js 14 app (`src/app`, `src/components`, `src/lib`)
- Prisma schema + SQLite database with all demo data (`prisma/dev.db`)
- Seed script (`prisma/seed.ts`)
- Environment file (`.env`) — dev secret + SQLite URL

## What's NOT included (you'll install these)
- `node_modules/` — run `npm install`
- `.next/` — Next.js will rebuild this on `npm run dev`

## First-time setup (one command)

```bash
cd "C:/Users/JANE EBERE/Desktop/CashTraka"
npm install
```

The `postinstall` hook isn't wired, so also run:

```bash
npx prisma generate
```

## Run the app

```bash
npm run dev
```

Open http://localhost:3000

## Demo accounts

The copied `prisma/dev.db` contains seeded users you can log in with:

| Email | Password | Business Type |
|---|---|---|
| `demo@cashtraka.app` | `password123` | Seller (business plan) |
| `uat2pm@ct.test` | `password123` | Property manager (landlord plan) |
| `uat2seller@ct.test` | `password123` | Seller (free plan) |

## If you need to reset the database

```bash
npm run db:push     # sync schema (if you edit prisma/schema.prisma)
npm run db:seed     # re-seed demo data (overwrites existing demo user)
```

## File layout

```
CashTraka/
├── prisma/
│   ├── schema.prisma   # Full data model
│   ├── seed.ts         # Demo data seeder
│   └── dev.db          # SQLite — all your test data
├── src/
│   ├── app/            # All pages (public + authed + API routes)
│   ├── components/     # All React components (including marketing + dashboard)
│   ├── lib/            # auth, prisma, business-type, gates, pdf-docs, etc.
│   └── middleware.ts   # Route protection
├── .env                # DATABASE_URL + AUTH_SECRET
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md           # Full product documentation
```

## Quick feature sanity check

Once running, try these URLs to confirm everything works:
- http://localhost:3000 — landing page with ICP toggle
- http://localhost:3000/signup?type=seller — seller signup
- http://localhost:3000/signup?type=property_manager — PM signup
- http://localhost:3000/dashboard — adaptive dashboard (log in first)
- http://localhost:3000/reports — ICP-aware reports
- http://localhost:3000/api/receipts/{paymentId} — server-rendered PDF receipt
- http://localhost:3000/api/invoices/INV-00001/pdf — server-rendered PDF invoice
