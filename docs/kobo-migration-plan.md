# Kobo money migration: plan and checklist

> **Status as of 2026-05-04 (UTC):**
> - Phase 1 (utility layer) — **shipped on `main`**.
> - Phase 2 (read-compat helpers) — **shipped on `main`**.
> - Phase 3 (additive `*Kobo` columns) — **shipped on `main`**, columns live on prod DB.
> - Phase 4 (dual-write) — **live on prod**. Every monetary write populates both columns. Integration test (`scripts/test-dual-write.mjs`) verified 23/23 pairs against prod DB.
> - Phase 5 (backfill) — **complete on prod**. 104 historical rows updated. Every legacy ↔ kobo pair is consistent across all 47 columns.
> - Phase 6 (read-flip) — **partial**. The two real 100× bugs (`vat-return.service.ts`, `accountant-pack.service.ts`) are fixed and live. Other read sites still read legacy naira columns; this is correct-but-not-yet-tidy and can be migrated incrementally without urgency since the data is consistent.
> - Phase 7 (drop legacy columns) — **not started**. Wait until Phase 6 is fully done and stable for at least 48h.
>
> Branch `feature/kobo-money-migration` was fast-forward merged into `main` on 2026-05-04.

## Why this exists

Today, almost every monetary `Int` column in Postgres stores **naira**. The Tax+ feature added later stores **kobo** (`Expense.vatPaid`, `BankTransaction.amountKobo`, `VatReturn.outputVatKobo/inputVatKobo/netVatKobo`, `UserOverride.discountKobo`). The VAT return service sums kobo expenses + naira invoice tax, producing output that is **wrong by a factor of 100** for any path involving Tax+.

The fix is to standardise on kobo storage everywhere, with display conversion happening at UI boundaries.

A previous attempt failed at ~10% completion with ~774 TypeScript errors in the working tree. That attempt was reverted from `main`. This document captures what is required to do the migration safely and fully on a feature branch, with a staged rollout.

## Audit results captured on `feature/kobo-money-migration`

- **Prisma models with monetary `Int` columns (current):** ~20 models touched.
- **Naira monetary fields (current):** 42 `<field> Int` declarations matching monetary patterns in the schema.
- **Existing kobo fields (already correct):** `Expense.vatPaid`, `BankTransaction.amountKobo`, `VatReturn.outputVatKobo/inputVatKobo/netVatKobo`, `UserOverride.discountKobo`, plus a handful of Paystack-flow column names that already say `amountKobo`.
- **Source files touching monetary fields (read or write):** 168 files in `src/`.
- **Top hotspots by reference density:**
  - `src/app/expenses/page.tsx` (30 refs)
  - `src/app/reports/page.tsx` (27)
  - `src/lib/pdf-docs.tsx` (23)
  - `src/app/dashboard/page.tsx` (22)
  - `src/lib/services/payment-confirmation.service.ts` (20)
  - `src/lib/services/email.service.ts` (18)
  - `src/components/PnLClient.tsx` (18)
  - 161 other files with smaller surface
- **`formatNaira` call sites:** 345 across the codebase.
- **TS baseline (pre-migration):** 73 errors, all pre-existing and unrelated to monetary code (lucide React 19 forward-ref pattern, ClockEntry deprecated model, NextResponse vs Response on a few customers routes).

## Current monetary fields in schema

