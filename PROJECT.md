# CashTraka — Project Master Document

A complete reference for what CashTraka is, what's inside it, what was built
across the multi-session work with Claude Code, and what's left before and
after production launch.

> **Sister documents**
> - `README.md` — quick start for a new developer
> - `BACKEND.md` — API + service layer deep-dive
> - `DEPLOY.md` — step-by-step production deployment guide

---

## 0. TL;DR

CashTraka is a mobile-first money-tracker built for **Nigerian small
businesses and landlords** who run their business on WhatsApp. It is a
full business operating system — not a spreadsheet, not a chat add-on — and
it wraps around the way Nigerians actually transact (bank alerts as proof of
payment, WhatsApp as the customer channel).

Two solution lines sit on the same codebase:

| Solution | Audience | Internal `businessType` |
|---|---|---|
| **CashTraka for Business** | Shops, food vendors, services, tailors, deliveries | `seller` |
| **CashTraka for Landlords** | Landlords, property managers, estate agents | `property_manager` |

The enum values stay stable (`seller` / `property_manager`) so DB and
historical data never churn; only user-facing labels adapt.

Repo: `ordinarychief84/CashTraka` · Branch: `main` · Latest commit: `290f99d`.

---

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router)** + TypeScript | SSR for SEO (marketing pages), RSC for dashboard |
| Styling | **Tailwind CSS** | Brand palette: cyan `brand-*` (#00B8E8), lime `success-*` (#8BD91E) |
| Database | **PostgreSQL** (prod) via Prisma 5 · SQLite (legacy dev) | Neon / Supabase / Railway all work |
| ORM | **Prisma** | Single schema file, provider-swappable |
| Auth | Custom **JWT (`jose`)** + `bcryptjs`, session cookie `cashtraka_session` | No third-party vendor; full control |
| Email | **Resend** | Nigerian delivery reliability, 100/day free tier |
| Files | **Uploadcare** | Cheaper than Cloudinary, Nigerian startup-friendly |
| Billing | **Paystack** | Nigerian cards, bank transfer, USSD |
| PWA | Service worker + manifest | Installable on Android + iOS Safari |

---

## 2. Architecture

```
Browser (mobile-first)
    │
    ├─ Marketing pages (SSR, public)
    ├─ Auth pages (public, middleware-gated reverse if logged in)
    │
    ├─ Protected routes (middleware → verify JWT → redirect /login if absent)
    │     │
    │     ├─ /dashboard, /payments, /debts, /customers, ...  (owner + staff)
    │     ├─ /settings, /billing                             (owner only, via RBAC)
    │     ├─ /tenants, /properties, /rent                    (landlords only)
    │     └─ /admin/*                                         (role === 'ADMIN')
    │
    └─ API routes
          ├─ CSRF same-origin check (middleware)
          ├─ Per-route RBAC via requirePermission(...)
          ├─ Prisma multi-tenant scoping by userId
          └─ Services (email, billing, paystack, uploadcare, ...)
```

### Multi-tenancy

Every user-owned row has a `userId` foreign key. Every Prisma query scopes to
`where: { userId: ctx.owner.id }`. RBAC is a second, orthogonal check — staff
log in against their employer's user, and inherit a subset of actions via
their `accessRole` (MANAGER / CASHIER / VIEWER / NONE).

### CSRF defence

Middleware rejects any state-changing `/api/*` request whose `Origin` (or
`Referer` fallback) doesn't match the `Host` header. No double-submit token
scheme is needed — SameSite=Lax cookie + origin check closes the vector.
Two exempt prefixes: `/api/billing/webhook` (Paystack server-to-server) and
`/api/payments/claim/*` (public payment claim links).

### Roles

- **OWNER** — the user who signed up. Full access.
- **MANAGER** — staff with read+write.
- **CASHIER** — staff with limited write (payments in, no settings).
- **VIEWER** — staff with read-only.
- **NONE** — invited but not yet set up (onboarding state).
- **ADMIN** — platform-wide admin, separate from owner/staff RBAC.

---

## 3. Features shipped

### 3.1 Authentication & sessions

- Email + password login for both **owners and staff** on a single `/login`.
- Signup with Zod validation, bcrypt hashing, common-password blocklist.
- **Staff invite flow** — invite email → accept-invite page with password set
  → token consumed, staff becomes active.
- **Forgot-password** end-to-end:
  - Token minted as 32 random bytes, stored as sha256 hash in DB.
  - 30-min expiry, 3/hour rate limit per user.
  - Generic success response → no user enumeration.
  - On reset, all other outstanding tokens are invalidated in one tx.
  - Pages: `/forgot-password`, `/reset-password/[token]`, plus "Forgot
    password?" link on `/login` and success banner on `/login?reset=1`.
- **Logout** — native `<form method="post">` everywhere (AppShell sidebar,
  AppShell mobile top-bar, AdminShell, SettingsForm) + LAN-safe redirect
  that derives origin from the `Host` header (so phones on the same Wi-Fi
  land on the right URL, not `0.0.0.0`).

### 3.2 Business-type system (ICPs)

Central config in `src/lib/business-type.ts`:

- `BUSINESS_TYPES` — name/label/productName per enum.
- `COPY` — per-ICP language pack: "Customer" vs "Tenant", "Debt" vs "Unpaid
  rent", dashboard subtitles, empty-state copy.
- `FEATURES` — feature-visibility matrix (e.g. `products: ['seller']`,
  `rent: ['property_manager']`).
- Helpers: `canAccess(feature, type)`, `copyFor(type)`,
  `isPropertyManager(type)`.

### 3.3 Core features (both ICPs)

- **Payments** — log, search, filter by verification status, verify against
  a pasted bank SMS/email.
- **Debts** — per-customer balance, due dates, partial-payment tracking,
  one-tap prefilled WhatsApp reminder.
- **Customers / Tenants** — auto-saved on first payment/debt, never entered
  manually.
- **Follow-up** — template + target customer + one-tap open in WhatsApp.
- **Reports** — revenue, debt aging, collection rate.
- **Reminders** — per-debt schedule with next-due-at and cleared states.
- **Templates** — saved WhatsApp messages, reusable.
- **Expenses** — split into `business` (affects P&L) vs `personal`
  (out-of-pocket), with category grouping.
- **Personal budget thresholds** — weekly + monthly; budget-exceeded banner
  on `/expenses` when crossed. Card lives on `/expenses` (not settings) so
  budget sits next to the spend it governs.

### 3.4 Seller-only

- **Products + live inventory** — low-stock alerts before running out.
- **Invoices** — professional, shareable via WhatsApp link, PDF attachable.
- **Receipts** — auto-generated on every PAID payment, with Uploadcare-hosted
  PDF + public share link, Resend-delivered email to customer.
- **Staff, attendance, payroll** — per pay-type (salary / weekly / daily /
  per-task). Attendance marked per day. Payroll entries auto-appear in
  expenses.
- **Tasks + checklists** — assigned to staff with status tracking and overdue
  highlights.

### 3.5 Landlord-only

- **Properties** — each with its own tenant roster and rent ledger.
- **Tenants** — phone, rent amount, due period, lease info.
- **Rent tracker** — single page showing expected collection, actual
  collection, and who's behind across every property. Collection-rate KPI.
- **Auto rent reminders** — WhatsApp-prefilled, fires on due date.

### 3.6 Billing (Paystack)

- **Four paid plans** (`PLAN_PRICING` in `src/lib/billing/pricing.ts`):
  - Business ₦4,500/mo, Business Plus ₦6,800/mo (sellers)
  - Landlord ₦8,500/mo, Estate Manager ₦18,000/mo (property managers)
- **14-day free trial** — auto-downgrades to Free on day 15 if no payment.
- **Lifecycle states** on `User.subscriptionStatus`: `free` /
  `trialing` / `active` / `past_due` / `cancelled`.
- **Effective-plan resolver** (`effectivePlan(user)` in `plan-limits.ts`)
  unifies all states into a single limits bucket — every gate routes
  through it.
- **Hosted Paystack checkout** → webhook-confirmed → user plan flipped.
- **Webhook signature verification** (HMAC-SHA512) + event dedup via
  `BillingEvent.paystackEventId` unique constraint.
- **Upgrade modal** — opens via `/settings?upgrade=<plan>`.
- **Billing card** — adapts to subscription state (Free → upgrade CTA,
  Trialing → countdown, Active → renewal date, Past-due → retry, Cancelled
  → resubscribe).
- **Admin plan override** — admin can flip any user's plan with an
  `AdminNote` written for audit.

### 3.7 Marketing site

- **Hero (v2)** — gradient-underlined "Stop chasing payments. Start
  receiving them." + primary Start free CTA + trust-row + layered product
  visual (three independently-floating cards: revenue panel with sparkline
  + bank-verified alert with ping pulse + WhatsApp reminder composer).
  Dot-grid background with radial mask + dual gradient orbs.
- **Navbar** — Solutions mega-dropdown leading with two big ICP cards
  (For Small Business / For Landlords) routing to dedicated landings;
  secondary feature links grid beneath.
- **SolutionsPath** — "Which one are you?" section below the hero, two
  detailed path cards replacing the old in-hero ICP toggle.
- **`/for-business`** — dedicated seller landing: tailored hero, audience
  strip, problem framing, 8-card feature grid, how-it-works, pricing, FAQ,
  final CTA.
- **`/for-landlords`** — mirror for property managers, green accent instead
  of cyan.
- **Shared**: PricingCards (ICP-toggleable, catalog-driven from
  `PLAN_PRICING`), FAQ (ICP-toggleable), FeatureCarousel, FeatureDeepDive,
  AnimatedStat, Marquee, ScrollProgress, Reveal/Stagger/HoverLift.

### 3.8 Dashboard (v2)

Three-zone design (`src/app/dashboard/page.tsx`):

1. **TODAY** — `TodayTriage` ranked queue of unverified payments, overdue
   debts, top debtors, low stock, dormant customers. Soft severity (accent
   strip + dot + label) instead of loud red badges.
2. **PULSE** — `HeroRevenue` calm white panel with gradient-highlighted
   today bar + supporting `KpiCard`s (Money owed, Collection rate, Net
   profit, Avg transaction) with left-edge accent strips.
3. **ACTIVITY** — `TopContributors`, `DebtProgressCards`,
   `RemindersPanel`, monthly-pulse strip, `UpgradeCard` sidebar.

- Staff principal gets a dedicated My-tasks hero card with pending count +
  overdue warning.
- "100 % margin" misleading copy removed when `expenses = 0`.
- Greeting rewritten: small uppercase eyebrow ("GOOD MORNING") above the
  first-name headline. No more emoji hand-wave.

### 3.9 Settings (v2)

Sectioned layout (`src/components/SettingsForm.tsx`):

- **Business profile** — name, solution (two-card picker with confirm on
  switch), WhatsApp (with live `+234 XXX XXX XXXX` preview pill), receipt
  footer (textarea with 200-char counter). Payment details nested as a
  tinted sub-section.
- **Your data** — CSV exports (rent/payments/debts/tenants/etc — adapts to
  ICP).
- **Saved messages** — link to `/templates`.
- **Account** — logout (subdued tone, red border).

Validation:
- Account number: digits-only, hard-capped at 10 (NUBAN), inline error.
- Account name: **auto-uppercase** on type.
- Business type switch: explicit confirm dialog explaining the UI shift.
- Save button: right-aligned, disabled until form is dirty. "Discard"
  appears only when dirty.
- Success banner: auto-dismisses after 3 s. Errors stay.

### 3.10 Admin panel

- `/admin/dashboard` — platform-wide KPIs.
- `/admin/users` — filter by plan / ICP / suspension, plan-override dropdown,
  AdminNote timeline, suspend/restore.
- `/admin/analytics` — cohort + churn + feature adoption.
- Seed creates `admin@cashtraka.app` / `admin123` — **must be rotated
  before production seed**.

### 3.11 Email (Resend)

Templates in `src/lib/services/email.service.ts`:

- `sendReceipt` — branded HTML + PDF attachment.
- `sendTrialStarted`, `sendPaymentSucceeded`, `sendPaymentFailed`,
  `sendSubscriptionCancelled` — billing lifecycle.
- `sendPasswordReset` — 30-min expiry link + branded HTML.
- `sendWelcome` — first login.
- Graceful degradation: if `RESEND_API_KEY` is unset, functions return
  `{ ok: false }` and nothing crashes.

### 3.12 File storage (Uploadcare)

- Migrated from Cloudinary (cheaper tier for a new NG startup).
- Logo upload on receipts & invoices (Plus-tier feature, gated via
  `requireFeature('customBranding')`).
- Receipt PDF hosting.
- Max 2 MB, PNG/JPEG/WEBP only.

### 3.13 Legal

- Privacy policy (`/privacy`) — NDPR-compliant, drafted in full.
- Terms of use (`/terms`) — Nigerian jurisdiction.
- Both shown in signup copy + footer.

### 3.14 PWA

- Manifest + service worker + icons generated via `scripts/generate-icons.mjs`.
- Install banner (`InstallPrompt`): Chromium `beforeinstallprompt` + iOS
  Safari "Add to Home Screen" instructions.
- 30-day dismissal stored in localStorage.
- Offline page + offline cache for shell routes.

---

## 4. Multi-session work log

### 4.1 Session 1 — last night → early today

- Social-proof stat cards layout polish (responsive 3-up → 2+1 → single
  column).
- **Staff login clarity** — four touchpoints so a new staff never wonders
  where to go:
  - Login page "Team member?" hint.
  - Staff dashboard My-tasks hero card.
  - Sidebar task-count badge.
  - Accept-invite page orientation copy.
- Employee task completion flow (todo → in_progress → done, status dropdown).
- Expense split: business / personal with dedicated tabs + budget
  thresholds.
- Search icon overlap fix (first pass).
- **Cloudinary → Uploadcare migration** — cheaper tier for a young NG startup.
- Fixed 5 queued follow-up items:
  1. Dead-code cleanup (unused components pruned).
  2. `shopSlug` legacy concept fully removed.
  3. IDOR audit — every API route now scopes by `userId`.
  4. CSRF + rate-limiting middleware wired in.
  5. Marketing polish (first-week social-proof layout).
- Resend + Uploadcare API keys configured.
- Privacy policy drafted (NDPR).
- Terms of Use drafted (Nigeria).
- Connecteam-style animation reference studied for hero design.
- ICP restructure groundwork: `BUSINESS_TYPES` gains `productName`, labels
  unified to **Small Business** / **Landlord**, internal enum values
  unchanged for DB stability. Copy sweep across 8 files.

### 4.2 Session 2 — today

- **Navbar v2** — Solutions mega-dropdown with two big ICP product cards +
  secondary feature-link grid.
- **HeroSolutions** component (replaces `HeroICP`) with in-hero solution
  picker (then subsequently superseded by v2 hero + separate `SolutionsPath`
  section, see below).
- **`/for-business`** + **`/for-landlords`** full dedicated landing pages.
- **AuthForm signup** reframed as "Choose your solution" using
  `productName` ("CashTraka for Business" / "CashTraka for Landlords").
- **UAT pass 1** — TypeScript clean, ESLint clean, 10 public routes all 200.
- **Hero v2 redesign** (user requested "100x better"):
  - Gradient-underlined headline.
  - Dot-grid background with radial mask + dual gradient orbs.
  - Layered product visual: revenue panel + bank-verified card (ping pulse)
    + WhatsApp composer, each floating independently.
  - Primary ink-black CTA with gradient hover, secondary play-icon CTA.
  - Trust row (★ 4.9 + "Trusted by Nigerian businesses & landlords"),
    14-day trial eyebrow, reassurance chips (setup / phone / bank-verified).
- **SolutionsPath** section — ICP self-select promoted from hero into its
  own breathing-room band.
- **Dashboard redesign** (user-reported "tacky and scattered"):
  - `HeroRevenue` calmed from saturated cyan gradient to white panel with
    gradient-highlighted "today" bar and horizontal gridlines.
  - `KpiCard` rebuilt with left-edge accent strip + cleaner vertical
    rhythm.
  - `TodayTriage` loud red `CRITICAL` pills replaced with soft severity
    (accent strip + tiny colored dot + subdued "Urgent/Soon/Note" labels).
  - Dashboard page: removed 👋 emoji, cleaner greeting, right-aligned CTAs,
    100%-margin misleading copy fix when expenses = 0.
- **Search bar overlap** fixed properly with `!pl-11` important override on
  4 pages: `/customers`, `/debts`, `/payments`, `/admin/users`.
- **Logout button** fixed — three root causes in one commit:
  1. `SettingsForm` migrated from `fetch()` to native form POST.
  2. LAN redirect bug — `req.url` on `-H 0.0.0.0` produced `0.0.0.0/login`;
     now derives host from `Host` header.
  3. `clearSessionCookie` attribute mismatch — mirror full
     `httpOnly/sameSite/secure` tuple so older Safari / Android webviews
     honour the deletion.
- **Settings redesign** — sectioned layout with icon+title+description per
  section, WhatsApp live preview, 10-digit NUBAN cap, uppercase account
  name, two-card solution picker with confirm, textarea footer with 200-char
  counter, dirty-state save button with Discard, auto-dismiss success
  banner.
- **Personal budget** moved from `/settings` to `/expenses` (lives next to
  the spend it governs).
- **Forgot-password end-to-end** — `PasswordResetToken` Prisma model,
  sha256-hashed tokens, 30-min TTL, 3/hour rate limit, generic success
  response, email template, two pages (`/forgot-password`,
  `/reset-password/[token]`), "Forgot password?" link on `/login`, success
  banner on `/login?reset=1`.
- **Mobile LAN testing** — `next dev -H 0.0.0.0 -p 3001` + Windows firewall
  rule (`CashTraka dev 3001`) + IP discovery (`10.0.0.125:3001`).
- **Prisma** — `provider = "sqlite"` → `provider = "postgresql"` for
  production deploy. Schema validated against a dummy postgres URL.
- Vercel CLI installed globally.

---

## 5. Commit trail (today's session)

| SHA | Message |
|---|---|
| `290f99d` | Switch Prisma provider to PostgreSQL for production deploy |
| `4e8cb8e` | Move personal budget to /expenses + add forgot-password flow |
| `d6e71c9` | Fix settings page: sectioned layout, validation, UX fixes |
| `d29e5c7` | Fix logout button: native form POST + LAN-safe redirect |
| `7b724ef` | Redesign dashboard: calmer hierarchy + fix search bar overlap |
| `2b5e951` | Redesign hero: one confident headline + layered product visual |
| `37456ae` | Restructure ICPs as solutions, rename 'WhatsApp seller' → 'Small Business' |

---

## 6. Environment variables

```bash
# Core
DATABASE_URL=postgresql://...                 # Neon / Supabase / Railway
AUTH_SECRET=                                  # openssl rand -base64 32
APP_URL=https://cashtraka.co                  # Used in emails + redirects
BILLING_REDIRECT_URL=https://cashtraka.co/billing/callback

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=CashTraka <hello@cashtraka.co>

# Files (Uploadcare)
UPLOADCARE_PUBLIC_KEY=<public_key>
UPLOADCARE_SECRET_KEY=                        # Optional — future delete/list

# Billing (Paystack)
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_WEBHOOK_SECRET=<whsec from Paystack>
```

Graceful degradation: every third-party integration returns a typed
`{ ok: false, error }` when its key is missing, so misconfigured envs
surface as friendly "feature not configured" messages instead of crashes.

---

## 7. File map

```
src/
├── app/
│   ├── page.tsx                       Landing (HeroSolutions → SolutionsPath → …)
│   ├── for-business/page.tsx          Small Business solution landing
│   ├── for-landlords/page.tsx         Landlord solution landing
│   ├── login/                         Login + ?reset=1 flash
│   ├── signup/                        Signup (Choose your solution picker)
│   ├── forgot-password/               Email form
│   ├── reset-password/[token]/        New password form
│   ├── dashboard/                     Owner + staff dashboard (3 zones)
│   ├── admin/{dashboard,users,analytics}/
│   ├── settings/                      Sectioned settings surface
│   ├── expenses/                      Expenses + personal-budget thresholds
│   ├── payments/, debts/, customers/, follow-up/, reminders/, products/, …
│   ├── tenants/, properties/, rent/   Landlord-only
│   ├── tasks/, checklists/, team/     Staff-related
│   ├── invoices/, receipts/
│   ├── about/, privacy/, terms/       Static legal / marketing
│   └── api/
│       ├── auth/{login,signup,logout,me,forgot-password,reset-password}/
│       ├── billing/{subscribe,trial,cancel,status,verify,webhook}/
│       ├── admin/users/[id]/plan/
│       ├── payments/, debts/, customers/, …  (CRUD)
│       ├── settings/{route,logo,personal-budget}/
│       └── export/[kind]/             CSV export
│
├── components/
│   ├── marketing/
│   │   ├── Navbar.tsx                 Solutions mega-dropdown
│   │   ├── HeroSolutions.tsx          v2 hero (layered cards)
│   │   ├── SolutionsPath.tsx          "Which one are you?" band
│   │   ├── PricingCards.tsx           ICP-toggled, catalog-driven
│   │   ├── FAQ.tsx                    ICP-toggled
│   │   ├── HeroMockup.tsx             Legacy phone-frame visual (still used on solution pages)
│   │   ├── FloatingCard.tsx, Reveal.tsx, Stagger.tsx, Marquee.tsx, AnimatedStat.tsx, …
│   │   └── Footer.tsx
│   ├── dashboard/
│   │   ├── HeroRevenue.tsx            v2 calm white panel
│   │   ├── KpiCard.tsx                v2 left-edge accent
│   │   ├── TodayTriage.tsx            v2 soft severity
│   │   ├── TopContributors.tsx, DebtProgressCards.tsx, RemindersPanel.tsx, UpgradeCard.tsx
│   ├── billing/
│   │   ├── BillingCard.tsx, UpgradeModal.tsx
│   ├── AppShell.tsx                   Shared layout for authed pages
│   ├── admin/AdminShell.tsx
│   ├── AuthForm.tsx                   Login + signup with solution picker
│   ├── SettingsForm.tsx               v2 sectioned settings
│   ├── PersonalBudgetCard.tsx         Now lives on /expenses
│   ├── GlobalSearch.tsx, Logo.tsx, PageHeader.tsx, EmptyState.tsx, InstallPrompt.tsx, …
│
├── lib/
│   ├── auth.ts                        JWT + session cookie + clearSessionCookie
│   ├── guard.ts, guard-rbac.ts        Route-level auth helpers
│   ├── rbac.ts                        can(role, action)
│   ├── gate.ts                        requireFeature, enforceQuota, isWriteBlocked
│   ├── plan-limits.ts                 effectivePlan, Limits buckets
│   ├── business-type.ts               BUSINESS_TYPES, COPY, FEATURES, canAccess
│   ├── password-policy.ts             isWeakPassword (common-password blocklist)
│   ├── billing/pricing.ts             PLAN_PRICING (kobo single source of truth)
│   ├── services/
│   │   ├── email.service.ts           Resend (receipt, trial, payment, reset, welcome)
│   │   ├── billing.service.ts         startTrial, initUpgrade, completeUpgrade, cancel, expireTrialIfNeeded
│   │   ├── paystack.service.ts        initTransaction, verifyTransaction, verifyWebhookSignature
│   │   ├── user.service.ts
│   │   └── …
│   ├── uploadcare/
│   │   └── upload.ts                  uploadLogo, uploadReceiptPdf
│   ├── validators.ts                  Zod schemas
│   ├── api-response.ts                handled(), ok(), fail(), unauthorized()
│   ├── format.ts, range.ts, whatsapp.ts, prisma.ts, utils.ts (cn)
│
└── middleware.ts                      Route gating + CSRF origin check

prisma/
├── schema.prisma                      PostgreSQL provider (prod)
└── seed.ts                            Demo seller, demo landlord, admin
```

---

## 8. Deployment status

### 8.1 Done

- Code pushed to `ordinarychief84/CashTraka` · `main`
- Prisma provider swapped to PostgreSQL (commit `290f99d`)
- Vercel CLI installed globally
- `npm run build` passes locally with a dummy Postgres URL
- `DEPLOY.md` documents every step

### 8.2 Blocking — user-only steps

1. **Create a Neon Postgres database** → [neon.tech](https://neon.tech) →
   project `cashtraka-prod` → copy **pooled** connection string.
2. **`vercel login`** on the user's terminal (opens browser).
3. Provide the `DATABASE_URL` so Claude can run
   `prisma migrate deploy` + `prisma db seed` against prod DB (after
   rotating admin credentials in `prisma/seed.ts`).

### 8.3 Next — to be run after the two blockers

```bash
vercel link --yes
vercel env add DATABASE_URL production
vercel env add AUTH_SECRET production          # openssl rand -base64 32
vercel env add APP_URL production              # https://<domain>
vercel env add BILLING_REDIRECT_URL production # https://<domain>/billing/callback
vercel env add PAYSTACK_SECRET_KEY production
vercel env add PAYSTACK_PUBLIC_KEY production
vercel env add PAYSTACK_WEBHOOK_SECRET production
vercel env add RESEND_API_KEY production
vercel env add RESEND_FROM_EMAIL production
vercel env add UPLOADCARE_PUBLIC_KEY production
vercel --prod
```

Then register the Paystack webhook at
`https://<domain>/api/billing/webhook` with events `charge.success`,
`invoice.payment_failed`, `subscription.disable`.

---

## 9. Known caveats

- **Local dev requires Postgres** since the schema swap. Options:
  1. Run a local Postgres (e.g. Docker `docker run -p 5432:5432 -e POSTGRES_PASSWORD=pw postgres:15`).
  2. Point the local `DATABASE_URL` at the Neon prod DB (fine for a one-person shop).
  3. Revert `provider` to `sqlite` on a local-only branch for deeper exploration work.
- **Admin seed credentials** (`admin@cashtraka.app` / `admin123`) **must
  be rotated** in `prisma/seed.ts` before running `npx prisma db seed`
  against production.
- **Dead code** in `src/app/page.tsx`: `Hero()` and `PropertyManagerSpotlight()`
  are defined but no longer rendered. Safe to remove in a cleanup commit.
- **Vercel dashboard GitHub integration** is an alternate deploy path to the
  CLI flow documented above. Either works; the CLI is documented because
  it's the only path Claude Code can drive end-to-end.

---

## 10. Testing / UAT checklist

Verified this session:

- [x] TypeScript `tsc --noEmit` clean across all commits.
- [x] ESLint `next lint` clean across all commits.
- [x] Production `next build` passes.
- [x] Every public route returns 200 from curl:
      `/`, `/for-business`, `/for-landlords`, `/about`, `/privacy`,
      `/terms`, `/login`, `/signup`, `/forgot-password`,
      `/reset-password/[token]`.
- [x] Protected routes return 307 redirect when unauthenticated.
- [x] Logout: cookie cleared, redirect to `/login`, LAN-safe.
- [x] Forgot-password: unknown email returns generic success; invalid
      token returns proper 400; full DB roundtrip tested on dev.
- [x] Mobile tested via `http://10.0.0.125:3001` on the user's phone.

Remaining manual QA recommended before inviting real users:

- [ ] Full Paystack test-mode checkout + webhook delivery.
- [ ] Real email delivery through a verified Resend sender domain.
- [ ] Real Uploadcare uploads (receipts + logo).
- [ ] End-to-end staff invite → accept → task assigned → mark complete.
- [ ] Property-manager full flow: property → tenant → rent payment →
      bank-alert verification → receipt → reminder.

---

## 11. Conversation threads addressed (brief)

For the record, the following user requests were acted on across the two
sessions and are reflected in the codebase:

1. "Fix follow-ups first" — picked from queued chips (CSRF/rate-limit, auth
   consolidation, marketing polish, dead-code, shopslug). All 5 done.
2. Resend API key + Uploadcare key provided; Privacy policy + Terms of Use
   drafted in full for Nigerian (NDPR) compliance.
3. "Open it in local host" — dev server running on `http://localhost:3001`.
4. Cloudinary → Uploadcare migration with the logo kept as-is.
5. Search icon overlap fix — pl-11 override on 4 pages.
6. Staff login clarity — 4 touchpoints added.
7. Expense business/personal split + budget thresholds.
8. UI restructure from seller-vs-PM identity toggle to Solutions-first
   (Connecteam-style) — Navbar dropdown, dedicated solution landings,
   main-landing split, signup picker reframed, copy sweep.
9. "Run end-to-end tests and tell me if it's production-ready" — UAT pass
   with detailed report.
10. "Deploy to Vercel" — prep done (Prisma swap + Vercel CLI); 3 blocking
    steps handed back to the user.
11. Hero audit + "make it 100x better" — v2 hero with gradient headline,
    layered floating cards, dot-grid background.
12. Dashboard audit "tacky and scattered" — full redesign across
    HeroRevenue, KpiCard, TodayTriage, dashboard page greeting.
13. Logout button fix — three root causes in one commit.
14. Settings page audit + redesign — sectioned layout + validation +
    solution picker with confirm + personal budget moved to /expenses.
15. Forgot-password auth built end-to-end.
16. Mobile LAN testing setup.
17. Admin access guide (admin@cashtraka.app / admin123).

---

*Document generated from the full Claude Code session transcript. Keep in
sync with every major milestone — the goal is for a new engineer (or
the user on a re-read) to grok the entire system in a single file.*
