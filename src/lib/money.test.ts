/**
 * Tests for the canonical money utilities.
 *
 * Written in vitest's `describe / it / expect` style. The repo does not
 * yet have a test runner wired in (no `vitest` or `jest` in deps), so
 * these don't execute in CI yet — they document the intended behaviour
 * and run as soon as Phase 6 of the kobo migration plan adds vitest.
 *
 * Until then, treat this file as executable spec: when changing
 * `money.ts`, mentally walk each case below and confirm the new
 * behaviour still matches.
 */

import {
  nairaToKobo,
  koboToNaira,
  formatNaira,
  safeMoneyInputToKobo,
} from './money';

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (actual: unknown) => {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
  toThrow: () => void;
};

describe('nairaToKobo', () => {
  it('converts whole naira to kobo', () => {
    expect(nairaToKobo(100)).toBe(10_000);
    expect(nairaToKobo(1)).toBe(100);
    expect(nairaToKobo(0)).toBe(0);
  });

  it('converts decimal naira with kobo precision', () => {
    expect(nairaToKobo(1.5)).toBe(150);
    expect(nairaToKobo(99.99)).toBe(9_999);
    expect(nairaToKobo(0.01)).toBe(1);
  });

  it('handles negative values symmetrically', () => {
    expect(nairaToKobo(-100)).toBe(-10_000);
    expect(nairaToKobo(-0.5)).toBe(-50);
    expect(nairaToKobo(-0.005)).toBe(-1);
  });

  it('rounds half away from zero', () => {
    expect(nairaToKobo(0.005)).toBe(1);
    expect(nairaToKobo(-0.005)).toBe(-1);
  });

  it('throws on NaN, Infinity, or non-number', () => {
    expect(() => nairaToKobo(NaN)).toThrow();
    expect(() => nairaToKobo(Infinity)).toThrow();
    expect(() => nairaToKobo(-Infinity)).toThrow();
    // @ts-expect-error testing runtime guard
    expect(() => nairaToKobo('100')).toThrow();
    // @ts-expect-error testing runtime guard
    expect(() => nairaToKobo(null)).toThrow();
  });
});

describe('koboToNaira', () => {
  it('converts kobo back to naira', () => {
    expect(koboToNaira(10_000)).toBe(100);
    expect(koboToNaira(150)).toBe(1.5);
    expect(koboToNaira(0)).toBe(0);
  });

  it('round-trips through nairaToKobo', () => {
    expect(koboToNaira(nairaToKobo(1234.56))).toBe(1234.56);
    expect(koboToNaira(nairaToKobo(0.01))).toBe(0.01);
    expect(koboToNaira(nairaToKobo(-99.99))).toBe(-99.99);
  });

  it('returns 0 for non-finite input rather than throwing', () => {
    expect(koboToNaira(NaN)).toBe(0);
    expect(koboToNaira(Infinity)).toBe(0);
    // @ts-expect-error testing runtime guard
    expect(koboToNaira(null)).toBe(0);
  });
});

describe('formatNaira', () => {
  it('formats whole-naira amounts without decimal', () => {
    expect(formatNaira(10_000)).toBe('₦100');
    expect(formatNaira(1_250_000)).toBe('₦12,500');
    expect(formatNaira(0)).toBe('₦0');
  });

  it('formats sub-naira remainder with two decimal digits', () => {
    expect(formatNaira(10_050)).toBe('₦100.50');
    expect(formatNaira(1_250_050)).toBe('₦12,500.50');
    expect(formatNaira(101)).toBe('₦1.01');
  });

  it('uses leading minus for negative values, before the symbol', () => {
    expect(formatNaira(-500_000)).toBe('-₦5,000');
    expect(formatNaira(-101)).toBe('-₦1.01');
  });

  it('falls back to ₦0 on non-finite input', () => {
    expect(formatNaira(NaN)).toBe('₦0');
    expect(formatNaira(Infinity)).toBe('₦0');
    // @ts-expect-error testing runtime guard
    expect(formatNaira(undefined)).toBe('₦0');
  });
});

describe('safeMoneyInputToKobo', () => {
  it('parses plain digit strings', () => {
    expect(safeMoneyInputToKobo('5000')).toBe(500_000);
    expect(safeMoneyInputToKobo('0')).toBe(0);
  });

  it('parses comma-separated thousands', () => {
    expect(safeMoneyInputToKobo('5,000')).toBe(500_000);
    expect(safeMoneyInputToKobo('1,250,000')).toBe(125_000_000);
  });

  it('parses optional naira symbol prefix', () => {
    expect(safeMoneyInputToKobo('₦5,000')).toBe(500_000);
    expect(safeMoneyInputToKobo('₦5,000.50')).toBe(500_050);
  });

  it('parses decimal kobo precision', () => {
    expect(safeMoneyInputToKobo('5,000.50')).toBe(500_050);
    expect(safeMoneyInputToKobo('0.01')).toBe(1);
  });

  it('parses negative inputs', () => {
    expect(safeMoneyInputToKobo('-5000')).toBe(-500_000);
    expect(safeMoneyInputToKobo('-₦5,000')).toBe(-500_000);
  });

  it('accepts numbers directly', () => {
    expect(safeMoneyInputToKobo(5000)).toBe(500_000);
    expect(safeMoneyInputToKobo(99.99)).toBe(9_999);
  });

  it('returns null for empty / null / undefined', () => {
    expect(safeMoneyInputToKobo('')).toBeNull();
    expect(safeMoneyInputToKobo('   ')).toBeNull();
    expect(safeMoneyInputToKobo(null)).toBeNull();
    expect(safeMoneyInputToKobo(undefined)).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(safeMoneyInputToKobo('abc')).toBeNull();
    expect(safeMoneyInputToKobo('5000abc')).toBeNull();
    expect(safeMoneyInputToKobo('5.0.0')).toBeNull();
    expect(safeMoneyInputToKobo('5,000 NGN')).toBeNull();
    expect(safeMoneyInputToKobo('<script>alert(1)</script>')).toBeNull();
  });

  it('returns null for non-finite numeric input', () => {
    expect(safeMoneyInputToKobo(NaN)).toBeNull();
    expect(safeMoneyInputToKobo(Infinity)).toBeNull();
  });
});