| Model | Field | Type | Unit (today) |
| --- | --- | --- | --- |
| Payment | amount | Int | naira |
| Invoice | subtotal | Int | naira |
| Invoice | discount | Int | naira |
| Invoice | tax | Int | naira |
| Invoice | total | Int | naira |
| Invoice | amountPaid | Int | naira |
| InvoiceItem | unitPrice | Int | naira |
| Sale | subtotal | Int | naira |
| Sale | tax | Int | naira |
| Sale | discount | Int | naira |
| Sale | total | Int | naira |
| SaleItem | unitPrice | Int | naira |
| SaleItem | total | Int | naira |
| Expense | amount | Int | naira |
| Expense | vatPaid | Int | **kobo (already correct)** |
| Refund | amount | Int | naira |
| PaymentAttempt | amount | Int | **kobo (already, but column name is misleading)** |
| Debt | amountOwed | Int | naira |
| Debt | amountPaid | Int | naira |
| Tenant | rentAmount | Int | naira |
| RentPayment | amount | Int | naira |
| InstallmentPlan | totalAmount | Int | naira |
| InstallmentPlan | recurringAmount | Int | naira |
| InstallmentPlan | initialAmount | Int? | naira |
| InstallmentPlan | remainingAmount | Int | naira |
| InstallmentCharge | amount | Int | naira |
| PaymentRequest | amount | Int | naira |
| PromiseToPay | originalAmount | Int | naira |
| PromiseToPay | remainingAmount | Int | naira |
| PromisePayment | amount | Int | naira |
| ReminderLog | amount | Int | naira |
| Receipt | balanceRemaining | Int? | naira |
| CreditNote | subtotal | Int | naira |
| CreditNote | taxAmount | Int | naira |
| CreditNote | total | Int | naira |
| Offer | subtotal | Int | naira |
| Offer | taxAmount | Int | naira |
| Offer | total | Int | naira |
| OfferItem | unitPrice | Int | naira |
| OrderConfirmation | total | Int | naira |
| Product | price | Int | naira |
| Product | cost | Int? | naira |
| StaffPayment | amount | Int | naira |
| Customer | totalPaid | Int | naira (cache field) |
| Customer | totalOwed | Int | naira (cache field) |
| BankTransaction | amountKobo | Int | **kobo (already correct)** |
| VatReturn | outputVatKobo / inputVatKobo / netVatKobo | Int | **kobo (already correct)** |
| UserOverride | discountKobo | Int? | **kobo (already correct)** |

## Proposed new schema fields

We use the **expand-then-contract** pattern. Each existing naira `Int` field gets a sibling `*Kobo` `Int` field. Old naira columns are **kept** during phases 1-5 to support read-compatibility and rollback. Old columns are dropped only in Phase 7 after verification.

For each row in the table above where the unit is naira, add:
- `<original_field>Kobo Int @default(0)` (or `Int?` if the original was nullable)

Examples:
- `Payment.amount` (naira) stays. Add `Payment.amountKobo Int @default(0)`.
- `Invoice.total` (naira) stays. Add `Invoice.totalKobo Int @default(0)`.
- `Customer.totalPaid` (naira, cache) stays. Add `Customer.totalPaidKobo Int @default(0)`.

Already-kobo columns are not touched.

### Stretch consideration

`PaymentAttempt.amount` is *already* kobo but the column name lies. Phase 7 cleanup should rename it to `amountKobo` separately, **after** the main migration ships clean.

## Migration strategy (7 phases)

The order is mandatory. Each phase ships independently. **No phase ships without the prior phase verified in staging.**

### Phase 1: Money utility layer (zero schema/data risk)

Create `src/lib/money.ts` with the four canonical helpers:

```ts
/// Convert naira (decimal or integer) to kobo integer.
/// Throws on NaN / non-finite. Rounds to nearest kobo.
export function nairaToKobo(naira: number): number {
  if (!Number.isFinite(naira)) throw new Error('nairaToKobo: not finite');
  return Math.round(naira * 100);
}

/// Convert kobo to naira number. Always returns a number, never a string.
export function koboToNaira(kobo: number): number {
  if (!Number.isFinite(kobo)) return 0;
  return kobo / 100;
}

/// Format kobo as user-facing naira string (₦12,500).
/// This is the canonical display function. UI never reads kobo directly.
export function formatNaira(kobo: number): string { ... }

/// Convert raw user input (string from a form, possibly with commas
/// or decimals) to kobo. Returns null on invalid.
export function safeMoneyInputToKobo(input: string | number | null | undefined): number | null { ... }
```

Update `src/lib/format.ts` to re-export the new helpers and **deprecate** the old `formatNaira(naira: number)` overload by aliasing it via a wrapper that applies a `* 100` only during phase 4 (write-path migration), then swapping it to the new contract in phase 6.

**Deliverables:**
- `src/lib/money.ts`
- Tests at `src/lib/money.test.ts` covering: naira to kobo round-trip, edge cases (0, negative, NaN, decimals), input parsing from form strings.
- Zero changes to existing call sites yet.

**Acceptance:** all four helpers exist, tests pass, no other file modified.

### Phase 2: Read compatibility (zero risk to writes)

Add a thin reader layer that **prefers `*Kobo` fields when present** and falls back to `field * 100` when the kobo column has not been backfilled yet. This makes reads safe during the transition.

For each model, add a derived helper:
```ts
export function paymentAmountKobo(p: { amount: number; amountKobo: number | null }): number {
  return p.amountKobo ?? p.amount * 100;
}
```

