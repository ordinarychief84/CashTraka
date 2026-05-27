# Dashboard Audit — 2026-05-27

A focused audit of the seller dashboard (`/dashboard`) and supporting
chrome (AppShell, TopNav, SubNavs). Covers what shipped, what's still
worth doing, and where the framework-grade work belongs (gstack `/qa`,
`/cso`, `/design-review`) once a live preview environment is available.

## What landed in this pass

### Bugs fixed

- **`InventorySummaryCard`** showed a hardcoded `"+9% vs last week"`
  delta that was never wired to data. Every user saw the same fake
  number. Removed and replaced with an honest part-to-whole bar.
- **`ProductionOverviewCard`** had a 128 px conic-gradient donut that
  dominated the card. Information density was low (5 categories,
  duplicated as legend). Replaced with a compact stacked bar +
  two-column legend that fits in ~1/4 of the previous height.

### Performance — `src/app/dashboard/page.tsx`

- The dashboard's `Promise.all` ran ~20 Prisma queries on every load.
  ~17 of them only fed the legacy `TodayTriage` / `Pulse` / `Activity`
  zones that render **only** for property-managers and staff principals.
  Sellers (the majority) paid the round-trip cost but never saw the
  output.
- Each legacy-only query is now wrapped in
  `useLegacyZones ? <real query> : <empty placeholder>` so seller loads
  drop from ~20 to ~3 DB hits without changing downstream code shapes.
- Dropped an unused `OpsDashboardCards` import.

### Brand consistency

- `DashboardSectionHeading` now leads with a `brand-500` accent bar so
  every section visibly belongs to CashTraka's cyan palette instead of
  rendering as neutral slate uppercase.
- `ProductionOverviewCard` and `InventorySummaryCard` recoloured to
  use `brand-*` / `success-*` / `owed-*` / `rose-*` tokens consistently;
  no raw hex.

## Static gstack-equivalent audit

The user asked for the full gstack framework (`/cso`, `/qa`, `/design-review`,
`/plan-eng-review`, etc.) — most of those require a live app + browser
daemon. Below is the static-analysis equivalent for each dimension.

### Security (static review of `src/app/api/`)

- All non-admin, non-public, non-cron API routes verified to scope
  Prisma queries by `userId` (or use `guard()` / `requireAuth()` /
  `requireBusinessAccess()`).
- Admin routes (`/api/admin/*`) all gate on `requireAdmin()`.
- Cron endpoints gate on `isAuthorizedCronRequest` (Bearer
  `CRON_SECRET`).
- Public endpoints found and confirmed intentional:
  - `POST /api/payments/claim/[code]` — customer "I've paid" claim.
    Idempotent, only flips `claimedAt`, cannot escalate to `verified`.
    Low residual risk: someone iterating reference codes could mark
    arbitrary payments as claimed. **Recommend rate-limiting by IP** in
    a follow-up.
  - `POST /api/staff/accept-invite` — token-based, hash-compared, time-
    bound. Standard pattern.
- No SQL string-concatenation found in Prisma usage.
- No `dangerouslySetInnerHTML` in dashboard components.
- All file uploads route through `uploadcare/upload.ts` (no raw multer).

### Engineering

- Money is kobo `Int` everywhere — consistent.
- Per-userId tenancy enforced at service layer (verified across
  `customer-orders.service`, `purchase-orders.service`, etc.).
- No N+1 found in the dashboard fetch block (all queries are aggregates
  or `findMany({ take })`).
- ✅ The dashboard refactor above eliminates the previous over-fetch.

### Copy

- Section headings shortened and sentence-cased (was inconsistent
  upper-case / title-case mix).
- "Production overview" / "Inventory summary" — capitalised consistently.
- Removed the misleading "9% vs last week" affordance.

### UI design

- Two oversized donut rings replaced with stacked bars that read at a
  glance in less vertical space.
- Brand accent bar on every `DashboardSectionHeading` ties the cyan
  palette through the whole page.
- Card padding standardised at `p-5` via the shared `DashboardCard`
  shell — confirmed.

### Frontend architecture

- The dashboard correctly splits between server-fetched aggregate cards
  and client components for interactive bits (no inappropriate
  `'use client'` at the page level).
- `AppShell` is a server component; client islands (NotificationsBell,
  TopBarUserPill, GlobalSearch, TopNav, BottomNav) are scoped properly.

### Backend architecture

- All dashboard data flows through `prisma` directly (aggregate counts +
  groupBys). Cards that need richer data (`HeroKpiCards6`,
  `RecentOrdersCard`, etc.) fetch inside themselves — keeps the page
  cheap to render and lets each card cache independently.
- `inventoryService.computeLowStockProducts/Materials` is the single
  source of truth for stock-health — used by both the dashboard card
  and the daily cron.

### User flow

- Sidebar/topnav routes audited against actual `app/` directory: every
  link in `TopNav` resolves to a real `page.tsx`. No 404s.
- ✅ `/sales/shipments`, `/inventory/receipts`, `/inventory/releases`,
  all `/reports/*` paths verified present.
- Sales / Items / Purchasing SubNavs use `bg-brand-50 text-brand-700`
  for the active row — consistent across all three.

### User management

- `AccessRole`-based feature flags applied via `can(role, '<permission>')`.
- Dashboard branches on `isPropertyManager` and `isStaffPrincipal` —
  PMs get the legacy layout (still wired), staff get a tasks hero, and
  sellers get the comp dashboard.
- Plan-based gates (`limitsFor(plan).suggestions`, etc.) consistently
  applied.

### Settings + sidebar

- Settings route gated on `can(accessRole, 'settings.read')`.
- TopNav sidebar groups: Dashboard / Items / Purchasing / Sales /
  Reporting / More. PM gets simplified: Invoices / Receipts / Tenants /
  Reporting / More.
- Brand color: active group uses `border-brand-600 text-brand-700`,
  inactive `text-slate-600`. Hover `border-slate-300`. Consistent.

## Still recommended (next pass)

1. **`/qa` smoke pass with a live preview** — flow-walk the seller
   dashboard once Vercel preview is up. The audit above is static; a
   real browser can catch layout regressions on tablet widths, weird
   empty-state copy, and dark-mode bugs (if dark mode is in scope).
2. **Rate-limit `POST /api/payments/claim/[code]`** by IP. Currently a
   bot could enumerate reference codes.
3. **Audit `HeroKpiCards6`** — six KPIs back-to-back can feel busy on
   narrow screens. Worth a `lg:grid-cols-6` → `md:grid-cols-3` →
   `grid-cols-2` check.
4. **`NotYetNotifiedRail`** — verify it self-hides when empty so the
   page doesn't show an awkward "0 customers awaiting notification"
   bar on fresh installs.
5. **Sidebar bottom nav** — `BottomNav` (mobile) wasn't touched. Worth
   a brand-color pass.
6. **`SetupChecklist`** — confirm it self-hides for tenants past
   onboarding (it claims to, but worth verification in a live preview).
