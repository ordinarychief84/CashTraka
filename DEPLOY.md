# CashTraka — Production Deployment Guide

This document walks you through the only steps that still need **you** to run.
Everything in the codebase is production-ready — the gap is configuration.

---

## 0. Prerequisites (one-time)

You need accounts on:

| Service | Why | Free tier OK? |
|---|---|---|
| **Vercel** (or Railway) | Hosts the Next.js app | ✓ (Hobby plan) |
| **Neon** (or Supabase / Railway) | Production Postgres | ✓ |
| **Paystack** | Real payments (live keys) | N/A |
| **Resend** | Transactional emails | ✓ (100/day) |
| **Uploadcare** | Receipt PDF + logo storage | ✓ (25 GB/month) |
| **GitHub** | Already set up — repo at `ordinarychief84/CashTraka` | ✓ |
| **Your domain** | e.g. `cashtraka.co` (you mentioned this one) | N/A |

---

## 1. Switch Prisma to Postgres

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // was "sqlite"
  url      = env("DATABASE_URL")
}
```

Commit and push.

---

## 2. Provision Postgres

### Neon (recommended — serverless, pooled connections included)

1. Sign up at https://neon.tech
2. Create a project named `cashtraka-prod`
3. Copy the **pooled** connection string — should look like:
   ```
   postgres://user:pass@ep-cool-brook-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Save it — this is your `DATABASE_URL`.

---

## 3. Generate secrets

```bash
# Strong session secret
openssl rand -base64 32
# → paste into AUTH_SECRET env var
```

---

## 4. Paystack live keys + webhook

1. In Paystack dashboard → **Settings → API Keys & Webhooks**, copy:
   - `sk_live_...` → `PAYSTACK_SECRET_KEY`
   - `pk_live_...` → `PAYSTACK_PUBLIC_KEY`
   - **Webhook signing secret** → `PAYSTACK_WEBHOOK_SECRET`
2. In the same page, add a new webhook:
   - URL: `https://YOUR-DOMAIN/api/billing/webhook`
   - Events: `charge.success`, `invoice.payment_failed`, `subscription.disable`
3. Do **not** add the old test keys to the production env.

---

## 5. Resend domain verification

1. Sign in at https://resend.com
2. **Domains → Add Domain** → `cashtraka.co`
3. Add the DNS records (SPF + DKIM) Resend gives you to your domain registrar.
4. Wait until Resend shows "Verified" (usually 5-30 min).
5. Set `RESEND_FROM_EMAIL="CashTraka <hello@cashtraka.co>"` (or whatever inbox you want it sent from).

While unverified, use `RESEND_FROM_EMAIL="onboarding@resend.dev"` — Resend's sandbox — but it can only send to the email address that owns the Resend account (useful for your own testing, not for users).

---

## 6. Uploadcare

1. Sign up at https://uploadcare.com
2. **Dashboard → Product Environment → API Keys**, copy the full **API Environment Variable** value:
   ```
   UPLOADCARE_PUBLIC_KEY=uploadcare://<real_api_key>:<real_api_secret>@<cloud_name>
   ```
3. Until this is set, receipt PDFs render on-demand but aren't stored as hosted URLs, and logo upload returns 503.

---

## 7. Deploy to Vercel

### 7a. Connect the repo

1. https://vercel.com/new → Import `ordinarychief84/CashTraka`
2. Framework preset: Next.js (auto-detected)
3. Build command: `prisma generate && next build` (already in package.json)
4. **Don't deploy yet** — set env vars first.

### 7b. Set every env var

In Vercel → Project Settings → Environment Variables, add each for the **Production** environment:

```
DATABASE_URL                = postgres://... (from step 2)
AUTH_SECRET                 = <result of openssl rand -base64 32>
APP_URL                     = https://cashtraka.co
BILLING_REDIRECT_URL        = https://cashtraka.co/billing/callback

PAYSTACK_SECRET_KEY         = sk_live_...
PAYSTACK_PUBLIC_KEY         = pk_live_...
PAYSTACK_WEBHOOK_SECRET     = <from Paystack webhooks page>

RESEND_API_KEY              = re_...
RESEND_FROM_EMAIL           = CashTraka <hello@cashtraka.co>

UPLOADCARE_PUBLIC_KEY              = uploadcare://...:...@...
```