Place these in `src/lib/money-readers.ts`. They get used in Phase 3+ as we incrementally migrate read sites.

**Deliverables:**
- `src/lib/money-readers.ts` with one reader per monetary field
- Unit tests
- No call site changes yet

**Acceptance:** module exists, tests pass.

### Phase 3: Schema migration (additive only)

Update `prisma/schema.prisma` to add the new `*Kobo` columns alongside the old ones. **Do not rename, do not drop.**

Update `src/app/api/migrate/route.ts` to add `addCol` calls for every new column. The defaults are 0 (or NULL where the original was nullable).

Run `/api/migrate` against staging. Verify that all new columns appear with default 0. **Production stays unchanged: code does not yet write to or read from the new columns.**

**Acceptance:** Prisma validates, migration applies cleanly to staging, all old code paths still work.

### Phase 4: Write-path migration (dual-write)

Update every place that **writes** a monetary field. Each write becomes a dual-write:

```ts
await prisma.payment.create({
  data: {
    amount: nairaValue,             // existing
    amountKobo: nairaToKobo(nairaValue), // new
    // ...
  },
});
```

This lands across:
- All form-submit routes (`/api/invoices/route.ts`, `/api/payments/route.ts`, `/api/expenses/route.ts`, `/api/sales/route.ts`, etc.)
- All service-layer creates (`payment.service.ts`, `invoice.service.ts`, `expense.service.ts`, etc.)
- The Paystack confirmation branches in `payment-confirmation.service.ts` (5 branches)
- The recurring-invoice cron at `src/app/api/cron/run-recurring-invoices/route.ts`
- The customer-totals recompute in `src/lib/customers.ts`
- The `prisma/seed.ts` demo data path

**Important Paystack rule:** Paystack `amount` parameter is already kobo. Do not multiply Paystack values by 100. Audit every Paystack call site to confirm.

**Acceptance:** all monetary writes write both columns. The `*Kobo` columns are the source of truth going forward but the legacy naira columns continue to be written so rollback stays viable.

### Phase 5: Backfill

Run a one-shot backfill on staging then production:

```sql
UPDATE "Payment"  SET "amountKobo"   = "amount"  * 100 WHERE "amountKobo"   = 0 AND "amount"   IS NOT NULL;
UPDATE "Invoice"  SET "subtotalKobo" = "subtotal" * 100 WHERE "subtotalKobo" = 0;
UPDATE "Invoice"  SET "totalKobo"    = "total"    * 100 WHERE "totalKobo"    = 0;
-- ... and so on for every monetary column
```

Wrap every UPDATE in a transaction with a count-before / count-after check. The full backfill script is delivered as `scripts/backfill-kobo.sql` and is **idempotent** (the `WHERE *Kobo = 0` predicate makes re-runs safe).

**Acceptance:** every monetary column has its `*Kobo` sibling fully populated.

### Phase 6: Read-path migration (flip reads to kobo)

Now that every row has both columns populated, switch every reader to use the `*Kobo` field via the helpers from Phase 2. UI displays use `formatNaira(kobo)` from Phase 1.

This is the largest change: 168 files. Walk them in this order to minimise risk:

1. `src/lib/services/*.ts` (services first because everything reads through them)
2. `src/app/api/*` (routes second)
3. `src/app/**/page.tsx` (pages third)
4. `src/components/**/*.tsx` (components fourth)
5. `src/lib/pdf-docs.tsx` (PDFs fifth)
6. CSV exports (`/api/feedback?format=csv`, `/api/audit-export`, `/api/accountant-pack/[year]`) sixth

After each layer, run `npx tsc --noEmit` and verify zero **new** errors.

**Acceptance:** all reads route through kobo. The legacy `Customer.totalPaid` / `Customer.totalOwed` cache fields are kept naira during this phase but recomputed from `*Kobo` aggregates (see `src/lib/customers.ts`). They are migrated to kobo in a follow-up.

### Phase 7: Cleanup

Only after verification (see Test plan) is complete:

1. Remove the dual-write so every monetary write only writes the `*Kobo` column.
2. Drop the legacy naira columns from the schema.
3. Update the migrate route with `ALTER TABLE ... DROP COLUMN`.
4. Optional: rename `*Kobo` columns back to their old names (e.g. `amountKobo` → `amount`) so the codebase reads cleaner. Skip this on first pass if it adds risk; do it as a follow-up grep + rename.
5. Rename `PaymentAttempt.amount` to `amountKobo` (it was already kobo, just misleadingly named).

