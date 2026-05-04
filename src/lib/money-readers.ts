/**
 * Read-compatibility helpers for the kobo migration.
 *
 * Phase 2 of the rollout (see docs/kobo-migration-plan.md). Every legacy
 * naira `Int` column gets a sibling `*Kobo` `Int` column in Phase 3. During
 * the migration window — between Phase 4 (dual-write begins) and Phase 7
 * (legacy columns dropped) — reads need to prefer the kobo column when
 * it has been populated and fall back to `naira * 100` when it hasn't.
 *
 * These helpers are the only place that fallback math lives. They are
 * **unused** in Phase 2; call sites get migrated incrementally in Phase 6.
 *
 * Each helper takes a structural shape (not a Prisma type) so it compiles
 * before AND after the Phase 3 schema additions.
 */

/**
 * Generic dual-source kobo reader. Prefers `kobo` when it is a finite
 * number; otherwise returns `naira * 100`. Treats null/undefined/NaN on
 * the kobo side as "not yet backfilled".
 *
 * Once Phase 6 ships and reads have flipped, this can be inlined and
 * removed in Phase 7.
 */
export function koboFromDual(
  kobo: number | null | undefined,
  naira: number | null | undefined,
): number {
  if (typeof kobo === 'number' && Number.isFinite(kobo) && kobo !== 0) {
    return kobo;
  }
  // kobo === 0 might be a real zero or a "not backfilled" default. We
  // disambiguate by checking the naira value: if naira is also zero/null,
  // the answer is zero either way; otherwise prefer naira * 100.
  if (typeof naira === 'number' && Number.isFinite(naira)) {
    if (typeof kobo === 'number' && kobo === 0 && naira === 0) return 0;
    return naira * 100;
  }
  if (typeof kobo === 'number' && kobo === 0) return 0;
  return 0;
}

/**
 * Same as above but for nullable kobo amounts where null is meaningful
 * (e.g. `Receipt.balanceRemaining` — null means "no balance row at all",
 * distinct from zero). Returns `null` if both inputs are null/undefined.
 */
export function nullableKoboFromDual(
  kobo: number | null | undefined,
  naira: number | null | undefined,
): number | null {
  if (typeof kobo === 'number' && Number.isFinite(kobo)) return kobo;
  if (typeof naira === 'number' && Number.isFinite(naira)) return naira * 100;
  return null;
}

// --------- typed shape wrappers per Prisma model ---------
//
// One wrapper per monetary field on each model. Each accepts the
// minimum structural shape it needs; all other fields are ignored.
// Field names follow the Phase 3 schema additions:
//   <originalField>Kobo  // sibling kobo column

export const paymentAmountKobo = (p: {
  amount?: number | null;
  amountKobo?: number | null;
}) => koboFromDual(p.amountKobo, p.amount);

export const invoiceSubtotalKobo = (i: {
  subtotal?: number | null;
  subtotalKobo?: number | null;
}) => koboFromDual(i.subtotalKobo, i.subtotal);

export const invoiceDiscountKobo = (i: {
  discount?: number | null;
  discountKobo?: number | null;
}) => koboFromDual(i.discountKobo, i.discount);

export const invoiceTaxKobo = (i: {
  tax?: number | null;
  taxKobo?: number | null;
}) => koboFromDual(i.taxKobo, i.tax);

export const invoiceTotalKobo = (i: {
  total?: number | null;
  totalKobo?: number | null;
}) => koboFromDual(i.totalKobo, i.total);

export const invoiceAmountPaidKobo = (i: {
  amountPaid?: number | null;
  amountPaidKobo?: number | null;
}) => koboFromDual(i.amountPaidKobo, i.amountPaid);

export const invoiceItemUnitPriceKobo = (it: {
  unitPrice?: number | null;
  unitPriceKobo?: number | null;
}) => koboFromDual(it.unitPriceKobo, it.unitPrice);

export const saleSubtotalKobo = (s: {
  subtotal?: number | null;
  subtotalKobo?: number | null;
}) => koboFromDual(s.subtotalKobo, s.subtotal);

export const saleTaxKobo = (s: {
  tax?: number | null;
  taxKobo?: number | null;
}) => koboFromDual(s.taxKobo, s.tax);

export const saleDiscountKobo = (s: {
  discount?: number | null;
  discountKobo?: number | null;
}) => koboFromDual(s.discountKobo, s.discount);

export const saleTotalKobo = (s: {
  total?: number | null;
  totalKobo?: number | null;
}) => koboFromDual(s.totalKobo, s.total);

export const saleItemUnitPriceKobo = (it: {
  unitPrice?: number | null;
  unitPriceKobo?: number | null;
}) => koboFromDual(it.unitPriceKobo, it.unitPrice);

export const saleItemTotalKobo = (it: {
  total?: number | null;
  totalKobo?: number | null;
}) => koboFromDual(it.totalKobo, it.total);

export const expenseAmountKobo = (e: {
  amount?: number | null;
  amountKobo?: number | null;
}) => koboFromDual(e.amountKobo, e.amount);

export const refundAmountKobo = (r: {
  amount?: number | null;
  amountKobo?: number | null;
}) => koboFromDual(r.amountKobo, r.amount);

