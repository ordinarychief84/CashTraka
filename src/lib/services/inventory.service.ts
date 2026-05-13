import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';

/**
 * Unified inventory ledger + low-stock / shortage compute layer.
 *
 * Every stock change for both Products and RawMaterials goes through
 * `recordMovement`, which writes a `StockMovement` row AND updates the
 * underlying item's `stock` column atomically. Reads come back through
 * `compute*` functions used by the dashboard, cron jobs, and the
 * production-order detail page.
 *
 * This skeleton ships `recordMovement` + `computeLowStockMaterials` only.
 * Shortage / expiring / batch-cost helpers land in PR-3.
 */

export type StockItemType = 'PRODUCT' | 'MATERIAL';

export type StockMovementReason =
  | 'PURCHASE_RECEIVE'
  | 'PRODUCTION_CONSUME'
  | 'PRODUCTION_PRODUCE'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'WRITE_OFF'
  | 'RETURN';

export type RecordMovementInput = {
  userId: string;
  itemType: StockItemType;
  itemId: string;
  reason: StockMovementReason;
  /** Positive for stock in, negative for stock out. */
  delta: number;
  refType?: string | null;
  refId?: string | null;
  notes?: string | null;
};

type PrismaTx = Prisma.TransactionClient;

export const inventoryService = {
  /**
   * Record a stock change. Updates the underlying Product.stock or
   * RawMaterial.stock atomically and writes a StockMovement row with
   * `balanceAfter` snapshot.
   *
   * Accepts an optional Prisma transaction client so callers can compose
   * multiple movements into one transaction (e.g. production runs).
   */
  async recordMovement(input: RecordMovementInput, tx?: PrismaTx) {
    if (!Number.isInteger(input.delta) || input.delta === 0) {
      throw Err.validation('Stock movement delta must be a non-zero integer.');
    }

    const exec = async (client: PrismaTx) => {
      // Update the stock in a SINGLE atomic SQL statement so two
      // simultaneous movements cannot both read the same starting value
      // and trample each other. We use a conditional UPDATE that returns
      // the new stock — Postgres locks the row for the duration of the
      // statement, so concurrent calls serialise correctly.
      //
      // Read-then-write via Prisma's update was NOT enough here: Prisma
      // does not emit SELECT FOR UPDATE, and `prisma.$transaction` does
      // not lock rows it has merely read with findUnique. We could add
      // an advisory lock, but a self-referential UPDATE is simpler and
      // also serves as the negative-stock guard in one shot.
      const safeUserId = input.userId;
      const safeItemId = input.itemId;
      const delta = input.delta;
      let balanceAfter: number;

      if (input.itemType === 'PRODUCT') {
        const rows = await client.$queryRaw<Array<{ stock: number }>>`
          UPDATE "Product"
          SET "stock" = "stock" + ${delta}
          WHERE "id" = ${safeItemId}
            AND "userId" = ${safeUserId}
            AND "archived" = false
            AND ("stock" + ${delta}) >= 0
          RETURNING "stock"
        `;
        if (rows.length === 0) {
          // Either the product doesn't exist for this user, is archived,
          // or the delta would underflow stock. Distinguish so callers
          // (and tests) get the right error.
          const exists = await client.product.findUnique({
            where: { id: safeItemId },
            select: { userId: true, stock: true, archived: true },
          });
          if (!exists || exists.userId !== safeUserId) {
            throw Err.notFound('Product not found');
          }
          if (exists.archived) {
            throw Err.validation('Cannot move stock on an archived product.');
          }
          throw Err.validation(
            `Stock would go negative for product ${safeItemId} (current ${exists.stock}, delta ${delta}).`,
          );
        }
        balanceAfter = rows[0].stock;
      } else {
        const rows = await client.$queryRaw<Array<{ stock: number }>>`
          UPDATE "RawMaterial"
          SET "stock" = "stock" + ${delta}
          WHERE "id" = ${safeItemId}
            AND "userId" = ${safeUserId}
            AND "deletedAt" IS NULL
            AND ("stock" + ${delta}) >= 0
          RETURNING "stock"
        `;
        if (rows.length === 0) {
          const exists = await client.rawMaterial.findUnique({
            where: { id: safeItemId },
            select: { userId: true, stock: true, deletedAt: true },
          });
          if (!exists || exists.userId !== safeUserId || exists.deletedAt) {
            throw Err.notFound('Material not found');
          }
          throw Err.validation(
            `Stock would go negative for material ${safeItemId} (current ${exists.stock}, delta ${delta}).`,
          );
        }
        balanceAfter = rows[0].stock;
      }

      const movement = await client.stockMovement.create({
        data: {
          userId: input.userId,
          itemType: input.itemType,
          itemId: input.itemId,
          reason: input.reason,
          delta: input.delta,
          balanceAfter,
          refType: input.refType ?? null,
          refId: input.refId ?? null,
          notes: input.notes ?? null,
        },
      });

      return movement;
    };

    if (tx) return exec(tx);
    return prisma.$transaction((t) => exec(t));
  },

  /**
   * Materials at or below their reorder level (not soft-deleted).
   * Used by the dashboard "Low Materials" card and the low-stock cron.
   */
  async computeLowStockMaterials(userId: string) {
    // Prisma can't compare two columns natively in a `where` clause, so we
    // pull the candidate set with stock <= MAX(reorderLevel) bound and filter
    // in app code. Total material count per tenant is small (dozens at most)
    // so this is fine; if it ever isn't, this becomes a raw query.
    const candidates = await prisma.rawMaterial.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
      include: { supplier: true },
    });
    return candidates.filter((m) => m.stock <= m.reorderLevel);
  },

  /**
   * Recent movements for one item — used by the material detail page and
   * the inventory ledger view. `take` caps the page size.
   */
  async movementsForItem(
    userId: string,
    itemType: StockItemType,
    itemId: string,
    opts?: { take?: number; skip?: number },
  ) {
    const take = Math.min(opts?.take ?? 50, 200);
    const skip = Math.max(opts?.skip ?? 0, 0);
    const where = { userId, itemType, itemId };
    const [rows, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.stockMovement.count({ where }),
    ]);
    return { rows, total };
  },

  /**
   * Filtered ledger across all items (used by /inventory/movements page).
   */
  async listMovements(
    userId: string,
    opts?: {
      itemType?: StockItemType;
      reason?: StockMovementReason;
      take?: number;
      skip?: number;
    },
  ) {
    const take = Math.min(opts?.take ?? 100, 500);
    const skip = Math.max(opts?.skip ?? 0, 0);
    const where: Prisma.StockMovementWhereInput = {
      userId,
      ...(opts?.itemType ? { itemType: opts.itemType } : {}),
      ...(opts?.reason ? { reason: opts.reason } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.stockMovement.count({ where }),
    ]);
    return { rows, total };
  },

  /**
   * Products at or below their lowStockAt threshold (not archived, tracking on).
   * Used by the dashboard "Low Stock Products" view and reports.
   */
  async computeLowStockProducts(userId: string) {
    const candidates = await prisma.product.findMany({
      where: { userId, archived: false, trackStock: true },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
    });
    return candidates.filter((p) => p.stock <= p.lowStockAt);
  },

  /**
   * Per-batch material cost for a recipe in kobo. Returns the cost to
   * produce one yieldQty batch (i.e. recipe.yieldQty units of product).
   */
  async computeRecipeBatchCostKobo(userId: string, productId: string): Promise<number> {
    const recipe = await prisma.recipe.findUnique({
      where: { productId },
      include: { items: { include: { material: true } } },
    });
    if (!recipe || recipe.userId !== userId || recipe.deletedAt) return 0;
    return recipe.items.reduce(
      (sum, item) => sum + item.quantity * (item.material.unitCostKobo ?? 0),
      0,
    );
  },

  /**
   * Per-unit material cost for one finished product in kobo.
   * recipe.yieldQty is normalised to at least 1.
   */
  async computeRecipeUnitCostKobo(userId: string, productId: string): Promise<number> {
    const recipe = await prisma.recipe.findUnique({
      where: { productId },
      include: { items: { include: { material: true } } },
    });
    if (!recipe || recipe.userId !== userId || recipe.deletedAt) return 0;
    const batchCost = recipe.items.reduce(
      (sum, item) => sum + item.quantity * (item.material.unitCostKobo ?? 0),
      0,
    );
    const yieldQty = Math.max(1, recipe.yieldQty);
    return Math.round(batchCost / yieldQty);
  },

  /**
   * Total material cost for a production order's planned output in kobo.
   * Sums (recipeUnitCost × productionOrderItem.quantity) across all items.
   */
  async computeProductionOrderCostKobo(
    userId: string,
    productionOrderId: string,
  ): Promise<number> {
    const order = await prisma.productionOrder.findUnique({
      where: { id: productionOrderId },
      include: { items: true },
    });
    if (!order || order.userId !== userId) return 0;
    let total = 0;
    for (const item of order.items) {
      const unitCost = await this.computeRecipeUnitCostKobo(userId, item.productId);
      total += unitCost * item.quantity;
    }
    return total;
  },

  /**
   * Raw materials whose expiresAt falls within `daysAhead` from now.
   * Excludes soft-deleted materials and materials without an expiresAt.
   */
  async computeExpiringMaterials(userId: string, daysAhead = 14) {
    const horizon = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    return prisma.rawMaterial.findMany({
      where: {
        userId,
        deletedAt: null,
        expiresAt: { not: null, lte: horizon },
      },
      include: { supplier: { select: { id: true, name: true, phone: true } } },
      orderBy: { expiresAt: 'asc' },
    });
  },

  /**
   * Compute material shortages across all *active* production orders.
   * For each (production-order, recipe-item) pair we need
   *   required = recipeItem.quantity × poItem.quantity / recipe.yieldQty
   * Then we aggregate per material and compare against current stock.
   *
   * Returns one row per material that is short, with the contributing
   * production orders so the UI can show "needed for PRD-001, PRD-003".
   */
  async computeShortages(userId: string) {
    type ShortageRow = {
      materialId: string;
      materialName: string;
      unit: string;
      required: number;
      onHand: number;
      shortBy: number;
      productionOrderIds: string[];
      productionNumbers: string[];
    };

    const activeOrders = await prisma.productionOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'IN_PRODUCTION'] },
      },
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

    const byMaterial = new Map<string, ShortageRow>();
    for (const order of activeOrders) {
      for (const item of order.items) {
        const recipe = item.product.recipe;
        if (!recipe || recipe.deletedAt) continue;
        const yieldQty = Math.max(1, recipe.yieldQty);
        for (const ri of recipe.items) {
          // Round up so we never under-purchase.
          const required = Math.ceil((ri.quantity * item.quantity) / yieldQty);
          const existing = byMaterial.get(ri.materialId) ?? {
            materialId: ri.materialId,
            materialName: ri.material.name,
            unit: ri.material.unit,
            required: 0,
            onHand: ri.material.stock,
            shortBy: 0,
            productionOrderIds: [],
            productionNumbers: [],
          };
          existing.required += required;
          if (!existing.productionOrderIds.includes(order.id)) {
            existing.productionOrderIds.push(order.id);
            existing.productionNumbers.push(order.productionNumber);
          }
          byMaterial.set(ri.materialId, existing);
        }
      }
    }

    const shortages: ShortageRow[] = [];
    for (const row of byMaterial.values()) {
      row.shortBy = Math.max(0, row.required - row.onHand);
      if (row.shortBy > 0) shortages.push(row);
    }
    shortages.sort((a, b) => b.shortBy - a.shortBy);
    return shortages;
  },

  /**
   * Same shape as `computeShortages` but scoped to a single production
   * order — used by the order detail page and the /shortages route.
   */
  async computeShortagesForOrder(userId: string, productionOrderId: string) {
    const order = await prisma.productionOrder.findUnique({
      where: { id: productionOrderId },
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
    if (!order || order.userId !== userId) {
      throw Err.notFound('Production order not found');
    }

    const rows: {
      materialId: string;
      materialName: string;
      unit: string;
      required: number;
      onHand: number;
      shortBy: number;
    }[] = [];

    const byMaterial = new Map<string, { required: number; onHand: number; name: string; unit: string }>();

    for (const item of order.items) {
      const recipe = item.product.recipe;
      if (!recipe || recipe.deletedAt) continue;
      const yieldQty = Math.max(1, recipe.yieldQty);
      for (const ri of recipe.items) {
        const required = Math.ceil((ri.quantity * item.quantity) / yieldQty);
        const existing = byMaterial.get(ri.materialId) ?? {
          required: 0,
          onHand: ri.material.stock,
          name: ri.material.name,
          unit: ri.material.unit,
        };
        existing.required += required;
        byMaterial.set(ri.materialId, existing);
      }
    }

    for (const [materialId, row] of byMaterial.entries()) {
      const shortBy = Math.max(0, row.required - row.onHand);
      rows.push({
        materialId,
        materialName: row.name,
        unit: row.unit,
        required: row.required,
        onHand: row.onHand,
        shortBy,
      });
    }
    return rows.sort((a, b) => b.shortBy - a.shortBy);
  },
};
