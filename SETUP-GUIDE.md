# CashTraka — Setup Guide

Everything in the code is built and ready. To make all features work in production, you need to set environment variables on Vercel for each service below.

---

## How to Set Environment Variables on Vercel

1. Go to **vercel.com** and sign in
2. Click your **CashTraka** project
3. Go to **Settings** (top menu) then **Environment Variables** (left sidebar)
4. For each variable below, type the **Name** (left box) and **Value** (right box), then click **Save**
5. After adding all variables, **redeploy** by running your `DEPLOY-CASHTRAKA.bat` file

---

## 1. Neon Database (Already Connected)

Your database is already working. No action needed.

---

## 2. Paystack (Billing & Subscriptions)

This powers the upgrade/subscription system so users can pay for Business, Business Plus, Landlord, or Estate Manager plans.

**Get your keys:**
1. Go to **dashboard.paystack.com** and sign in (or create an account)
2. Click **Settings** then **API Keys & Webhooks**
3. Copy your keys

**Set these on Vercel:**

| Name | Where to find it |
|------|-----------------|
| `PAYSTACK_SECRET_KEY` | Secret Key (starts with `sk_test_` or `sk_live_`) |
| `PAYSTACK_PUBLIC_KEY` | Public Key (starts with `pk_test_` or `pk_live_`) |
| `PAYSTACK_WEBHOOK_SECRET` | Under Webhook settings on Paystack dashboard |
| `BILLING_REDIRECT_URL` | Set to: `https://cashtraka.vercel.app/billing/callback` |

**Set up webhook on Paystack:**
1. On Paystack dashboard, go to **Settings** then **API Keys & Webhooks**
2. Set Webhook URL to: `https://cashtraka.vercel.app/api/billing/webhook`
3. Copy the webhook secret and save it as `PAYSTACK_WEBHOOK_SECRET` on Vercel

> Use `sk_test_` / `pk_test_` keys for testing. Switch to `sk_live_` / `pk_live_` when ready to accept real payments.

---

## 3. Resend (Email)

This sends receipt emails, welcome emails, billing notifications, and rent reminder emails to landlords.

**Get your key:**
1. Go to **resend.com** and create an account
2. Go to **API Keys** and create a new key
3. To send from your own domain, verify it under **Domains** (optional — you can use Resend's default sender for testing)

**Set these on Vercel:**

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | Your API key from Resend |
| `RESEND_FROM_EMAIL` | e.g. `CashTraka <receipts@yourdomain.com>` or use Resend's test sender |

---

## 4. Uploadcare (File Uploads — Logos & Receipts)

This lets users upload business logos and stores receipt PDFs.

**Get your key:**
1. Go to **app.uploadcare.com** and create an account
2. Go to **API Keys**
3. Copy your Public Key

**Set on Vercel:**

| Name | Value |
|------|-------|
| `UPLOADCARE_PUBLIC_KEY` | Your public key from Uploadcare |

---

## 5. App URL

**Set on Vercel:**

| Name | Value |
|------|-------|
| `APP_URL` | `https://cashtraka.vercel.app` (or your custom domain) |

---

## 6. Cron Secret (Rent Reminders)

The automated rent reminder system runs daily at 8 AM. It needs a secret to prevent unauthorized access.

**Set on Vercel:**

| Name | Value |
|------|-------|
| `CRON_SECRET` | Any long random string (e.g. copy from a password generator) |

---

## Summary Checklist

After setting all variables, your environment should have:

- [x] `DATABASE_URL` (already set)
- [x] `AUTH_SECRET` (already set)
- [ ] `APP_URL`
- [ ] `PAYSTACK_SECRET_KEY`
- [ ] `PAYSTACK_PUBLIC_KEY`
- [ ] `PAYSTACK_WEBHOOK_SECRET`
- [ ] `BILLING_REDIRECT_URL`
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL`
- [ ] `UPLOADCARE_PUBLIC_KEY`
- [ ] `CRON_SECRET`

Once all are set, run `DEPLOY-CASHTRAKA.bat` to deploy with the new configuration.
