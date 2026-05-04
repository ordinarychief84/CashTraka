/**
 * Tests for the dual-source kobo readers.
 *
 * Covers the three dual-write states a row can be in during the kobo
 * migration window:
 *   1. Pre-Phase-4 row: kobo column missing/zero, naira populated.
 *   2. Mid-window row: both columns populated and consistent.
 *   3. Post-Phase-6 row: kobo populated, legacy naira zero or unread.
 *
 * Vitest-style. See money.test.ts for the runner-wiring note.
 */

import {
  koboFromDual,
  nullableKoboFromDual,
  paymentAmountKobo,
  invoiceTotalKobo,
  invoiceAmountPaidKobo,
  receiptBalanceRemainingKobo,
  productCostKobo,
} from './money-readers';

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (actual: unknown) => {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
};

describe('koboFromDual', () => {
  it('prefers kobo when populated and non-zero', () => {
    expect(koboFromDual(150, 1)).toBe(150);
    expect(koboFromDual(99_999, 100)).toBe(99_999);
  });

  it('falls back to naira * 100 when kobo is null', () => {
    expect(koboFromDual(null, 100)).toBe(10_000);
    expect(koboFromDual(undefined, 50)).toBe(5_000);
  });

  it('falls back to naira * 100 when kobo is zero but naira is non-zero', () => {
    // Pre-Phase-4 default: kobo column added with default 0, naira has the
    // real value. Without this fallback every legacy row would read as
    // ₦0.
    expect(koboFromDual(0, 100)).toBe(10_000);
  });

  it('returns 0 when both are zero', () => {
    expect(koboFromDual(0, 0)).toBe(0);
  });

  it('returns 0 when both are null', () => {
    expect(koboFromDual(null, null)).toBe(0);
    expect(koboFromDual(undefined, undefined)).toBe(0);
  });

  it('ignores NaN/Infinity on the kobo side', () => {
    expect(koboFromDual(NaN, 100)).toBe(10_000);
    expect(koboFromDual(Infinity, 100)).toBe(10_000);
  });
});

describe('nullableKoboFromDual', () => {
  it('returns null when both inputs are null/undefined', () => {
    expect(nullableKoboFromDual(null, null)).toBeNull();
    expect(nullableKoboFromDual(undefined, undefined)).toBeNull();
  });

  it('returns the populated value when only one side is set', () => {
    expect(nullableKoboFromDual(150, null)).toBe(150);
    expect(nullableKoboFromDual(null, 100)).toBe(10_000);
  });

  it('preserves a real zero on either side', () => {
    expect(nullableKoboFromDual(0, null)).toBe(0);
    expect(nullableKoboFromDual(null, 0)).toBe(0);
  });
});

describe('typed wrappers', () => {
  it('paymentAmountKobo handles legacy-only row', () => {
    expect(paymentAmountKobo({ amount: 5000, amountKobo: 0 })).toBe(500_000);
  });

  it('paymentAmountKobo prefers kobo on a backfilled row', () => {
    expect(paymentAmountKobo({ amount: 5000, amountKobo: 500_000 })).toBe(500_000);
  });

  it('invoiceTotalKobo accepts a structural shape', () => {
    expect(invoiceTotalKobo({ total: 1000 })).toBe(100_000);
    expect(invoiceTotalKobo({ totalKobo: 100_000 })).toBe(100_000);
  });

  it('invoiceAmountPaidKobo handles real zero', () => {
    expect(invoiceAmountPaidKobo({ amountPaid: 0, amountPaidKobo: 0 })).toBe(0);
  });

  it('receiptBalanceRemainingKobo returns null when not set', () => {
    expect(receiptBalanceRemainingKobo({})).toBeNull();
    expect(receiptBalanceRemainingKobo({ balanceRemaining: null })).toBeNull();
  });

  it('productCostKobo returns null on missing cost', () => {
    expect(productCostKobo({})).toBeNull();
    expect(productCostKobo({ cost: 1500 })).toBe(150_000);
  });
});