export const debtAmountOwedKobo = (d: {
  amountOwed?: number | null;
  amountOwedKobo?: number | null;
}) => koboFromDual(d.amountOwedKobo, d.amountOwed);

export const debtAmountPaidKobo = (d: {
  amountPaid?: number | null;
  amountPaidKobo?: number | null;
}) => koboFromDual(d.amountPaidKobo, d.amountPaid);

export const tenantRentAmountKobo = (t: {
  rentAmount?: number | null;
  rentAmountKobo?: number | null;
}) => koboFromDual(t.rentAmountKobo, t.rentAmount);

export const rentPaymentAmountKobo = (r: {
  amount?: number | null;
  amountKobo?: number | null;
}) => koboFromDual(r.amountKobo, r.amount);

export const installmentPlanTotalAmountKobo = (p: {
  totalAmount?: number | null;
  totalAmountKobo?: number | null;
}) => koboFromDual(p.totalAmountKobo, p.totalAmount);

export const installmentPlanRecurringAmountKobo = (p: {
  recurringAmount?: number | null;
  recurringAmountKobo?: number | null;
}) => koboFromDual(p.recurringAmountKobo, p.recurringAmount);

export const installmentPlanInitialAmountKobo = (p: {
  initialAmount?: number | null;
  initialAmountKobo?: number | null;
}) => nullableKoboFromDual(p.initialAmountKobo, p.initialAmount);

export const installmentPlanRemainingAmountKobo = (p: {
  remainingAmount?: number | null;
  remainingAmountKobo?: number | null;
}) => koboFromDual(p.remainingAmountKobo, p.remainingAmount);

export const installmentChargeAmountKobo = (c: {
  amount?: number | null;
  amountKobo?: number | null;
}) => koboFromDual(c.amountKobo, c.amount);

export const paymentRequestAmountKobo = (p: {
  amount?: number | null;
  amountKobo?: number | null;
}) => koboFromDual(p.amountKobo, p.amount);

export const promiseOriginalAmountKobo = (p: {
  originalAmount?: number | null;
  originalAmountKobo?: number | null;
}) => koboFromDual(p.originalAmountKobo, p.originalAmount);

export const promiseRemainingAmountKobo = (p: {
  remainingAmount?: number | null;
  remainingAmountKobo?: number | null;
}) => koboFromDual(p.remainingAmountKobo, p.remainingAmount);

export const promisePaymentAmountKobo = (p: {
  amount?: number | null;
  amountKobo?: number | null;
}) => koboFromDual(p.amountKobo, p.amount);

export const reminderLogAmountKobo = (r: {
  amount?: number | null;
  amountKobo?: number | null;
}) => koboFromDual(r.amountKobo, r.amount);

export const receiptBalanceRemainingKobo = (r: {
  balanceRemaining?: number | null;
  balanceRemainingKobo?: number | null;
}) => nullableKoboFromDual(r.balanceRemainingKobo, r.balanceRemaining);

export const creditNoteSubtotalKobo = (c: {
  subtotal?: number | null;
  subtotalKobo?: number | null;
}) => koboFromDual(c.subtotalKobo, c.subtotal);

export const creditNoteTaxAmountKobo = (c: {
  taxAmount?: number | null;
  taxAmountKobo?: number | null;
}) => koboFromDual(c.taxAmountKobo, c.taxAmount);

export const creditNoteTotalKobo = (c: {
  total?: number | null;
  totalKobo?: number | null;
}) => koboFromDual(c.totalKobo, c.total);

export const offerSubtotalKobo = (o: {
  subtotal?: number | null;
  subtotalKobo?: number | null;
}) => koboFromDual(o.subtotalKobo, o.subtotal);

export const offerTaxAmountKobo = (o: {
  taxAmount?: number | null;
  taxAmountKobo?: number | null;
}) => koboFromDual(o.taxAmountKobo, o.taxAmount);

export const offerTotalKobo = (o: {
  total?: number | null;
  totalKobo?: number | null;
}) => koboFromDual(o.totalKobo, o.total);

export const offerItemUnitPriceKobo = (it: {
  unitPrice?: number | null;
  unitPriceKobo?: number | null;
}) => koboFromDual(it.unitPriceKobo, it.unitPrice);

export const orderConfirmationTotalKobo = (o: {
  total?: number | null;
  totalKobo?: number | null;
}) => koboFromDual(o.totalKobo, o.total);

export const productPriceKobo = (p: {
  price?: number | null;
  priceKobo?: number | null;
}) => koboFromDual(p.priceKobo, p.price);

export const productCostKobo = (p: {
  cost?: number | null;
  costKobo?: number | null;
}) => nullableKoboFromDual(p.costKobo, p.cost);

export const staffPaymentAmountKobo = (s: {
  amount?: number | null;
  amountKobo?: number | null;
}) => koboFromDual(s.amountKobo, s.amount);

export const customerTotalPaidKobo = (c: {
  totalPaid?: number | null;
  totalPaidKobo?: number | null;
}) => koboFromDual(c.totalPaidKobo, c.totalPaid);

export const customerTotalOwedKobo = (c: {
  totalOwed?: number | null;
  totalOwedKobo?: number | null;
}) => koboFromDual(c.totalOwedKobo, c.totalOwed);
