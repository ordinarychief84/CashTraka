/**
 * Currency catalog invariants.
 *
 * CashTraka is Africa-first / Nigeria-first. These tests fail fast if
 * any future edit:
 *   • removes NGN
 *   • introduces duplicate codes
 *   • breaks the region grouping the Add-currency picker relies on
 *   • adds a non-ISO-4217-shaped code
 */

import { describe, it, expect } from 'vitest';
import {
  CURRENCY_CATALOG,
  CURRENCY_CODES,
  getCurrencyInfo,
} from './currency-catalog';

describe('CURRENCY_CATALOG — structural invariants', () => {
  it('has at least the 6 African region buckets covered', () => {
    const regions = new Set(CURRENCY_CATALOG.map((c) => c.region));
    expect(regions.has('West Africa')).toBe(true);
    expect(regions.has('East Africa')).toBe(true);
    expect(regions.has('Southern Africa')).toBe(true);
    expect(regions.has('Central Africa')).toBe(true);
    expect(regions.has('North Africa')).toBe(true);
    expect(regions.has('International')).toBe(true);
  });

  it('every code is a 3-letter uppercase ISO 4217 shape', () => {
    for (const entry of CURRENCY_CATALOG) {
      expect(entry.code).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('has no duplicate codes', () => {
    const seen = new Set<string>();
    for (const c of CURRENCY_CODES) {
      expect(seen.has(c), `${c} appears more than once`).toBe(false);
      seen.add(c);
    }
  });

  it('every entry has a non-empty name', () => {
    for (const entry of CURRENCY_CATALOG) {
      expect(entry.name.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('Africa-first ordering', () => {
  it('NGN is the very first entry in the catalog', () => {
    // Nigerian Naira is the runtime default for new tenants.
    // If this test ever fails, the lazy-seed in currenciesService
    // would still set NGN as the default, but the Add-currency
    // modal's regional ordering would suddenly bury it.
    expect(CURRENCY_CATALOG[0].code).toBe('NGN');
  });

  it('NGN is tagged as West Africa', () => {
    const ngn = getCurrencyInfo('NGN');
    expect(ngn?.region).toBe('West Africa');
  });

  it('USD does not precede any African currency in the array', () => {
    // The catalog's natural order drives "Africa first" in the
    // Add-currency picker. Reserve currencies should sit at the
    // tail, not interleaved with African blocks.
    const usdIdx = CURRENCY_CATALOG.findIndex((c) => c.code === 'USD');
    const lastAfricanIdx = (() => {
      for (let i = CURRENCY_CATALOG.length - 1; i >= 0; i--) {
        if (CURRENCY_CATALOG[i].region !== 'International') return i;
      }
      return -1;
    })();
    expect(usdIdx).toBeGreaterThan(lastAfricanIdx);
  });
});

describe('getCurrencyInfo', () => {
  it('returns the entry for a known code', () => {
    const ngn = getCurrencyInfo('NGN');
    expect(ngn?.code).toBe('NGN');
    expect(ngn?.name).toBe('Nigerian Naira');
    expect(ngn?.symbol).toBe('₦');
  });

  it('is case-insensitive on input', () => {
    expect(getCurrencyInfo('ngn')?.code).toBe('NGN');
    expect(getCurrencyInfo('NgN')?.code).toBe('NGN');
  });

  it('returns undefined for unknown codes', () => {
    expect(getCurrencyInfo('XYZ')).toBeUndefined();
    expect(getCurrencyInfo('')).toBeUndefined();
  });
});

describe('Sample-rate sanity (Naira-relative)', () => {
  it('NGN sample rate vs NGN is 1', () => {
    expect(getCurrencyInfo('NGN')?.sampleRateVsNgn).toBe(1);
  });

  it('every catalog entry that has a sample rate has a positive number', () => {
    for (const c of CURRENCY_CATALOG) {
      if (c.sampleRateVsNgn === undefined) continue;
      expect(Number.isFinite(c.sampleRateVsNgn)).toBe(true);
      expect(c.sampleRateVsNgn).toBeGreaterThan(0);
    }
  });
});

describe('Coverage of key African economies', () => {
  // These codes drive the Add-currency picker's "most useful for
  // a Nigerian SMB" experience. The test fails if any go missing
  // — a regression that would meaningfully degrade African UX.
  const KEY_AFRICAN = [
    'NGN', 'GHS', 'XOF', 'KES', 'UGX', 'TZS',
    'ZAR', 'ZMW', 'EGP', 'MAD', 'ETB', 'XAF',
  ];

  it.each(KEY_AFRICAN)('catalog includes %s', (code) => {
    expect(CURRENCY_CODES).toContain(code);
  });

  it('catalog includes the three key reserves African businesses transact in', () => {
    expect(CURRENCY_CODES).toContain('USD');
    expect(CURRENCY_CODES).toContain('EUR');
    expect(CURRENCY_CODES).toContain('GBP');
  });
});
