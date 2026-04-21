# Promise to Pay & Auto-Payment Confirmation — Setup Notes

## 1. Database Migration

Run the Prisma migration to create the new tables and fields:

```bash
npx prisma migrate dev --name add-promise-to-pay
```

This adds 4 new models (PromiseToPay, PromiseCommitment, PromisePayment, WebhookEventLog) and extends the Payment and PaymentRequest models with provider/verification fields.

After migrating, regenerate the Prisma client:

```bash
npx prisma generate
```

## 2. New Environment Variables

Add these to your `.env` (see `.env.example` for reference):

```env
# Flutterwave — optional second payment provider for customer payments
FLUTTERWAVE_SECRET_KEY=""
FLUTTERWAVE_PUBLIC_KEY=""
FLUTTERWAVE_WEBHOOK_HASH=""
```

Paystack variables (`PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`) are already used for billing. The same keys are reused for customer payment collection via the new PaymentProviderAdapter.

## 3. Webhook URL Configuration

### Paystack Dashboard
Go to **Settings → API Keys & Webhooks** and add a **second webhook URL**:

```
https://your-domain.com/api/webhooks/paystack
```

> **Important:** The existing `/api/billing/webhook` remains untouched for subscription billing. The new `/api/webhooks/paystack` handles customer payment events (PayLinks, Promises to Pay).

Subscribe to these events:
- `charge.success`
- `charge.failed`

### Flutterwave Dashboard
Go to **Settings → Webhooks** and configure:

```
https://your-domain.com/api/webhooks/flutterwave
```

Set the webhook secret hash (same value as `FLUTTERWAVE_WEBHOOK_HASH` in your env).

Subscribe to:
- `charge.completed`
- `charge.failed`

## 4. Vercel Cron Jobs

A new cron job has been added to `vercel.json`:

```json
{ "path": "/api/cron/broken-promises", "schedule": "0 8 * * *" }
```

This runs daily at 8 AM UTC and marks overdue `COMMITTED` promises as `BROKEN`.

Make sure your `CRON_SECRET` environment variable is set on Vercel.

## 5. New Routes Summary

### API Routes (authenticated)
- `POST /api/promises` — Create a new Promise to Pay
- `GET /api/promises` — List promises for the business
- `GET /api/promises/[id]` — Promise detail
- `POST /api/promises/[id]/cancel` — Cancel a promise
- `POST /api/promises/[id]/pay` — Initiate payment (public, no auth required)

### Public Routes (for customers)
- `GET /api/promises/public/[token]` — Get promise data (sanitized)
- `POST /api/promises/public/[token]/commit` — Record customer commitment

### Webhook Routes (provider callbacks)
- `POST /api/webhooks/paystack` — Paystack customer payment webhooks
- `POST /api/webhooks/flutterwave` — Flutterwave customer payment webhooks

### Pages
- `/promises` — Internal promise management list
- `/promises/new` — Create new promise form
- `/promises/[id]` — Promise detail with timeline
- `/promise/[token]` — Public customer-facing promise page

## 6. Testing Flow

### Contact Picker
1. Open any form with a phone field (Payments, Debts, PayLinks, Promises)
2. On supported browsers (Chrome Android, Safari iOS 14.5+), a "Contacts" button appears
3. Tap it to pick a contact from the device
4. If the contact has multiple numbers, a picker popup shows
5. On unsupported browsers, the button simply doesn't render (graceful fallback)

### Promise to Pay — Happy Path
1. Business creates a promise at `/promises/new`
2. Copies the link or sends via WhatsApp
3. Customer opens `/promise/[token]` and sees amount, business name
4. Customer clicks "Pay Now" → redirected to Paystack/Flutterwave checkout
5. Payment provider sends webhook to `/api/webhooks/paystack`
6. Webhook service verifies signature, verifies transaction with provider API
7. Payment confirmation service updates PromiseToPay, creates Payment, generates receipt
8. Business sees notification + auto-confirmed payment on dashboard

### Promise to Pay — Broken Promise
1. Customer commits to pay on a specific date
2. Date passes without payment
3. `/api/cron/broken-promises` marks it as `BROKEN`
4. Dashboard triage shows "X broken promises — follow up needed"
5. Daily Pulse email includes broken promise alert

### PayLink Auto-Confirmation
1. Business sends a PayLink with online payment enabled
2. Customer pays via Paystack/Flutterwave
3. Webhook auto-confirms: PaymentRequest status → `confirmed`, Payment record created
4. Receipt auto-generated and emailed to customer (if email provided)
5. Business sees auto-confirmed amount in Daily Pulse and dashboard

## 7. Architecture Notes

### Provider Abstraction
Both Paystack and Flutterwave implement the `PaymentProviderAdapter` interface:
- `isConfigured()` — checks env vars
- `initTransaction()` — starts a payment session, returns authorization URL
- `verifyTransaction()` — server-side verification of a completed payment
- `verifyWebhookSignature()` — validates webhook authenticity

The `providerRegistry` auto-registers both and exposes `get()`, `default()`, `available()`.

### Idempotency
- Webhook events are logged in `WebhookEventLog` with a unique `eventId`
- Duplicate events are detected before processing
- `confirmPayment()` checks for already-confirmed records before proceeding
- Receipt generation via `ensureForPayment()` is idempotent

### Security
- Webhook signature verification: HMAC-SHA512 (Paystack), hash comparison (Flutterwave)
- Server-side payment verification after webhook (never trust frontend alone)
- Public promise page strips sensitive fields (userId, internal IDs)
- All API routes validate ownership via `guard()` auth context
