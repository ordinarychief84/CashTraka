/**
 * Batch Cost Intelligence — pure calculation function.
 *
 * No DB calls, no side effects, no logging. Fully unit-testable. The
 * caller (server action in /api/production-orders/[id]/batch-cost) is
 * responsible for fetching inputs and persisting the result.
 *
 * Money rule: all amounts are Int kobo. Every division goes through
 * Math.round() so the output never carries a float. Outputs are
 * structurally Int; runtime asserts would be redundant once the
 * types check.
 */

export type BatchCostInput = {
  /** Total units in this production run. Must be > 0. */
  quantity: number;
  recipeLines: {
    rawMaterialId: string;
    rawMaterialName: string;
    /** Amount of this material needed per 1 unit of product. */
    quantityPerUnit: number;
    unit: string;
  }[];
  /** Map of rawMaterialId → unitPriceKobo from the most recent received PO. */
  latestPOPrices: Record<string, number>;
  labourCostKobo: number;
  overheadCostKobo: number;
  /** Revenue snapshot from the linked CustomerOrder. 0 when not linked. */
  revenueKobo: number;
};

export type BatchCostLineItem = {
  rawMaterialId: string;
  rawMaterialName: string;
  qtyNeeded: number;
  unit: string;
  unitPriceKobo: number;
  totalKobo: number;
  /** True when the material had no PO price on record (totalKobo === 0). */
  isMissing: boolean;
};

export type BatchCostResult = {
  materialCostKobo: number;
  totalCostKobo: number;
  revenueKobo: number;
  /** Basis points. (revenue - totalCost) / revenue × 10000, Math.round().
   *  Negative when totalCost > revenue. 0 when revenueKobo === 0. */
  grossMarginBps: number;
  costPerUnitKobo: number;
  hasUnpricedMaterials: boolean;
  lineItems: BatchCostLineItem[];
};

export function calculateBatchCost(input: BatchCostInput): BatchCostResult {
  if (input.quantity <= 0 || !Number.isFinite(input.quantity)) {
    throw new Error('quantity must be a positive number');
  }

  let materialCostKobo = 0;
  let hasUnpricedMaterials = false;
  const lineItems: BatchCostLineItem[] = [];

  for (const line of input.recipeLines) {
    const qtyNeeded = line.quantityPerUnit * input.quantity;
    const unitPriceKobo = input.latestPOPrices[line.rawMaterialId] ?? 0;
    const isMissing = unitPriceKobo === 0;
    if (isMissing) hasUnpricedMaterials = true;
    // Decimal qtyNeeded × Int kobo → Math.round to Int kobo.
    const totalKobo = Math.round(qtyNeeded * unitPriceKobo);
    materialCostKobo += totalKobo;
    lineItems.push({
      rawMaterialId: line.rawMaterialId,
      rawMaterialName: line.rawMaterialName,
      qtyNeeded,
      unit: line.unit,
      unitPriceKobo,
      totalKobo,
      isMissing,
    });
  }

  const totalCostKobo =
    materialCostKobo + Math.max(0, input.labourCostKobo) + Math.max(0, input.overheadCostKobo);

  const grossMarginBps =
    input.revenueKobo === 0
      ? 0
      : Math.round(((input.revenueKobo - totalCostKobo) / input.revenueKobo) * 10000);

  const costPerUnitKobo = Math.round(totalCostKobo / input.quantity);

  return {
    materialCostKobo,
    totalCostKobo,
    revenueKobo: input.revenueKobo,
    grossMarginBps,
    costPerUnitKobo,
    hasUnpricedMaterials,
    lineItems,
  };
}
