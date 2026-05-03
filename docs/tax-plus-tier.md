# CashTraka Tax+ tier

> The upmarket plan that turns CashTraka from a ₦3,000 utility into the
> compliance backbone Nigerian SMBs actually pay real money for.

## One-line pitch

> **Tax filing on autopilot. We file your VAT, sync your bank, reconcile
> every payment, and keep the FIRS audit trail. ₦25,000 a month.**

## Why this tier exists

Pro (₦5,000/month) is a productivity tool. Sellers buy it to send invoices
faster. They could leave for any of the dozen other invoice apps tomorrow.

Tax+ is a compliance product. Sellers buy it to avoid FIRS penalties, to
stop paying their accountant ₦60,000-100,000 a month, and to never spend
a Saturday reconciling bank alerts again. They cannot leave because their
last 6 years of returns live in CashTraka.

The wedge from Pro to Tax+ is the difference between a $2 ARPU side
project and a $30 ARPU venture-scale SaaS.

## Target buyer

Nigerian small business doing **₦5M-100M annual revenue** with:

- One or more retainer clients sending recurring invoices
- VAT-registered (or about to be, doing >₦25M)
- A part-time accountant they pay ₦40-100k/month
- A bank account they reconcile manually with bank alerts and Excel
- A laptop in the office and a phone in the owner's pocket

These buyers know they need this. They are already paying for it badly.

## What's in Tax+ (vs. Pro)

| Capability | Free | Pro ₦5k | Tax+ ₦25k |
| --- | --- | --- | --- |
| Receipts, customers, debts | ✓ | ✓ | ✓ |
| 50 payments/month cap | ✓ | unlimited | unlimited |
| Invoices, recurring, credit notes | | ✓ | ✓ |
| FIRS submission (manual) | | ✓ | ✓ |
| Cash flow forecast | | ✓ | ✓ |
| Customer credit score | | ✓ | ✓ |
| Service Check feedback | | ✓ | ✓ |
| **Auto VAT returns (monthly + quarterly)** | | | ✓ |
| **Bank statement sync (Mono)** | | | ✓ |
| **Virtual account per invoice (Wema/Sterling)** | | | ✓ |
| **Multi-user with audit trail** | | basic | ✓ full |
| **Priority support (under 4 hours)** | | | ✓ |
| **Year-end accountant export pack** | | | ✓ |

Everything in Tax+ that is not in Pro is the reason to buy Tax+.

## The five new features

### 1. Auto VAT returns

The single biggest pain. Today an SMB owner gathers all invoices, pulls
VAT amounts manually, fills a FIRS return, files. Hours. Mistakes.

