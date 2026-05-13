/**
 * Tests for the canonical money utilities. Money math has to be exact:
 * every invoice total, receipt amount, refund, and report depends on
 * `nairaToKobo` / `koboToNaira` / `formatKobo` / `safeMoneyInputToKobo`
 * being correct, including at the rounding and overflow boundaries.
 */

import { describe, it, expect } from 'vitest';
import {
  nairaToKobo,
  koboToNaira,
  formatKobo,
  safeMoneyInputToKobo,
} from './money';

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

describe('formatKobo', () => {
  it('formats whole-naira amounts without decimal', () => {
    expect(formatKobo(10_000)).toBe('₦100');
    expect(formatKobo(1_250_000)).toBe('₦12,500');
    expect(formatKobo(0)).toBe('₦0');
  });

  it('formats sub-naira remainder with two decimal digits', () => {
    expect(formatKobo(10_050)).toBe('₦100.50');
    expect(formatKobo(1_250_050)).toBe('₦12,500.50');
    expect(formatKobo(101)).toBe('₦1.01');
  });

  it('uses leading minus for negative values, before the symbol', () => {
    expect(formatKobo(-500_000)).toBe('-₦5,000');
    expect(formatKobo(-101)).toBe('-₦1.01');
  });

  it('falls back to ₦0 on non-finite input', () => {
    expect(formatKobo(NaN)).toBe('₦0');
    expect(formatKobo(Infinity)).toBe('₦0');
    // @ts-expect-error testing runtime guard
    expect(formatKobo(undefined)).toBe('₦0');
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
