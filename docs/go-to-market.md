# CashTraka — Go-to-Market Plan

> Status as of 2026-05-04. Production: https://www.cashtraka.co
>
> This document is the single source of truth for "what's left to ship before paying customers." Sorted by phase, then priority. Each item has a concrete owner, rough effort, and a one-line "why it matters" so anyone can pick up the work and know what done looks like.

---

## Phase 0 — Launch blockers (must ship)

These prevent legal, financial, or technical operation as a paid product. **None can be skipped.**

### 0.1 Legal triad
| Item | Effort | Owner | Status |
| --- | --- | --- | --- |
| **Terms of Service** | 4–8h (template + lawyer review) | Founder + lawyer | ❌ Not started |
| **Privacy Policy** | 4–8h (template + lawyer review) | Founder + lawyer | ❌ Not started |
| **NDPR compliance: data-export + account-deletion endpoints** | 1–2 days | Dev | ❌ Not started |

**Why it matters:** Nigerian Data Protection Regulation (NDPR) requires both the policy AND a working data-subject request flow. Paystack will refuse to onboard a merchant without ToS + Privacy on the public site. Stripe-equivalent risk in Nigeria: NDPC fines.

**What to build for NDPR:**
- `/api/account/export` — downloads all User-owned data as a JSON ZIP
- `/api/account/delete` — soft-delete (we already have `User.deletedAt` and `onDelete: Restrict` for tax records); render a 30-day grace + final hard-delete cron
- Page at `/settings/privacy` exposing both buttons + the published policy text

**Templates that work for Nigerian SMB SaaS:** Termly, iubenda. Don't try to write from scratch; pay a lawyer to review the generated draft.

---

### 0.2 Billing path proven end-to-end against live Paystack
| Item | Effort | Owner | Status |
| --- | --- | --- | --- |
| Paystack live keys configured in Vercel prod env | 1h | Founder | ⚠️ Unknown — verify |
| Subscribe → first charge → renewal → failed-charge retry → cancel walked through with a real card | 1 day | Dev + founder | ❌ Not started |
| Webhook signature verified against Paystack live signature | already done in code | n/a | ✅ Code exists |
| Refund flow tested (admin-side already exists) | 2h | Dev | ⚠️ Code exists, untested live |
| Failed-renewal grace period + dunning emails wired | 1 day | Dev | ❌ Not started (no dunning sequence) |

**Why it matters:** If subscription billing breaks silently, you have no business. The code in `src/lib/services/billing.service.ts` is real but I have no evidence it's been exercised against the live Paystack environment with a real card. Untested billing = guaranteed first-month chaos.

**Test matrix:**
- New user: signup → upgrade to paid plan → card charged → email receipt arrives
- Recurring: simulate next-period renewal (Paystack test webhook) → status updated, receipt email sent
- Failed charge: card declined → status `past_due` → user sees dunning prompt → user re-enters card → recovery
- Cancel: user clicks cancel → status `cancelled` → access removed at period end (not immediately)
- Refund: admin issues refund → Paystack refund call returns success → audit log + customer email

---

### 0.3 Email deliverability verified
| Item | Effort | Owner | Status |
| --- | --- | --- | --- |
| Resend domain verified (SPF, DKIM, DMARC for cashtraka.co) | 1h | Founder | ⚠️ Unknown — verify |
| Test send to gmail / outlook / yahoo / proton — none land in spam | 1h | Founder | ❌ Not started |
| `noreply@cashtraka.co` reply-handling: either auto-respond with support email or rotate to a real inbox | 2h | Founder | ❌ Not started |

**Why it matters:** Receipt emails to customers and dunning emails to sellers are the entire delivery infrastructure for the business. If Gmail spam-folders 30% of them, churn is invisible and brutal.

---

### 0.4 Production smoke matrix run after every deploy
A 10-minute manual checklist run by the founder before announcing a new feature. Document at `docs/smoke-test.md`:

