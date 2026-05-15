import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';

/**
 * Per-order margin computation. Surfaces the answer to "is this order
 * worth doing?" right next to the readiness gauge on the order detail
 * page. The math:
 *
 *   revenueKobo  = sum(CustomerOrderItem.totalKobo)
 *   materialCost = sum( recipeUnitCostKobo(productId) × quantity )
 *   profitKobo   = revenueKobo − materialCost
 *   marginPct    = profitKobo / revenueKobo × 100
 *
 * Coverage: only items with a linked product + recipe contribute to
 * materialCost. The shape returns an `incomplete` flag so the UI can
 * say "based on 2 of 3 items" when one is custom-priced without a
 * recipe — never silently understates cost.
 *
 * Read-only — does NOT persist anything. Cheap to call on every
 * detail-page render.
 */

export type OrderMargin = {
  revenueKobo: number;
  materialCostKobo: number;
  profitKobo: number;
  marginPct: number | null;
  /** Items whose product has a recipe — used in the per-item cost calc. */
  itemsWithRecipe: number;
  /** Items with no recipe (or no product) — surfaced so UI can warn. */
  itemsWithoutRecipe: number;
  /** True when at least one item couldn't be costed (no recipe). */
  incomplete: boolean;
};

export const orderMarginService = {
  async forCustomerOrder(userId: string, customerOrderId: string): Promise<OrderMargin> {
    const order = await prisma.customerOrder.findFirst({
      where: { id: customerOrderId, userId, deletedAt: null },
      include: {
        items: {
          select: {
            quantity: true,
            unitPriceKobo: true,
            totalKobo: true,
            productId: true,
            product: { select: { id: true, recipe: { select: { id: true } } } },
          },
        },
      },
    });
    if (!order) {
      return zero();
    }

    const revenueKobo = order.items.reduce((s, it) => s + it.totalKobo, 0);

    // Resolve recipe cost per product once — products can repeat across
    // items in theory, and avoiding a double-DB-hit keeps render fast.
    const productIds = Array.from(
      new Set(
        order.items
          .map((it) => it.productId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const unitCostByProduct = new Map<string, number>();
    for (const pid of productIds) {
      const unit = await inventoryService.computeRecipeUnitCostKobo(userId, pid);
      unitCostByProduct.set(pid, unit);
    }

    let materialCostKobo = 0;
    let itemsWithRecipe = 0;
    let itemsWithoutRecipe = 0;
    for (const it of order.items) {
      const hasRecipe = Boolean(it.product?.recipe?.id);
      if (hasRecipe && it.productId) {
        const unit = unitCostByProduct.get(it.productId) ?? 0;
        materialCostKobo += unit * it.quantity;
        itemsWithRecipe++;
      } else {
        itemsWithoutRecipe++;
      }
    }

    const profitKobo = revenueKobo - materialCostKobo;
    const marginPct =
      revenueKobo > 0 ? (profitKobo / revenueKobo) * 100 : null;

    return {
      revenueKobo,
      materialCostKobo,
      profitKobo,
      marginPct: marginPct !== null ? Math.round(marginPct * 10) / 10 : null,
      itemsWithRecipe,
      itemsWithoutRecipe,
      incomplete: itemsWithoutRecipe > 0,
    };
  },
};

function zero(): OrderMargin {
  return {
    revenueKobo: 0,
    materialCostKobo: 0,
    profitKobo: 0,
    marginPct: null,
    itemsWithRecipe: 0,
    itemsWithoutRecipe: 0,
    incomplete: false,
  };
}