**Acceptance:** Prisma schema has no legacy naira columns. The codebase has no `* 100` or `/ 100` anywhere outside `src/lib/money.ts`.

## Rollback strategy

Each phase has its own rollback:

- **Phase 1 (helpers):** revert the commit. No data impact.
- **Phase 2 (readers):** revert the commit. No data impact.
- **Phase 3 (schema add columns):** revert the commit. The added columns stay in the DB but are unused. They can be dropped via `ALTER TABLE ... DROP COLUMN "amountKobo"` if needed, or left in place harmlessly.
- **Phase 4 (dual-write):** revert the commit. The naira columns continue to be the source of truth; the kobo columns may diverge from naira for any rows written during the dual-write window. This is recoverable: re-run the backfill from Phase 5 on the affected window.
- **Phase 5 (backfill):** the SQL is idempotent; an error mid-run can be re-attempted. If totally bad, manually `UPDATE ... SET <kobo> = 0` to wipe the kobo column, then re-run.
- **Phase 6 (read flip):** revert the commit. Reads go back to naira columns. The kobo data stays intact for future re-attempt.
- **Phase 7 (cleanup):** **NOT REVERSIBLE** if the legacy naira columns are dropped. Take a database backup before this phase. Do not run Phase 7 until at least 48 hours of clean Phase 6 production behaviour.

## Test plan

Each phase needs to pass these gates before the next phase begins:

1. **Static checks**
   - `npx prisma validate` clean
   - `npx prisma generate` clean
   - `npx tsc --noEmit` no new errors
   - `npm run lint` clean

2. **Unit tests** (need to be written as part of Phase 1)
   - `src/lib/money.test.ts`: naira-to-kobo round trip, formatting, input parsing
   - `src/lib/money-readers.test.ts`: dual-source reads with both populated, only kobo, only naira

3. **Integration tests on staging**
   - Create an invoice via the form. Verify both `total` and `totalKobo` populate correctly.
   - Pay an invoice via Paystack on staging. Verify the webhook reconciliation produces a Payment with `amountKobo` set, and the receipt PDF displays the right naira value.
   - Generate a VAT return for a period that has invoices and expenses. Verify net VAT is correct (no longer 100x off).
   - Issue a credit note. Verify both columns update.
   - Open the dashboard. Verify revenue and outstanding values display correctly.
   - Open a customer profile. Verify the credit-score signal data computes correctly.

4. **Critical user flows**
   - Seller: Add payment → receipt sends → dashboard updates.
   - Customer: Pay invoice via Paystack public link.
   - Admin: View `/admin/users/[id]` → verify Payment listings.
   - Accountant role: Read-only access shows correct totals.

5. **PDF + CSV exports**
   - Invoice PDF
   - Receipt PDF
   - VAT return PDF + CSV
   - Year-end accountant pack ZIP
   - Feedback CSV
   - Audit-export CSV

## Deploy plan

Two production windows minimum.

**Window 1 (low-risk additive):** ship Phase 1 + Phase 2 + Phase 3. The user-visible behaviour is unchanged; the schema gains columns; helpers exist but are unused. Production keeps writing naira columns. Verify no regressions for 24-48 hours.

**Window 2 (high-risk dual-flip):** ship Phase 4 + Phase 5 + Phase 6 in one coordinated push.

1. Take a database snapshot via Neon's branching feature before deploy.
2. Deploy the code (now writes both columns).
3. Run `scripts/backfill-kobo.sql` against production. Confirm row counts match.
4. **Hold the read-flip behind a feature flag** (`MONEY_READS_FROM_KOBO=1` env var). With the flag off, reads still use naira but writes are now dual-write, so production behaves exactly as before while the kobo data is being maintained.
5. Verify the kobo column values match `naira * 100` for a sampled set of rows (script).
6. Flip the flag on for 5% of users (admin-side flag, or a staged rollout via a `featureFlag` table).
7. Monitor for 24 hours. If anything reads weird, flip back.
8. Roll the flag to 100%.

**Window 3 (cleanup, optional):** ship Phase 7 only after Window 2 has been stable for at least a week. Database snapshot before. Drop columns in a single migration. Most fragile step; least urgent.

## List of risky areas

In rough order of risk:

