import { prisma } from '@/lib/prisma';

/**
 * "Can I produce this customer order right now?" — operational readiness
 * check that surfaces directly on the order detail page so the owner can
 * answer the question in 3 seconds instead of opening Materials + cross-
 * referencing recipes manually.
 *
 * Maths:
 *   For each order item:
 *     required(material) += ceil(recipeItem.quantity × item.quantity / recipe.yieldQty)
 *   Per-material coverage = min(onHand / required, 1)
 *   Overall readiness % = min(coverage across materials) × 100
 *     i.e. the weakest material limits the whole order. This matches
 *     reality — you can't produce one cake with 90% of the eggs.
 *
 * Returns 100% with `producible = true` when the order has zero recipe
 * dependencies (e.g. resale-only goods).
 */
export type OrderReadiness = {
  readinessPct: number;
  producible: boolean;
  shortMaterials: {
    materialId: string;
    materialName: string;
    unit: string;
    required: number;
    onHand: number;
    shortBy: number;
    coveragePct: number;
  }[];
  // Items that have no recipe attached — we can't reason about their
  // materials, so the owner sees a hint instead of a false-positive 100%.
  itemsWithoutRecipe: { description: string; quantity: number }[];
};

export const orderReadinessService = {
  async forCustomerOrder(userId: string, customerOrderId: string): Promise<OrderReadiness> {
    const order = await prisma.customerOrder.findFirst({
      where: { id: customerOrderId, userId, deletedAt: null },
      include: {
        items: {
          include: {
            product: {
              include: {
                recipe: {
                  include: { items: { include: { material: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!order) {
      return {
        readinessPct: 0,
        producible: false,
        shortMaterials: [],
        itemsWithoutRecipe: [],
      };
    }

    const byMaterial = new Map<
      string,
      { name: string; unit: string; required: number; onHand: number }
    >();
    const itemsWithoutRecipe: OrderReadiness['itemsWithoutRecipe'] = [];

    for (const item of order.items) {
      const recipe = item.product?.recipe;
      if (!recipe || recipe.deletedAt) {
        itemsWithoutRecipe.push({
          description: item.description,
          quantity: item.quantity,
        });
        continue;
      }
      const yieldQty = Math.max(1, recipe.yieldQty);
      for (const ri of recipe.items) {
        const required = Math.ceil((ri.quantity * item.quantity) / yieldQty);
        const existing = byMaterial.get(ri.materialId) ?? {
          name: ri.material.name,
          unit: ri.material.unit,
          required: 0,
          onHand: ri.material.stock,
        };
        existing.required += required;
        byMaterial.set(ri.materialId, existing);
      }
    }

    if (byMaterial.size === 0) {
      // No recipe-bearing items at all — treat as fully producible since
      // we have no signal to say otherwise. The hint about items-without-
      // recipe is surfaced separately so the user knows we couldn't check.
      return {
        readinessPct: itemsWithoutRecipe.length === 0 ? 100 : 0,
        producible: itemsWithoutRecipe.length === 0,
        shortMaterials: [],
        itemsWithoutRecipe,
      };
    }

    let minCoverage = 1;
    const shortMaterials: OrderReadiness['shortMaterials'] = [];
    for (const [materialId, row] of byMaterial.entries()) {
      const coverage = row.required > 0 ? Math.min(row.onHand / row.required, 1) : 1;
      minCoverage = Math.min(minCoverage, coverage);
      if (row.onHand < row.required) {
        shortMaterials.push({
          materialId,
          materialName: row.name,
          unit: row.unit,
          required: row.required,
          onHand: row.onHand,
          shortBy: row.required - row.onHand,
          coveragePct: Math.round(coverage * 100),
        });
      }
    }
    shortMaterials.sort((a, b) => a.coveragePct - b.coveragePct);

    return {
      readinessPct: Math.round(minCoverage * 100),
      producible: shortMaterials.length === 0,
      shortMaterials,
      itemsWithoutRecipe,
    };
  },
};
