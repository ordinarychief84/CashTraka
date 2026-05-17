/**
 * Tests for calculateBatchCost() — covers every acceptance case in the
 * Batch Cost Intelligence spec.
 *
 *   1. All materials have PO prices → correct totals.
 *   2. One material missing PO price → that line is isMissing=true with
 *      totalKobo=0, and the result.hasUnpricedMaterials is true.
 *   3. All materials missing → materialCostKobo=0, hasUnpricedMaterials.
 *   4. Negative margin (cost > revenue) → grossMarginBps is negative int.
 *   5. revenueKobo = 0 → grossMarginBps = 0 (no division).
 *   6. quantity = 0 → throws (does not divide by zero).
 *   7. Every numeric output is an integer (no float leaks).
 */

import { describe, it, expect } from 'vitest';
import { calculateBatchCost, type BatchCostInput } from './batch-cost';

function baseInput(overrides: Partial<BatchCostInput> = {}): BatchCostInput {
  return {
    quantity: 10,
    recipeLines: [
      { rawMaterialId: 'shea', rawMaterialName: 'Shea butter', quantityPerUnit: 0.5, unit: 'kg' },
      { rawMaterialId: 'frag', rawMaterialName: 'Fragrance oil', quantityPerUnit: 0.02, unit: 'L' },
      { rawMaterialId: 'pkg', rawMaterialName: 'Packaging', quantityPerUnit: 1, unit: 'unit' },
    ],
    latestPOPrices: {
      shea: 2_000_00, // ₦2,000 / kg
      frag: 450_000_00, // ₦450,000 / L
      pkg: 150_00, // ₦150 / unit
    },
    labourCostKobo: 3_000_00,
    overheadCostKobo: 2_000_00,
    revenueKobo: 50_000_00,
    ...overrides,
  };
}

describe('calculateBatchCost', () => {
  it('1. all materials priced → correct totals', () => {
    const result = calculateBatchCost(baseInput());
    // Shea: 0.5 × 10 × 2,000_00 = 10_000_00
    // Frag: 0.02 × 10 × 450,000_00 = 90_000_00
    // Pkg:  1   × 10 × 150_00     = 1_500_00
    // Material total = 101_500_00
    expect(result.materialCostKobo).toBe(10_000_00 + 90_000_00 + 1_500_00);
    expect(result.totalCostKobo).toBe(result.materialCostKobo + 3_000_00 + 2_000_00);
    expect(result.hasUnpricedMaterials).toBe(false);
    expect(result.lineItems).toHaveLength(3);
    for (const line of result.lineItems) {
      expect(line.isMissing).toBe(false);
      expect(Number.isInteger(line.totalKobo)).toBe(true);
    }
  });

  it('2. one material missing PO price → flagged, totalKobo=0 on that line', () => {
    const result = calculateBatchCost(
      baseInput({
        latestPOPrices: { shea: 2_000_00, pkg: 150_00 }, // frag missing
      }),
    );
    const fragLine = result.lineItems.find((l) => l.rawMaterialId === 'frag')!;
    expect(fragLine.isMissing).toBe(true);
    expect(fragLine.totalKobo).toBe(0);
    expect(fragLine.unitPriceKobo).toBe(0);
    expect(result.hasUnpricedMaterials).toBe(true);
    // Material total no longer includes fragrance.
    expect(result.materialCostKobo).toBe(10_000_00 + 1_500_00);
  });

  it('3. all materials missing → materialCostKobo=0, hasUnpricedMaterials=true', () => {
    const result = calculateBatchCost(baseInput({ latestPOPrices: {} }));
    expect(result.materialCostKobo).toBe(0);
    expect(result.hasUnpricedMaterials).toBe(true);
    expect(result.lineItems.every((l) => l.isMissing && l.totalKobo === 0)).toBe(true);
    // totalCost is still labour + overhead.
    expect(result.totalCostKobo).toBe(3_000_00 + 2_000_00);
  });

  it('4. negative margin → grossMarginBps is a negative integer', () => {
    const result = calculateBatchCost(
      baseInput({
        labourCostKobo: 100_000_00, // blow up the cost
        overheadCostKobo: 0,
        revenueKobo: 50_000_00,
      }),
    );
    expect(result.grossMarginBps).toBeLessThan(0);
    expect(Number.isInteger(result.grossMarginBps)).toBe(true);
    expect(result.totalCostKobo).toBeGreaterThan(result.revenueKobo);
  });

  it('5. revenueKobo = 0 → grossMarginBps = 0, no division', () => {
    const result = calculateBatchCost(baseInput({ revenueKobo: 0 }));
    expect(result.grossMarginBps).toBe(0);
    expect(result.revenueKobo).toBe(0);
    // Total cost still computed correctly.
    expect(result.totalCostKobo).toBeGreaterThan(0);
  });

  it('6. quantity = 0 → throws, does not divide by zero', () => {
    expect(() => calculateBatchCost(baseInput({ quantity: 0 }))).toThrow();
    expect(() => calculateBatchCost(baseInput({ quantity: -1 }))).toThrow();
    expect(() => calculateBatchCost(baseInput({ quantity: NaN }))).toThrow();
  });

  it('7. every numeric output is an integer (no float leaks)', () => {
    const result = calculateBatchCost(baseInput());
    expect(Number.isInteger(result.materialCostKobo)).toBe(true);
    expect(Number.isInteger(result.totalCostKobo)).toBe(true);
    expect(Number.isInteger(result.revenueKobo)).toBe(true);
    expect(Number.isInteger(result.grossMarginBps)).toBe(true);
    expect(Number.isInteger(result.costPerUnitKobo)).toBe(true);
    for (const line of result.lineItems) {
      expect(Number.isInteger(line.totalKobo)).toBe(true);
      expect(Number.isInteger(line.unitPriceKobo)).toBe(true);
    }
  });
});
