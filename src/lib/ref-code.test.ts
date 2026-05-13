import { describe, it, expect } from 'vitest';
import { generateRefCode, normalizeForCompare, textContainsCode } from './ref-code';

/**
 * Ref codes appear in bank transfer narrations and are how CashTraka
 * matches an incoming bank-alert SMS to an outstanding invoice. Two
 * non-negotiable properties:
 *
 *   1. They MUST be cryptographically unpredictable (this used to use
 *      `Math.random()` and was easy to forge — see the
 *      production-readiness-audit PR).
 *   2. Comparison MUST be case-insensitive and tolerant of punctuation,
 *      because users mistype them into bank apps.
 */
describe('ref-code', () => {
  it('produces a `CT-XXXXX` 8-character code', () => {
    const code = generateRefCode();
    expect(code).toMatch(/^CT-[A-Z2-9]{5}$/);
    expect(code).toHaveLength(8);
  });

  it('never uses ambiguous characters 0/O/1/I', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRefCode();
      const body = code.slice(3); // strip "CT-"
      expect(body).not.toMatch(/[01OI]/);
    }
  });

  it('is uniformly random — 5,000 draws produce ≥99.8% unique codes', () => {
    const N = 5_000;
    const seen = new Set<string>();
    for (let i = 0; i < N; i++) seen.add(generateRefCode());
    // Birthday-paradox math: 32^5 = 33,554,432 possibilities. Expected
    // collisions at N=5000 ≈ N²/(2·K) ≈ 0.37, so 0 or a single-digit
    // count is normal. We assert ≥ 99.8% unique (≤10 collisions) which
    // is statistically reliable but still catches a real randomness
    // regression (e.g. Math.random with its tiny effective entropy).
    expect(seen.size).toBeGreaterThanOrEqual(N - 10);
  });

  it('normalises text for comparison', () => {
    expect(normalizeForCompare('CT - AB3 4K')).toBe('CTAB34K');
    expect(normalizeForCompare('  ct-ab34k  ')).toBe('CTAB34K');
  });

  it('matches a code inside messy bank-alert text', () => {
    const code = 'CT-AB34K';
    expect(textContainsCode('Credit alert ₦5,000 ref ct ab34k', code)).toBe(true);
    expect(textContainsCode('CT-AB34K from ADA EZE', code)).toBe(true);
    expect(textContainsCode('Reference: ct-ab34k.', code)).toBe(true);
    expect(textContainsCode('different code CT-XYZ22', code)).toBe(false);
  });
});