### 7c. First deploy

Click **Deploy**. Vercel runs `prisma generate && next build`.

### 7d. Point your domain

Project Settings → Domains → add `cashtraka.co`. Follow Vercel's instructions to point the domain's A/CNAME records.

---

## 8. Seed the production database

This runs **once** after the first deploy.

On your laptop, temporarily export your production `DATABASE_URL` and run:

```bash
# Make sure you're looking at Neon, not local SQLite!
export DATABASE_URL="postgres://..."
npx prisma migrate deploy
npx prisma db seed
```

**Important**: edit `prisma/seed.ts` first and change the admin email from `admin@cashtraka.app` to your real operations email. Otherwise anyone who knows the default credentials can sign in as admin.

---

## 9. Smoke-test production

Open `https://cashtraka.co` and:

- [ ] Sign up a real account using your personal email — receive welcome email
- [ ] Log in as admin — verify `/admin/dashboard` loads with real data
- [ ] Create a payment as a demo seller
- [ ] Click "Generate receipt" → generate → send via WhatsApp
- [ ] Try upgrading to Business plan — complete Paystack test-mode checkout if you haven't switched to live yet
- [ ] Verify the Paystack webhook fires — check Paystack dashboard's webhook log
- [ ] Check that the receipt PDF is hosted on Uploadcare (URL contains `res.uploadcare.com`)

---

## 10. Post-launch checklist (first week)

- [ ] Monitor Vercel logs for any 5xx
- [ ] Check Paystack webhook delivery rate — 100% success if everything is wired
- [ ] Verify Resend inbox delivery for a real email (not resend.dev)
- [ ] Rotate the test credentials you pasted in chat (Paystack test keys, Resend key)
- [ ] Tackle the follow-up chips queued in this session:
  - CSRF + rate limiting
  - Auth pattern consolidation
  - Marketing polish (social proof, ICP toggle sync)
  - Prune dead dashboard components
  - Shopslug dead-code cleanup

---

## One-command local migration script

If you'd rather do step 8 from a script, save this as `scripts/deploy-migrate.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Requires: DATABASE_URL pointing at production Postgres.
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL first. Aborting." >&2
  exit 1
fi

echo "→ Running prisma migrate deploy against production DB..."
npx prisma migrate deploy

echo "→ Seeding admin (skip if already seeded)..."
read -p "Run seed? [y/N] " yn
if [[ "$yn" == [yY] ]]; then
  npx prisma db seed
fi

