# CashTraka — Process Flow

How the system works end to end, from signup through daily operations, automation, and billing.

---

## 1. Onboarding flow (one-time)

```
Visitor lands on cashtraka.co
        │
        ▼
Clicks "Start 30-day free trial"
        │
        ▼
/signup — name, email, password
        │
        ├──► User row created with:
        │       plan = pro_monthly
        │       subscriptionStatus = trialing
        │       trialEndsAt = now + 30 days
        │
        ├──► Verification OTP email (Resend)
        ├──► Trial-started email ("30 days of full access")
        │
        ▼
/onboarding — business name, type, currency
        │
        ▼
/onboarding/starter-pack — pick a vertical
        │
        ├──► Skincare (13 materials / 8 products / 8 recipes)
        ├──► Food (14 / 8 / 8)
        ├──► Fashion (10 / 8 / 8)
        ├──► Printing (8 / 6 / 6)
        │
        ▼
/dashboard — Pro features unlocked for 30 days
```

---

## 2. Core operational loop (the daily flow)

```
                    ┌─────────────────────────────────────┐
                    │  /dashboard — see what needs doing  │
                    └────────────────┬────────────────────┘
                                     │
   ┌─────────────────────────────────┼─────────────────────────────────┐
   │                                 │                                 │
   ▼                                 ▼                                 ▼
ORDERS                          PRODUCTION                        MATERIALS
   │                                 │                                 │
   │ Customer requests a product     │                                 │
   ▼                                 │                                 │
/orders/new (CO-00001)               │                                 │
   │                                 │                                 │
   │ Status: NEW → CONFIRMED         │                                 │
   ▼                                 │                                 │
"Plan production"  ──────────────────┤                                 │
                                     │                                 │
                                     ▼                                 │
                          ProductionOrder created                      │
                                     │                                 │
                                     ▼                                 │
                  Recipe lookup: each product needs X material         │
                                     │                                 │
                                     ▼                                 │
                  ┌──────────────────┴──────────────────┐              │
                  │  Lead-time aware shortage check     │              │
                  │  (materials.stock vs recipe.needs   │              │
                  │   minus supplier lead times)        │              │
                  └──────────────────┬──────────────────┘              │
                                     │                                 │
                ┌────────────────────┴────────────────────┐            │
                │                                         │            │
        ✓ Enough materials                        ✗ Shortage           │
                │                                         │            │
                ▼                                         ▼            │
       Status: IN_PRODUCTION                  Auto-PO draft ──────────►│
                │                                         │            │
                ▼                                         ▼            │
       Stock deducted (StockMovement)          /purchase-orders/new    │
                │                                         │            │
                ▼                                         ▼            │
       Status: COMPLETED                       Status: DRAFT → SENT    │
                │                                         │            │
                │                              (email/WhatsApp to      │
                │                               supplier)              │
                │                                         │            │
                │                                         ▼            │
                │                              "Receive PO" ──────────►│
                │                                                      │
                │                          Materials stock incremented │
                │                          via StockMovement           │
                ▼
       Order ready for delivery
                │
                ▼
INVOICES                                  RECEIPTS
   │                                          │
   │ Auto-create on order completion          │
   ▼                                          │
/invoices/[id]                                │
   │                                          │
   │ Send via WhatsApp or email               │
   ▼                                          │
Customer pays via Paystack ────────►  Webhook verified
                                              │
                                              ▼
                                     Receipt auto-generated
                                     (source = PAYSTACK)
                                              │
                                              ▼
                                     WhatsApp share to customer

   OR — customer pays in cash/transfer:
        │
        ▼
   /payments/from-alert — paste bank SMS
        │
        ▼
   Parser extracts amount + sender → unverified Payment
        │
        ▼
   You confirm → Receipt generated
```

---

## 3. Background automation (Vercel cron jobs)

| UTC time   | Job                          | What it does                                          |
|------------|------------------------------|-------------------------------------------------------|
| 03:00      | compute-scores               | Customer behaviour tags                               |
| 04:00      | run-subscriptions            | Paystack renewals                                     |
| 05:00      | run-recurring-invoices       | Spawn invoices on recurring schedules                 |
| 05:00      | run-production-templates     | Spawn recurring production batches                    |
| 06:00 1,15 | run-installment-charges      | Auto-debit installments                               |
| 07:00      | trial-check                  | 3-day warning + expiry downgrade                      |
| 07:15      | low-stock-check              | Notification + email when stock ≤ reorder level       |
| 07:30      | welcome-email                | Onboarding sequence                                   |
| 07:45      | expiring-materials           | Materials expiring within 14 days                     |
| 08:00      | auto-po-draft                | Build POs from shortages                              |
| 08:00 Mon  | weekly-summary               | Revenue + activity rollup                             |
| 09:00      | run-reminders                | Invoice nudges                                        |
| 09:30      | overdue-production           | Flip status to DELAYED + audit log                    |
| 10:00      | broken-promises              | Missed promise-to-pay follow-up                       |
| 18:00      | daily-summary                | 7pm Lagos recap (Pro+ only) with WhatsApp share link  |

