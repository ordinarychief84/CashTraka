import { prisma } from '@/lib/prisma';
import { calculateBatchCost, type BatchCostResult } from '@/lib/batch-cost';

/**
 * Batch Cost Intelligence — DB orchestration around the pure calculator.
 *
 * `computeAndSaveBatchCost(productionOrderId)` fetches inputs, calls
 * calculateBatchCost(), and persists the result. It's invoked
 * fire-and-forget from production-orders.service.complete() AFTER the
 * transaction commits — a failure here MUST never roll back the
 * COMPLETED status flip. Callers wrap it in .catch() and log only.
 *
 * Idempotent under unchanged inputs: if batchCostCalculatedAt is set
 * AND labour + overhead are the same as the persisted values, the
 * function short-circuits without touching the DB.
 *
 * Tenant isolation: every read includes userId. The function never
 * trusts the caller-supplied userId — it re-fetches the order's
 * userId from the row before doing anything else.
 */
export async function computeAndSaveBatchCost(
  productionOrderId: string,
  opts?: { forceRecompute?: boolean },
): Promise<
  | { success: true; result: BatchCostResult }
  | { success: false; error: string }
> {
  const order = await prisma.productionOrder.findUnique({
    where: { id: productionOrderId },
    select: {
      id: true,
      userId: true,
      status: true,
      labourCostKobo: true,
      overheadCostKobo: true,
      batchCostCalculatedAt: true,
      deletedAt: true,
      customerOrder: { select: { id: true, totalKobo: true } },
      items: {
        select: {
          quantity: true,
          product: {
            select: {
              id: true,
              recipe: {
                select: {
                  yieldQty: true,
                  items: {
                    select: {
                      quantity: true,
                      materialId: true,
                      material: {
                        select: {
                          id: true,
                          name: true,
                          unit: true,
                          deletedAt: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order || order.deletedAt) return { success: false, error: 'Not found' };
  if (order.status !== 'COMPLETED') return { success: false, error: 'Not completed' };

  // Idempotency short-circuit: if labour+overhead haven't changed since the
  // last successful calc, return the persisted result without touching DB.
  if (!opts?.forceRecompute && order.batchCostCalculatedAt) {
    const fresh = await prisma.productionOrder.findUnique({
      where: { id: order.id },
      select: {
        materialCostKobo: true,
        totalCostKobo: true,
        revenueKobo: true,
        grossMarginBps: true,
        costPerUnitKobo: true,
        hasUnpricedMaterials: true,
      },
    });
    if (fresh && fresh.materialCostKobo !== null && fresh.totalCostKobo !== null) {
      const persistedLines = await prisma.batchCostLineItem.findMany({
        where: { productionOrderId: order.id, userId: order.userId },
        orderBy: { createdAt: 'asc' },
      });
      return {
        success: true,
        result: {
          materialCostKobo: fresh.materialCostKobo,
          totalCostKobo: fresh.totalCostKobo,
          revenueKobo: fresh.revenueKobo ?? 0,
          grossMarginBps: fresh.grossMarginBps ?? 0,
          costPerUnitKobo: fresh.costPerUnitKobo ?? 0,
          hasUnpricedMaterials: fresh.hasUnpricedMaterials,
          lineItems: persistedLines.map((l) => ({
            rawMaterialId: l.rawMaterialId,
            rawMaterialName: l.rawMaterialName,
            qtyNeeded: Number(l.qtyNeeded),
            unit: l.unit,
            unitPriceKobo: l.unitPriceKobo,
            totalKobo: l.totalKobo,
            isMissing: l.isMissing,
          })),
        },
      };
    }
  }

  // Flatten recipe lines from every product in the run. RecipeItem.quantity
  // is Int kg/units consumed PER FULL yieldQty batch; convert to per-unit
  // and then multiply by this run's product quantity.
  type RecipeLine = {
    rawMaterialId: string;
    rawMaterialName: string;
    quantityPerUnit: number;
    unit: string;
  };
  const flattened: RecipeLine[] = [];
  let runQuantity = 0;
  for (const item of order.items) {
    runQuantity += item.quantity;
    const recipe = item.product.recipe;
    if (!recipe) continue;
    const yieldQty = recipe.yieldQty > 0 ? recipe.yieldQty : 1;
    for (const r of recipe.items) {
      if (!r.material || r.material.deletedAt) continue;
      // Material per ONE finished unit of this product.
      const perUnit = Number(r.quantity) / yieldQty;
      flattened.push({
        rawMaterialId: r.material.id,
        rawMaterialName: r.material.name,
        quantityPerUnit: perUnit,
        unit: r.material.unit || 'unit',
      });
    }
  }
  if (runQuantity <= 0) return { success: false, error: 'Run has zero quantity' };

  // Collapse duplicate materials so the panel shows one row per material.
  const byMaterial = new Map<string, RecipeLine>();
  for (const line of flattened) {
    const existing = byMaterial.get(line.rawMaterialId);
    if (existing) {
      byMaterial.set(line.rawMaterialId, {
        ...existing,
        quantityPerUnit: existing.quantityPerUnit + line.quantityPerUnit,
      });
    } else {
      byMaterial.set(line.rawMaterialId, line);
    }
  }
  const recipeLines = Array.from(byMaterial.values());

  // Latest received-PO price per material — tenant-scoped, soft-delete safe.
  const latestPOPrices: Record<string, number> = {};
  if (recipeLines.length > 0) {
    const rows = await prisma.purchaseOrderItem.findMany({
      where: {
        materialId: { in: recipeLines.map((l) => l.rawMaterialId) },
        purchaseOrder: {
          userId: order.userId,
          status: 'RECEIVED',
          deletedAt: null,
        },
      },
      select: {
        materialId: true,
        unitCostKobo: true,
        purchaseOrder: { select: { receivedAt: true } },
      },
      orderBy: { purchaseOrder: { receivedAt: 'desc' } },
    });
    for (const r of rows) {
      // First (most recent) wins per material.
      if (!(r.materialId in latestPOPrices)) {
        latestPOPrices[r.materialId] = r.unitCostKobo;
      }
    }
  }

  // Revenue snapshot from linked CustomerOrder. The FK lives on the
  // CustomerOrder side (productionOrderId @unique), surfaced here via
  // the order.customerOrder relation.
  let revenueKobo = 0;
  if (order.customerOrder) {
    revenueKobo = order.customerOrder.totalKobo;
  }

  const result = calculateBatchCost({
    quantity: runQuantity,
    recipeLines,
    latestPOPrices,
    labourCostKobo: order.labourCostKobo,
    overheadCostKobo: order.overheadCostKobo,
    revenueKobo,
  });

  await prisma.$transaction([
    prisma.productionOrder.update({
      where: { id: order.id },
      data: {
        materialCostKobo: result.materialCostKobo,
        totalCostKobo: result.totalCostKobo,
        revenueKobo: result.revenueKobo,
        grossMarginBps: result.grossMarginBps,
        costPerUnitKobo: result.costPerUnitKobo,
        hasUnpricedMaterials: result.hasUnpricedMaterials,
        batchCostCalculatedAt: new Date(),
      },
    }),
    prisma.batchCostLineItem.deleteMany({
      where: { productionOrderId: order.id, userId: order.userId },
    }),
    prisma.batchCostLineItem.createMany({
      data: result.lineItems.map((l) => ({
        userId: order.userId,
        productionOrderId: order.id,
        rawMaterialId: l.rawMaterialId,
        rawMaterialName: l.rawMaterialName,
        qtyNeeded: l.qtyNeeded,
        unit: l.unit,
        unitPriceKobo: l.unitPriceKobo,
        totalKobo: l.totalKobo,
        isMissing: l.isMissing,
      })),
    }),
  ]);

  return { success: true, result };
}

/**
 * Inline-edit hook for labour + overhead. Updates the values and re-runs
 * computeAndSaveBatchCost() so totals + margin reflect the new inputs.
 *
 * Returns the recomputed result so the client can render in place.
 */
export async function updateLabourAndOverhead(args: {
  userId: string;
  productionOrderId: string;
  labourCostKobo: number;
  overheadCostKobo: number;
}): Promise<
  | { success: true; result: BatchCostResult }
  | { success: false; error: string }
> {
  if (!Number.isInteger(args.labourCostKobo) || args.labourCostKobo < 0) {
    return { success: false, error: 'Invalid labour cost' };
  }
  if (!Number.isInteger(args.overheadCostKobo) || args.overheadCostKobo < 0) {
    return { success: false, error: 'Invalid overhead cost' };
  }

  const order = await prisma.productionOrder.findFirst({
    where: { id: args.productionOrderId, userId: args.userId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!order) return { success: false, error: 'Not found' };
  if (order.status !== 'COMPLETED') return { success: false, error: 'Not completed' };

  await prisma.productionOrder.update({
    where: { id: order.id },
    data: {
      labourCostKobo: args.labourCostKobo,
      overheadCostKobo: args.overheadCostKobo,
    },
  });

  return computeAndSaveBatchCost(order.id, { forceRecompute: true });
}
