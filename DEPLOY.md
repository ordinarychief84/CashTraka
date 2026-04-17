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