**What we do:**
- Aggregate VAT collected from all `Invoice.vatApplied=true` rows for the
  period (monthly or quarterly per the user's filing cycle).
- Aggregate input VAT from `Expense.vatPaid` (new column).
- Compute net VAT due.
- Generate the FIRS-format VAT return file.
- File it via the FIRS e-services API once the integration ships.
- Store a stamped, downloadable copy + IRN in `DocumentArchive`.

**v1 scope:** generate the return PDF + CSV in the FIRS-required shape,
seller manually uploads to FIRS portal. Mark filed via a button.

**v2 scope:** auto-file via FIRS API, returns the official acknowledgment.

Charge: counts as 1 inclusion of Tax+. v2 makes it "fully managed."

### 2. Bank statement sync (Mono / Okra)

Replaces the existing "paste bank SMS" flow.

**What we do:**
- User links their bank account via Mono Connect widget (one-time consent).
- We poll Mono's `/transactions` daily and ingest every credit + debit.
- Each transaction is automatically matched to the most likely Invoice or
  Expense by amount + date + reference + sender name.
- Auto-confirmed matches mark the Invoice as PAID; ambiguous matches go
  to a "Needs review" queue with three suggestions ranked by confidence.

**Cost:** Mono charges ~₦200/account/month. Bake into the ₦25k/month price.

**Why this wins:** Removes the entire reconciliation problem. Sellers
spend hours a month on this today. Saving them four hours a month at
their effective hourly rate (~₦5,000) is worth ₦20,000 alone.

### 3. Virtual account per invoice

Partner integration with Wema, Sterling, or Providus (all expose VA APIs).

**What we do:**
- When an invoice is created, we mint a unique 10-digit NUBAN account
  number tied to the invoice id.
- The account number prints on the invoice and the public-pay page.
- Customer transfers any amount; the bank webhook lands; we credit the
  invoice; receipt sends; done. No SMS pasting, no Paystack initiation,
  no card details.
- Settlement to the seller's main bank happens daily via the partner
  bank.

**Cost:** Most VA partners charge ₦50-100 per VA created, sometimes a
flat monthly fee. Build into Tax+ pricing.

**Why this wins:** This is the single biggest UX leap in Nigerian
payments since BVN. Customers prefer transfer to card. Sellers prefer
auto-reconciliation to manual.

### 4. Multi-user with audit trail

Pro already has Team. Tax+ adds:
- Permission scopes per role (Owner, Manager, Accountant, Cashier)
- Read-only "Accountant" role with full historical access but no write
- Every read by the Accountant logged
- Two-person rule on credit notes >₦100,000 (admin-approval workflow)
- Exportable audit trail in CSV for FIRS audit responses

### 5. Priority support + year-end export

- Direct WhatsApp line to a CashTraka rep, response under 4 hours
  business days. (Real ops cost, but high-trust signal.)
- One-click "Year-end accountant pack" that bundles every receipt, every
  invoice, every credit note, every VAT return, every bank reconciliation,
  every payment for the FY into one zip with a manifest. Hand it to the
  accountant on January 5. Done.

## Pricing model

```
Free        ₦0/month       receipts, customers, debts, 50 payments/mo
Pro         ₦5,000/month   full invoice engine, FIRS prep, forecasts
Tax+        ₦25,000/month  Pro + auto VAT + bank sync + VA per invoice
                            + multi-user audit + priority support

Yearly      Same with 2 months free (10x monthly)
Volume fee  1% on invoice payments routed through CashTraka, capped ₦5k
```

Tax+ ARPU is 5x Pro. At 500 Tax+ subscribers and 4,500 Pro subscribers,
that's:
- 500 x ₦25k + 4,500 x ₦5k = ₦35M/month = $24k MRR
- Plus 1% on processed volume. At ₦500M/month payment volume, that's
  ₦5M/month = ~$3.5k MRR
- Total: ~$27k MRR with a clear path to $50k+

That is a real venture-scale SaaS.

## Build order

### Phase 1 (4-6 weeks): software only, no partnerships
1. Add `Expense.vatPaid` column and the input-VAT capture in expense form
2. Build VAT return generator (server-side compute, PDF + CSV output)
3. Build the "VAT returns" page under Tax & FIRS settings tab
4. Build the multi-user audit trail (extend existing audit log, add
   per-record read tracking for the Accountant role)
5. Build the year-end export pack endpoint
6. Add `taxPlusFeature` flags to the Limits type and gate the above
7. Add the Tax+ tier to `PLAN_PRICING` and the pricing page

### Phase 2 (2-3 weeks each): needs partnerships
8. Mono Connect integration (commercial agreement required first)
9. Wema/Sterling/Providus VA agreement, then API integration

### Phase 3 (depends on FIRS): automatic VAT filing
10. FIRS e-services API integration once the merchant onboarding lands

## Non-goals

- Full accounting software. We will not be QuickBooks. The accountant
  pack is enough for the part-time accountant to do the rest.
- General ledger. We track cash in, cash out, VAT. Not double-entry.
- Multi-currency. NGN only.
- Anything outside the FIRS regulatory perimeter for v1.

## Acceptance criteria

The Tax+ tier ships when:

1. A user can subscribe to Tax+ via the existing pricing flow
2. Tax+ users see the new "Tax filing" section in the dashboard
3. They can generate a monthly VAT return PDF + CSV that an accountant
   confirms is FIRS-format-correct
4. They can link a bank account via Mono and see transactions auto-match
   to invoices
5. They can mint a virtual account per invoice and watch a transfer
   auto-reconcile
6. They can invite an Accountant who has read-only access with full audit
7. They can download a year-end pack that contains everything an external
   auditor would ask for

## What this needs from operations

- Commercial agreement with Mono (~3 weeks)
- Commercial agreement with Wema or Sterling for VAs (~6 weeks)
- FIRS Merchant Buyer Solution credentials for production filing (already
  in flight)
- One support rep dedicated to Tax+ priority queue
- Compliance review of the year-end export pack format

## Risk register

- **FIRS API rejections during VAT filing.** Mitigation: ship v1 as
  manual-upload of generated file. Move to API only when stable.
- **Mono outage.** Mitigation: keep the bank-alert-paste flow as a
  fallback, hidden behind a "Bank sync down? Paste an alert" link in
  the empty state.
- **VA partner downtime during peak.** Mitigation: Paystack pay link
  remains the backup checkout method on every public invoice page.
- **Customer support load on a 4-hour SLA.** Mitigation: cap Tax+ seats
  at 1,000 until support coverage scales, then open up.
