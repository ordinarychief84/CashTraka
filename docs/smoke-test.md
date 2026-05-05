# CashTraka — Post-deploy smoke test

> Run this after every production deploy. ~10 minutes. The point is to catch a broken critical path before a customer does.
>
> If a step fails, **don't ship more code on top.** Roll back the deploy first, then fix.

---

## Setup (one-time)

You need:
- A real seller test account on production (`smoke@cashtraka.co` or similar). Sign up once, complete onboarding, do not delete.
- A real customer email address you control for invoice/receipt verification (Gmail + Outlook + a Nigerian provider like Yahoo Mail Nigeria are best).
- A Paystack test card from https://paystack.com/docs/payments/test-payments (only used for the billing-flow check on a staging URL — never on prod).

Save credentials in 1Password / Bitwarden under "CashTraka — smoke test."

---

## The matrix

Run top-to-bottom. Each step is independent — if one fails, note it and continue (so you can report all the breaks at once).

### 1. Marketing site loads
- [ ] `https://www.cashtraka.co/` returns 200 in under 1.5s
- [ ] Homepage hero CTA links work (`Get started` → `/signup`)
- [ ] Footer privacy/terms links open the legal pages
- [ ] `/privacy` and `/terms` render without TypeScript or hydration errors in the console

### 2. Auth
- [ ] `/login` page renders
- [ ] Bad password returns "Invalid email or password" (not 500)
- [ ] Correct password takes you to `/dashboard`
- [ ] `/dashboard` shows current month KPIs without empty-state errors
- [ ] Logout via header menu redirects to landing page and clears session

### 3. Payment + receipt flow (the core money path)
- [ ] Click `Record payment` → `/payments/new`
- [ ] Submit a payment of ₦5,000 with one line item, status PAID, customer "Smoke Test"
- [ ] Form returns success, redirects to detail/list view
- [ ] Recipt PDF link opens at `/api/receipts/<id>` and is a valid PDF (not an HTML error page)
- [ ] Public receipt URL `/r/<id>` renders the receipt with the ₦5,000 amount visible
- [ ] WhatsApp share button on receipt actions opens `https://wa.me/...?text=...` with prefilled text

### 4. Invoice flow
- [ ] `/invoices/new` form submits an invoice (one line item, ₦10,000)
- [ ] Invoice number displays as `INV-XXXXX` in the new detail page
- [ ] Public invoice link `/invoice/<publicToken>` renders the invoice with bank details
- [ ] PDF download from `/api/invoices/<id>/pdf` produces a valid PDF
- [ ] If you sent the invoice by email, the email arrived in your test inbox within 60 seconds (not in spam)

### 5. Debt + WhatsApp reminder
- [ ] `/debts/new` creates a debt of ₦20,000 due tomorrow
- [ ] Row action "Send reminder" opens a `wa.me` link with a non-empty prefilled message
- [ ] Marking the debt as PAID auto-generates a Receipt (visible at `/receipts`)

### 6. Expense + reports
- [ ] `/expenses/new` records a business expense of ₦2,500
- [ ] `/reports` shows the expense in the current-month total
- [ ] `/reports` P&L card reflects revenue minus expense correctly (manual mental math: it should match the test payments + expense you just entered)

### 7. VAT return (Tax+ tier — skip if you don't have Tax+ enabled on the test account)
- [ ] On `/vat-returns`, generate a return for the current period
- [ ] netVatKobo number displayed equals (sum of taxKobo on VAT-applied invoices) − (sum of vatPaid on expenses) for that period. **If it's 100× off, you've reverted the kobo migration. Roll back immediately.**
- [ ] PDF download works
- [ ] CSV download works and the SUMMARY row's NetVAT_NGN matches the on-screen number

### 8. Catalog (Sell)
- [ ] If `User.slug` is set, `/store/<slug>` renders the public catalog
- [ ] Click "Order on WhatsApp" on a product → opens `wa.me` with the order template prefilled
- [ ] No product images = page still renders (graceful empty state)

### 9. Account + NDPR
- [ ] `/settings` opens
- [ ] Profile / Account / Storefront / Billing tabs load
- [ ] Danger Zone tab loads
- [ ] Click "Download all your data" → JSON file downloads (size > 1 KB)
- [ ] Open the downloaded JSON: `meta.regulation === "NDPR"`, `profile.email` matches your account, the `counts` object has at least one non-zero entry
- [ ] **Don't actually delete the account** in the smoke test. Verify the button + confirm dialog render correctly and stop.

### 10. API health + production smoke
- [ ] `GET /api/health` returns 200 with JSON `{ ok: true }`
- [ ] Vercel logs show no `ERROR` lines in the last 30 minutes that aren't the documented 73-error TypeScript baseline noise
- [ ] If Sentry is configured: zero issues in the last hour

---

## What to do when a step fails

| Failure | Action |
| --- | --- |
| 1.x — site won't load | Vercel deploy is broken. `vercel rollback` to the previous Ready production deploy and investigate. |
| 2.x — auth broken | Stop everything. This blocks 100% of users. Roll back if last working deploy < 10 min ago, otherwise hotfix and re-deploy. |
| 3.x — payment/receipt | Roll back unless the issue is in a brand-new feature. Receipts are tax records; sellers will refund customers if their receipt PDF is broken. |
| 4.x — invoice email didn't arrive | Check Resend dashboard for the message. If "Sent" but landed in spam, see Resend domain verification runbook. If "Failed", check API key + domain. |
| 7.x — VAT 100× off | Re-read `docs/kobo-migration-plan.md`. The kobo migration shipped 2026-05-04; if VAT is wrong again, someone reverted Phase 6 reads on `vat-return.service.ts`. Find and fix. |
| 9.x — NDPR export fails | Legal compliance is at stake. Stop accepting new paid signups until fixed. |
| 10.x — health 500 | Database connectivity. Check Neon dashboard for incidents and connection-pool exhaustion. |

---

## Frequency

- **After every production deploy:** run the full matrix. Yes, every one.
- **Daily, even with no deploy:** run sections 1, 2, 10 (3 minutes total). Most outages are dependency drift, not code.
- **Weekly:** run the full matrix once on a Friday morning. Catches the slow regressions nobody noticed.

---

## Don't skip

The single rule about this checklist: it's not an aspirational checklist. If you're deploying without running it, you're flying blind. The cost of skipping is one churned customer per missed regression, on average, based on every SaaS failure mode I've seen. The cost of running it is 10 minutes.