1. **Paystack amount handling** (`src/lib/services/paystack.service.ts`, `src/lib/services/billing.service.ts`, `src/lib/services/payment-confirmation.service.ts`). Paystack's `amount` parameter is **already kobo**. Several call sites today do `value * 100` to convert naira-stored values into kobo for Paystack. After Phase 6, those sites read kobo natively and **must drop the `* 100`**. Missing one means a 100× overcharge.
2. **VAT return service** (`src/lib/services/vat-return.service.ts`). Today's bug. After Phase 6 it sums kobo-on-both-sides and the VAT math becomes correct. The Phase 6 commit must include a verification test against a known fixture.
3. **PDF templates** (`src/lib/pdf-docs.tsx`). Three templates: `InvoiceDoc`, `ReceiptDoc`, `VatReturnDoc`. Each computes line totals (`unitPrice × quantity`). After migration, both operands are kobo, the product is kobo, displays via `formatNaira(kobo)`. Every line item plus VAT plus discount plus total must be checked.
4. **Customer cache fields** (`Customer.totalPaid`, `Customer.totalOwed`). These are denormalised aggregates kept in naira for fast dashboard reads. The recompute logic in `src/lib/customers.ts` aggregates `Payment.amount` (will be kobo) and writes naira. Phase 4-6 needs to either keep these as naira (divide by 100 on write) or migrate them to kobo with the rest. **Decide upfront.**
5. **Form input validators** (`src/lib/validators.ts`, `src/lib/feedback-validators.ts`). These accept naira input from sellers (₦5,000, not 500000). The route handler converts to kobo via `nairaToKobo()` at the boundary. Validators stay naira. **Document this convention.**
6. **CSV exports.** Multiple exports (audit, feedback, accountant pack). Each must convert kobo to naira before writing CSV cells, or change column headers to `*_kobo`. Pick one convention and apply uniformly. Recommend converting at output (CSV reader is human, expects naira).
7. **Dashboard cards** (`src/app/dashboard/page.tsx`, `src/components/dashboard/*`). Many small read sites; each must use `formatNaira(kobo)`. The new `CashFlowForecastCard` already operates on kobo internally; verify its inputs flow correctly.
8. **Admin metrics + reports** (`/admin/subscriptions`, `/admin/feedback`, `/admin/users`, `/reports/page.tsx`). Aggregate queries (`_sum: { amount: true }`) must be renamed to `_sum: { amountKobo: true }` after Phase 6. The result is kobo; divide before display.
9. **Recurring billing cron** + **trial check cron**. Run weekly to monthly. After deploy, verify the next cron fire produces correct values.
10. **Promise to Pay + Installments** are dormant features (hidden from nav). They still have routes that touch monetary fields. Decide before Phase 4: include them in the migration or kill the routes first.

## Safety requirements (do not violate)

- Do not leave the app in a mixed broken state. Each commit must build and the app must run.
- Do not ship with TypeScript errors above the 73-error baseline.
- Do not deploy schema changes and code changes in the same commit unless the schema change is purely additive (Phase 3 is OK; Phase 7 needs its own commit + window).
- Use database transactions for multi-row writes during the backfill.
- Take a Neon database snapshot before Phase 5 backfill and Phase 7 cleanup.
- The runtime DDL endpoint at `/api/migrate` requires both `CRON_SECRET` and `MIGRATE_SECRET` headers.

## Rollback script (saved before Phase 7)

A `scripts/kobo-rollback.sql` will be written before Phase 7 and tested in staging. It reverses the migration by:

1. `UPDATE <table> SET <field> = <field>Kobo / 100` (only run after Phase 6 if reads are flipping back to naira).
2. `ALTER TABLE <table> DROP COLUMN <field>Kobo` (only after re-verification that naira values are intact).

## Estimated effort

- Phase 1 (utility layer): 0.5 day, single engineer.
- Phase 2 (readers): 0.5 day.
- Phase 3 (schema): 0.5 day.
- Phase 4 (write-path): **2-3 days.** This is the largest phase, touches all writers + Paystack + cron + crypto.
- Phase 5 (backfill): half a day for the SQL + verification.
- Phase 6 (read-path): **2-3 days.** 168 files, the largest text-edit phase.
- Phase 7 (cleanup): half a day.

**Total: 7-10 working days for one engineer with staging access.** This is the realistic floor. Skipping the staging window or compressing the deploy into one big push is what produced the previous failed attempt.

## Final note

This document is the canonical guide. The next session should read this top-to-bottom, then begin at Phase 1. Do not skip phases. Do not deploy to production without each phase passing its acceptance gate on staging.
