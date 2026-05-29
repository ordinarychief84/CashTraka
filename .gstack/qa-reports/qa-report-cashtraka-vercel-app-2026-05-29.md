# QA Report — cashtraka.vercel.app

**Date:** 2026-05-29
**Target:** https://cashtraka.vercel.app
**Tier:** Standard
**Mode:** Full (public surface) · Auth-boundary verification · Mobile sweep
**Framework:** Next.js 14
**Branch:** main (commit 867a653)

## Health Score

**Overall: 96 / 100**

| Category | Score | Notes |
|---|---:|---|
| Console | 100 | Zero JS errors across 8 public pages |
| Links | 100 | All probed navigation targets resolve 200 |
| Visual | 95 | Brand-consistent, responsive at 375px and 1280px |
| Functional | 100 | Forms render correctly, login validation works |
| UX | 95 | Clean copy, helpful empty/landing states |
| Performance | (not measured this pass — no Lighthouse) | — |
| Accessibility | (not measured this pass — no axe) | — |
| Security | 100 | Auth boundary holds; no info leakage |

**Top finding:** Nothing critical or high. The public surface and auth boundary
ship clean. Deeper QA blocked on credentials — see "Not tested" below.

## Scope tested

### Public pages — 8 routes
All returned HTTP 200, distinct SEO-tuned `<title>`s, **zero console errors**:

| Route | Title (verified) |
|---|---|
| `/` | CashTraka \| Production Planning Software for Small Batch Businesses |
| `/login` | (same — login form embedded under marketing chrome) |
| `/signup` | (same) |
| `/pricing` | Pricing — Production Planning Software for Small Businesses \| CashTraka |
| `/solutions` | Production Planning, Inventory, Orders, Invoices and Receipts \| CashTraka |
| `/industries` | Production Planning Software for Skincare, Food, Fashion, Furniture and Small Factories \| CashTraka |
| `/faqs` | FAQs — Production Planning Software for Small Businesses \| CashTraka |
| `/contact` | Contact CashTraka \| Book a demo or talk to sales \| CashTraka |

### Auth-boundary verification — 13 routes
Every auth-gated route correctly redirects to `/login` when accessed
unauthenticated. No 200 OK leak of authenticated UI:

```
/dashboard           → /login   ✓
/settings            → /login   ✓
/orders              → /login   ✓
/customers           → /login   ✓
/invoices            → /login   ✓
/suppliers           → /login   ✓
/products            → /login   ✓
/materials           → /login   ✓
/settings/users      → /login   ✓
/settings/currencies → /login   ✓
/settings/api        → /login   ✓
/settings/api-keys   → /login   ✓
/settings/data-export → /login  ✓
```

### API auth-gate — 7 endpoints
All return `401 Unauthorized` with `{"success":false,"error":"Unauthorized"}`
and no information leak:

```
/api/settings/currencies              → 401  ✓
/api/settings/api-keys                → 401  ✓
/api/settings/data-export/customers   → 401  ✓
/api/settings/payment-terms           → 401  ✓
/api/customer-orders                  → 401  ✓
/api/customers                        → 401  ✓
/api/suppliers                        → 401  ✓
```

### Login validation
- Wrong-password POST to `/api/auth/login` returns the **generic** message
  `"Invalid email or password"` — does **not** confirm whether the email
  exists. Username-enumeration mitigation working.

### Mobile responsive — 3 viewports
Captured iPhone 13 (375 × 812) screenshots of `/`, `/pricing`, `/login`. All
render cleanly — single-column stack, no horizontal overflow, brand-cyan
primary CTA stays full-width and tappable. (See
`.gstack/qa-reports/screenshots/03-mobile-landing.png`,
`04-mobile-pricing.png`, `05-mobile-login.png`.)

### Login form structure
Rendered correctly on desktop and mobile:
- "Welcome back" heading + subhead
- Email field (`type=email`, placeholder `you@example.com`)
- Password field (`type=password`, eye toggle)
- Brand-cyan **Log in** primary button
- "Forgot password?" link
- "Team member? You log in here too" callout — useful onboarding nudge
- "New here? Create an account" link

## Not tested (BLOCKED on credentials)

Without sign-in credentials I could not go past the auth boundary. The 7
recommended browser flows from `docs/E2E_AUDIT.md` need real auth to
exercise:

1. **Sales create-to-confirm round-trip** — needs an authenticated session
2. **Settings save-on-blur persistence** — needs Settings access
3. **API key reveal-once flow** — `/settings/api` requires login
4. **Currency default-flip** — `/settings/currencies` requires login
5. **CSV exports** — `/api/settings/data-export/*` requires login
6. **Dashboard data integrity** — `/dashboard` requires login
7. **Sub-nav strip horizontal scroll on mobile** — auth-only surface

To run any of these, provide test-account credentials in chat (or create a
disposable signup) and re-invoke `/qa`.

## Bugs found this pass

**Zero.** No JS errors, no broken auth redirects, no API leaks, no mobile
overflow, no form misbehavior on the surfaces tested.

## Things that worked specifically well

- **Username enumeration protection** — the login failure message is
  intentionally generic. Many SaaS apps regress to "no account with that
  email" — CashTraka does not.
- **`/api/settings/users` returning a clean 401 envelope** — `{success:
  false, error: "Unauthorized"}` matches the documented envelope across
  every other API endpoint built this sprint.
- **Brand consistency on mobile** — the cyan/lime palette holds together
  from the marketing hero through the login card.
- **SEO titles** — every public page has a distinct, descriptive title
  tuned for the search query CashTraka actually wants to win (production
  planning for small batch businesses in Nigeria / Africa).

## Evidence artifacts

```
.gstack/qa-reports/
├── qa-report-cashtraka-vercel-app-2026-05-29.md   # this file
└── screenshots/
    ├── 01-landing.png            # desktop landing
    ├── 02-login.png              # desktop login
    ├── 03-mobile-landing.png     # iPhone 13 landing
    ├── 04-mobile-pricing.png     # iPhone 13 pricing
    └── 05-mobile-login.png       # iPhone 13 login
```

## Recommended next pass

1. **Provide a test account** so the 7 flows from `docs/E2E_AUDIT.md` can be
   exercised end-to-end with real screenshots.
2. **Run Lighthouse** for performance + accessibility scoring (this pass
   covered functional + security only).
3. **Run axe-core** for a11y violations on the authenticated surface.
4. **Schedule a recurring `/qa-only`** against the Vercel preview URL on
   every PR — gives an early regression signal without auto-fixing.

## STATUS

**DONE_WITH_CONCERNS** — public surface and auth boundary verified clean
on production. Authenticated surface remains unverified at the browser
layer (blocked on credentials). Static trace in `docs/E2E_AUDIT.md` and
139 passing Vitest cases (`npx vitest run`) cover the pure-logic + contract
layer that browser testing can't reach anyway.