- [ ] `/` loads in under 1.5s
- [ ] `/login` accepts a real test account
- [ ] Create a payment via `/payments/new` → receipt PDF downloads
- [ ] Create an invoice via `/invoices/new` → email arrives at a real inbox
- [ ] Pay an invoice via the public link → Paystack hosted page → return → receipt
- [ ] Generate a VAT return for a period that has VAT-applied invoices → numbers match expectation
- [ ] Add an expense → P&L on `/reports` updates
- [ ] Catalog: `/store/[slug]` renders, "Order on WhatsApp" opens wa.me

**Effort:** 30 minutes per deploy. Owner: founder until you hire ops support.

---

### 0.5 Sentry (or equivalent) error monitoring on production
| Item | Effort | Owner | Status |
| --- | --- | --- | --- |
| Sentry account, DSN in Vercel env, `@sentry/nextjs` wired into `next.config.js` | 2h | Dev | ❌ Not started |
| Source maps uploaded on every prod deploy | already if using Sentry's Vercel integration | n/a | n/a |
| Alert on >1% error rate or >5 errors/minute | 30min config | Founder | ❌ Not started |

**Why it matters:** You have 73 pre-existing TypeScript errors that don't fail the build but might surface as runtime errors. Without monitoring, the first time you'll know about a production crash is when a customer emails to complain — and the legitimate ones won't email, they'll just churn.

Cheap alternative if Sentry is too pricey: Vercel's built-in log drain to a free Better Stack / Logtail account, with an alert rule on `level=error` matching count > 5 in 1m.

---

### 0.6 Status page
| Item | Effort | Owner | Status |
| --- | --- | --- | --- |
| `status.cashtraka.co` (BetterStack free tier or Statuspage trial) | 2h | Founder | ❌ Not started |
| Synthetic uptime monitor for `/`, `/login`, `/api/health` | 30min | Founder | ❌ Not started |

**Why it matters:** When (not if) Paystack has an outage, sellers will think CashTraka is broken. Pointing them at a status page reduces support load 10×. Skip if budget is tight — a Twitter/X account that the founder updates manually is enough for the first 100 customers.

---

## Phase 1 — Launch readiness (should ship before public launch)

### 1.1 Onboarding email sequence
The codebase has `sendWelcome` and `sendDailyPulse` but no full nurture sequence. Customers signup, see the empty dashboard, drop off.

**5-email sequence to write + queue (cron-driven):**
- T+0min: welcome with a 60-second loom-style explainer (founder records it)
- T+24h if no payment recorded: "How to add your first payment in 30 seconds" (with screenshot)
- T+72h if no invoice sent: "Send your first invoice via WhatsApp" (with screenshot)
- T+7d: "Your first week — top 3 things to try" (Service Check feature, recurring invoices, debt reminders)
- T+14d: trial-end nudge OR upgrade prompt with social proof

**Effort:** 1 day for the cron + templates, plus founder time recording the loom and writing copy.

---

### 1.2 Help center / FAQ
A static `/help` page with 15–20 articles covering the most-asked questions:

- How do I record a payment?
- Customer says they paid via transfer — how do I confirm?
- How does the Tax+ VAT return work?
- I'm getting "card declined" on subscription — what do I do?
- Can I export my data?
- How do I add a staff member?
- The receipt didn't reach my customer's email — what now?
- WhatsApp share isn't opening on iPhone — fix?
- How do I change my receipt prefix / branding?

**Effort:** 2–3 days. Founder writes; dev wires the static MDX route. Pattern: grab the BlogPost model, route it at `/help/[slug]`, restrict status to `published` only.

---

### 1.3 Customer support channel
Pick exactly one for first 100 customers:
- **Cheapest:** `support@cashtraka.co` inbox + a "Help" link in the dashboard. Founder personally answers. Goal: 4-hour first response during business hours.
- **Better:** Tawk.to (free chat widget) on the marketing site + `support@`.
- **Avoid for now:** Intercom, Zendesk. Premature.

**Effort:** 2h to set up + a `/contact` page link. Operationally: founder needs a `support@` inbox check 3× per day until you hire.

---