Each cron is guarded by `isAuthorizedCronRequest()` (Bearer `CRON_SECRET`). Idempotent per UTC day via a `Notification` row keyed by `(userId, type, today)` — re-runs no-op.

---

## 4. Customer touchpoints (outbound)

```
Order confirmed  ──► WhatsApp link to customer
                      "Order CO-00001 received, due 22 May"

Production done  ──► WhatsApp link
                      "Your order is ready for pickup"

Invoice issued   ──► WhatsApp link with Paystack pay button
                      OR email with PDF attached

Payment received ──► Receipt PDF auto-shared
                      OR /receipts/[id] public link

Post-delivery    ──► Service Check feedback request
                      ("How was your experience?")
                      → rating + comment back to /service-check
```

All WhatsApp interactions go through `wa.me` deep links — no WhatsApp Business API. The owner taps a generated link, WhatsApp opens with the prefilled message, they review and send.

---

## 5. Billing lifecycle

```
Day 0      Signup → Pro trial active (full access)
Day 27     "Trial ending in 3 days" email
Day 30     Trial ends — cron downgrades:
           plan = free, subscriptionStatus = free
           Pro features gated with 402/403 + upgrade chip

           User can:
             a) Continue on Starter (free, capped)
             b) Click "Upgrade to Pro" → Paystack hosted checkout
                ↓
                Webhook verifies → plan back to pro_monthly
                                  subscriptionStatus = active
                                  currentPeriodEnd = now + 30d
             c) Move to Business — same flow, ₦35k/mo
```

---

## 6. RBAC layer (cross-cutting)

Every page is guarded by four layers, evaluated in order:

| Layer              | Purpose                                                       |
|--------------------|---------------------------------------------------------------|
| `guard()`          | Must be logged in (session cookie valid)                      |
| `can(role, perm)`  | Owner / staff / accountant / viewer permissions               |
| `hasFeature()`     | Does the current plan include this capability                 |
| `enforceQuota()`   | Server-side count check (50 orders/mo on free, etc.)          |

When a gate fails:

- **UI** — sidebar/button renders an `<UpgradeChip>` instead of the action.
- **Server** — action attempt returns `402 Payment Required` with an upgrade JSON payload; the client pops the upgrade modal.

---

## 7. Data model — the trunk

A simplified view of the core tables and how they connect:

```
User (1) ─── (∞) CustomerOrder ─── (∞) CustomerOrderItem ──► Product
  │                  │
  │                  └── (1) ProductionOrder ── (∞) ProductionOrderItem ─► Product
  │                                                                          │
  │                                                                          │
  │                                                                  Recipe ─┘
  │                                                                     │
  │                                                                     └── (∞) RecipeItem ──► RawMaterial
  │
  ├─── (∞) PurchaseOrder ── (∞) PurchaseOrderItem ──► RawMaterial
  │           │                                              │
  │           └── Supplier ◄─────────────────────────────────┘
  │
  ├─── (∞) Invoice ── (∞) Payment ── (∞) Receipt
  │
  ├─── (∞) StockMovement   ← unified ledger for PRODUCT and MATERIAL stock changes
  │
  └─── (∞) Notification    ← cron idempotency + in-app alerts
```

Every table carries `userId` for tenant scoping and (for the new operational-planning models) a `deletedAt` soft-delete column. Money fields are stored in **kobo** (`Int`) with a `*Kobo` suffix.

---

## 8. The six daily questions CashTraka answers

The product is built around the six questions a small batch business owner asks every morning:

1. **What do I need to fulfil today?** → `/orders` (status NEW/CONFIRMED, sorted by `dueAt`)
2. **What do I need to produce?** → `/production` (status PLANNED/IN_PRODUCTION)
3. **What materials am I missing?** → Material Shortage Alerts on `/dashboard`
4. **What do I need to buy?** → Auto-drafted POs on `/purchase-orders` + Low Stock alerts
5. **What was produced and sold?** → `/reports` (Production Summary + Sales Summary)
6. **What's running low?** → Low Stock rail on `/materials` + Expiring Materials alert

The 7pm daily-summary email is a one-screen answer to all six, with a WhatsApp share button so the owner can forward it to their team in one tap.
