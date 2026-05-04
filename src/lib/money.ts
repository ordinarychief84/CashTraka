/**
 * Canonical money utilities for the kobo migration.
 *
 * The product stores money internally as integer kobo (1 NGN = 100 kobo).
 * UI shows naira to humans. This module is the only place naira-to-kobo
 * arithmetic is allowed; everything else routes through these helpers.
 *
 * Phase 1 of the kobo migration adds these helpers without touching any
 * call site. See `docs/kobo-migration-plan.md` for the full rollout.
 */

/**
 * Convert a naira amount (integer or decimal) to kobo (integer).
 *
 * Throws on NaN, Infinity, or non-finite. Rounds to the nearest kobo
 * using banker-style half-away-from-zero so 0.005 NGN rounds up to 1
 * kobo and -0.005 NGN rounds to -1 kobo. Negative values are allowed
 * (refunds, credit notes), zero is allowed.
 *
 * Use this at the boundary where naira input from the seller's form
 * enters the system. Never multiply a value by 100 anywhere else.
 */
export function nairaToKobo(naira: number): number {
  if (typeof naira !== 'number' || !Number.isFinite(naira)) {
    throw new Error(`nairaToKobo: expected finite number, got ${String(naira)}`);
  }
  // Math.round in JavaScript rounds half-toward-positive-infinity, which
  // means -0.5 rounds to 0, not -1. Use a sign-aware round so the
  // function is symmetrical for negative refunds.
  const sign = naira < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(naira) * 100);
}

/**
 * Convert kobo (integer) to naira (decimal).
 *
 * Returns 0 for non-finite input rather than throwing. This is the
 * read-side helper, used inside formatNaira and any code that needs the
 * raw decimal naira number. Display logic should usually call
 * formatNaira directly instead.
 */
export function koboToNaira(kobo: number): number {
  if (typeof kobo !== 'number' || !Number.isFinite(kobo)) return 0;
  return kobo / 100;
}

/**
 * Format kobo as a user-facing naira string ("₦12,500", "₦12,500.50").
 *
 * Always expects KOBO. Never pass naira here; the result will be 100x
 * too large.
 *
 * Whole-naira values omit the decimal portion. Sub-naira amounts show
 * exactly two decimals. Negative values use a leading minus sign before
 * the naira symbol so screen readers handle it correctly: -₦5,000.
 *
 * NaN / non-finite input falls back to "₦0".
 */
export function formatNaira(kobo: number): string {
  if (typeof kobo !== 'number' || !Number.isFinite(kobo)) {
    return '₦0';
  }
  const negative = kobo < 0;
  const abs = Math.abs(kobo);
  const naira = Math.trunc(abs / 100);
  const sub = abs % 100;
  const wholePart = naira.toLocaleString('en-NG');
  const decimalPart = sub === 0 ? '' : '.' + String(sub).padStart(2, '0');
  return (negative ? '-' : '') + '₦' + wholePart + decimalPart;
}

/**
 * Best-effort parse of raw user input into kobo. Used by form-submit
 * routes where the seller types something like "5000", "5,000", or
 * "5,000.50". Returns null when the input cannot be parsed as a finite
 * number, so the route can return a 400 to the user instead of writing
 * NaN to the database.
 *
 * Strips whitespace and thousands separators, accepts optional naira
 * symbol, accepts a single decimal point, rejects multiple decimals or
 * stray characters. Empty string and null both return null. Negative
 * inputs are allowed.
 */
export function safeMoneyInputToKobo(
  input: string | number | null | undefined,
): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;
    return nairaToKobo(input);
  }
  const cleaned = input
    .toString()
    .trim()
    .replace(/^₦/, '')
    .replace(/,/g, '');
  if (cleaned.length === 0) return null;
  // Reject anything that is not optional minus + digits + optional
  // decimal point + digits. Catches stray currency words, units, or
  // pasted markup.
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const naira = Number(cleaned);
  if (!Number.isFinite(naira)) return null;
  return nairaToKobo(naira);
}