echo "Done."
```

---

## Rollback

Every deployment creates a new Vercel deployment URL. To roll back:

- Vercel dashboard → Project → Deployments → find the last-known-good one → **Promote to Production**.

For schema rollbacks, Prisma migrations are forward-only. If you need to roll back a bad migration, you'll need to write an inverse migration. Don't delete from `prisma/migrations/` — that causes drift errors.


<!-- deploy trigger 2026-04-18 -->

---

# Operational Autopilot release — May 2026

Notes for deploying the bundle of features shipped in PRs #63–#72.
Apply these on top of an already-running deployment.

## A. Schema changes

Three additive changes — all backwards-compatible. New tables are
empty until used; new columns default to NULL.

| Table | Column | Source | Notes |
|---|---|---|---|
| `Customer` | `creditLimitKobo` `INTEGER NULL` | PR #64 | Per-customer credit cap (kobo). NULL = no cap. |
| `User` | `starterPackOfferedAt` `TIMESTAMP(3) NULL` | PR #72 | One-time gate marker for the starter-pack picker. |
| `ProductionTemplate` | _new table_ | PR #65 | Recurring production rules ("every Monday: 50 black soaps") |
| `ProductionTemplateItem` | _new table_ | PR #65 | Per-template product + quantity rows |

### Migration paths

**Recommended (CI):**

```bash
npx prisma migrate deploy
```

Applies `prisma/migrations/20260515_add_production_templates/migration.sql`
plus any newer files.

**Runtime fallback:**

```bash
curl -X GET "${APP_URL}/api/migrate" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "x-migrate-secret: ${MIGRATE_SECRET}"
```

Idempotent. Uses `ADD COLUMN IF NOT EXISTS` + `CREATE TABLE IF NOT EXISTS`,
so safe to re-run. The response JSON lists every column with `OK:` or `FAIL:`.

## B. New env vars

None added in this release. Every new feature reuses existing vars
(`CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL`).

If your deploy is from before March 2026 you'll also want `MIGRATE_SECRET`
set — generate via `openssl rand -base64 32`. Without it `/api/migrate`
returns 401 even with a valid `CRON_SECRET`.

## C. New cron routes (4)

Added to `vercel.json`. Vercel re-reads the file automatically on deploy.

| Cron | UTC schedule | What it does | Plan-gated? |
|---|---|---|---|
| `daily-summary` | `0 18 * * *` | End-of-day operational recap email at 7pm WAT | Yes (Pro+) |
| `run-production-templates` | `0 5 * * *` | Spawn ProductionOrders from recurring templates | No |
| `auto-po-draft` | `0 8 * * *` | Draft purchase orders from low-stock materials, email owner | Yes (Pro+) |
| _(existing)_ `low-stock-check` | `15 7 * * *` | Unchanged; feeds the auto-PO cron at 8am |

After deploy, verify the Vercel cron dashboard shows **16 entries**
(13 pre-existing + the 3 new ones; `low-stock-check` was already there).

## D. Feature gating

PR #63 added `Limits.dailySummary` and PR #66 added `Limits.autoPurchaseOrders`,
both gated to Pro plan and above. Free users:

- Don't receive the daily summary email (cron skips them)
- Can't run auto-PO drafting (the UI button shows an upgrade chip; the API returns 403)

If you need to grant a free user temporary access for testing, set their
`plan` column to `pro_monthly` directly — no Paystack subscription needed.

## E. First-deploy smoke test (5 minutes)

After applying schema migrations:

1. `GET ${APP_URL}/api/healthcheck` returns 200
2. `/api/migrate` returns 200 with no `FAIL:` rows
3. Sign in to an existing account; dashboard renders normally
4. Create a brand-new tenant (sign up + verify email); dashboard
   redirects to `/onboarding/starter-pack` on first visit (PR #72 gate)
5. Pick the skincare pack → 13 materials + 8 products + 8 recipes appear
6. On an existing customer, set a credit limit; try to create a debt
   that exceeds it — should return 422
7. Create a production template via `/production/templates` → tap
   "Run now" → ProductionOrder spawns
8. Create a material at/below reorder level with a supplier assigned
   → click "Auto-draft POs" on `/materials` → DRAFT PO appears

Within 24h:

- Daily summary email arrives at the test address at ~19:00 WAT
- Auto-PO digest arrives at ~09:00 WAT if anything's eligible
- Vercel cron logs show all 16 crons firing

## F. Known issues / non-blockers

### Local Windows builds

`next build` on a path with spaces (e.g. `C:\Users\JANE EBERE\Desktop\...`)
fails on `tailwind-merge` resolution and a `bcryptjs` parse. Neither
reproduces on Vercel's Linux build env — confirmed by every production
deploy succeeding through the autopilot series.

Mitigation for local dev: develop on WSL or move the project to a
space-free path.

### Daily-summary email delivery

If `RESEND_API_KEY` or `RESEND_FROM_EMAIL` aren't set, the cron still
runs and stamps idempotency, but emails fail silently with
`{ok: false, error: "Email is not configured ..."}`. Check the cron
log JSON — `skipped.noEmail` should be 0 in healthy state.

## G. Rollback

The release is additive. Rolling back the application code is safe —
the new columns become unused but no existing reads break.

If you also need to drop the schema:

```sql
DROP TABLE IF EXISTS "ProductionTemplateItem";
DROP TABLE IF EXISTS "ProductionTemplate";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "creditLimitKobo";
ALTER TABLE "User" DROP COLUMN IF EXISTS "starterPackOfferedAt";
```

Don't drop these while the autopilot code is still running — the
runtime will throw `P2025` errors on every customer/template read.