### 1.4 5–10 design partners
Pick 5–10 NGA SMBs (the ones you've been talking to during the build) and onboard them personally before public launch. Goals:
- Validate pricing — does ₦25k/mo Tax+ feel right?
- Find blocking bugs that don't show up in synthetic testing
- Generate testimonials for the landing page
- Identify the ONE feature that converts free → paid (probably WhatsApp invoice sharing or the receipt engine)

**Effort:** 2 weeks of founder time, 1 onboarding call per customer, weekly check-ins.

**Recruiting list:** food vendors, fashion sellers, salons, property managers, freelancers. Categories your business model targets.

---

### 1.5 Pricing-tier final QA
Walk every plan through end-to-end:
- Free: customer cap (current Limits.customers value), feature gates fire correctly
- Paid (Pro?): all gates open, billing recurs
- Tax+ (₦25k/mo): VAT returns + accountant pack + ACCOUNTANT role gates open

You changed plan limits multiple times during build. Likely something is misconfigured. Spend 1 hour with `/admin/users/[id]/overrides` to walk through each plan and verify gates.

**Effort:** 1h.

---

### 1.6 2FA option for sellers
Owner accounts hold financial data. 2FA is table-stakes.

- Use TOTP (Google Authenticator / 1Password compatible) — no SMS provider required.
- Settings page: "Enable two-factor authentication" → QR + recovery codes.
- Login flow: post-password, prompt for 6-digit code if enabled.

**Effort:** 1 day. Schema add: `User.totpSecret String?`, `User.totpEnabled Boolean @default(false)`, `User.recoveryCodes String[]`.

---

### 1.7 Cancellation + refund-policy copy on the marketing site
- Public refund policy at `/legal/refunds`
- "Cancel subscription" works in `/billing` settings (code already exists, just verify the cancellation grace period)

**Effort:** 1h.

---

## Phase 2 — Launch week

### 2.1 PR / press list
- Tech: TechCabal, TechPoint Africa, Disrupt Africa, Benjamin Dada
- SMB community: BellaTV (segments on small business), Twitter/X NaijaSMB hashtag
- Local groups: Lagos Chamber of Commerce, NESG SMB working group

**Effort:** Founder time, 2 weeks of pitching ahead of launch day. Email template + 5-minute pitch.

### 2.2 Product Hunt launch
Tuesday or Wednesday. Hunter who's NGA-known. Launch checklist: hero image, 60-second demo loom, founder availability for 24h to answer comments.

**Effort:** 1 week of prep.

### 2.3 Twitter/X / LinkedIn announcement
Pre-write the thread. Include: 60-second demo, the specific pain (chasing debts on WhatsApp), the unique angle (FIRS/VAT compliance built-in), and a clear CTA (`cashtraka.co?utm_source=twitter_launch`).

### 2.4 Founder availability
Block a full week after launch for support. Expect 50+ first-touch tickets in week 1, mostly "how do I…" questions. These become Help Center articles.

---

## Phase 3 — First 90 days post-launch

### 3.1 FIRS real adapter
Replace `NoopFIRSAdapter` in `src/lib/services/firs-invoice.service.ts` with a real HTTP client once you onboard with FIRS MBS. The scheduled remote agent at `trig_01LD6bjpMEKgBtjo2pEMTvJD` (currently disabled) was set up exactly for this — re-enable when env vars `FIRS_API_BASE_URL` + `FIRS_API_KEY` are configured.

**Effort:** 2–3 days once FIRS docs + test creds are in hand.

### 3.2 Mono bank sync (or alternative)
The Mono partnership outreach docs are already drafted. Close the partnership, integrate, replace stubs in `src/lib/services/mono-bank.service.ts`.

**Effort:** 1 week post-Mono signoff.

### 3.3 Wema/Sterling/Providus virtual accounts
Same. Partnership outreach drafted. The schema (`VirtualAccount` model) is ready.

**Effort:** 2 weeks post-bank signoff per bank.

### 3.4 Phase 6 read-flip tail
~25 files documented in `docs/kobo-migration-plan.md`. Mechanical. Junior dev can knock them out in a week.

### 3.5 Phase 7 — drop legacy naira columns
Only after Phase 6 is 100%. Database snapshot before. Single migration.

**Effort:** 0.5 day + 48h soak period.

### 3.6 Blog SEO content
The `BlogPost` model exists. Publish 8–10 articles in the first 90 days, each targeting a long-tail Nigerian SMB query: "how to send invoice on WhatsApp", "how to file VAT in Nigeria", "what is FIRS MBS", "how to track customer debts as a small business".

Each post: 800–1500 words, internal link to the relevant feature page.

### 3.7 Referral program
"Refer a business, get 1 month free." Schema add: `User.referralCode`, `User.referredById`, `User.referralCreditMonths`. Track in admin dashboard.

**Effort:** 2 days.

### 3.8 PWA install prompt sharpening
Already exists per the manifest. Track install rate in analytics; if low, add an in-app prompt after the user has done their 3rd action.

### 3.9 Cohort retention dashboard
For your own use, not the customer's. Weekly cohort, % active in week 1 / 2 / 4 / 8. Build in admin section. Without this, you're flying blind on retention.

**Effort:** 1 day with the existing analytics.service.ts.

### 3.10 Pricing experiments
Collect 60 days of paying-customer data, then A/B test ₦25k Tax+ vs ₦20k or ₦30k. The plan-tier code already supports this.

---

## Phase 4 — Ongoing operational

### 4.1 Customer support workflow
- Monday/Wednesday/Friday: triage `support@` inbox in the morning
- Anything reproducible → ticket in Linear / Notion
- Anything that needs code → branch + PR; founder reviews same day

### 4.2 Incident response runbook
`docs/incident-response.md` — 1-page checklist for: site down, DB down, Paystack outage, mass-churn event. Who to call, what to check first, how to communicate with users.

**Effort:** 2h.

### 4.3 Monthly metric review
First Monday of each month, founder writes a 10-line note:
- Total users, new users, churned users
- MRR, NRR
- Top 3 support themes
- Top 3 things that broke
- One bet for the next month

Without this rhythm, you optimize the wrong thing.

### 4.4 Service Check loop
The Service Check feature is built. Every receipt + invoice paid sends a feedback link. Negative feedback alerts the seller. Make sure the founder also gets a copy of negative feedback for the first 6 months — if a CashTraka-using business gets bad feedback, that's signal you can act on (educate, build features, refund).

### 4.5 Backup verification
Neon has built-in backups. Quarterly: founder restores a backup to a test DB and verifies tables are populated. Without verification, "we have backups" is a fiction.

**Effort:** 1h per quarter.

### 4.6 KYC / business verification (Tax+ tier only)
Tax+ submits to FIRS on behalf of the seller. You probably need verified TIN + business registration before letting someone enable that flow. Block enabling Tax+ until `User.tin` matches a CAC lookup.

**Effort:** 2 days once you pick a CAC verification provider (e.g. Smile Identity, Verified.ng).

---

## Risk register

The four things that can kill this product if they go wrong:

1. **Paystack ban / suspension.** Mitigation: Flutterwave fallback (already half-built). Don't let Paystack be the sole rail.
2. **NDPC fine for missing privacy compliance.** Mitigation: Phase 0.1, before any paid customer.
3. **A first-week regression breaks billing for existing customers.** Mitigation: Phase 0.4 smoke matrix + Phase 0.5 monitoring.
4. **Crash on launch day from a single tweet driving 10× expected traffic.** Mitigation: Vercel's auto-scaling handles it; the DB is the bottleneck. Verify Neon's connection pool can handle 100 concurrent.

---

## What this document is NOT

- A feature list. The product is feature-complete enough; new features come post-launch.
- A marketing plan. That's a separate doc — once you have testimonials from design partners.
- A hiring plan. Solo-founder operable until ~100 paying customers.

---

## TL;DR

If I had to pick the **3 things to do this week** before doing anything else:

1. **NDPR data-export + delete endpoints + ToS/Privacy on the public site.** (Phase 0.1)
2. **Walk one real card through Paystack subscribe → renew → cancel.** (Phase 0.2)
3. **Recruit 3 design partners and onboard them by next Monday.** (Phase 1.4)

Everything else is optimization. These three are the gates.
