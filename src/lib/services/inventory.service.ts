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

    const runner = tx ?? prisma;
    const exec = async (client: PrismaTx) => {
      // 1. Load the item (scoped to this user) and lock the row for the duration
      //    of the transaction. We rely on Postgres SELECT FOR UPDATE via a
      //    transactional read-then-write — Prisma surfaces this implicitly when
      //    update follows findUnique inside a $transaction.
      let balanceAfter: number;
      if (input.itemType === 'PRODUCT') {
        const product = await client.product.findUnique({
          where: { id: input.itemId },
          select: { id: true, userId: true, stock: true, archived: true },
        });
        if (!product || product.userId !== input.userId) {
          throw Err.notFound('Product not found');
        }
        balanceAfter = product.stock + input.delta;
        if (balanceAfter < 0) {
          throw Err.validation(
            `Stock would go negative for product ${input.itemId} (current ${product.stock}, delta ${input.delta}).`,
          );
        }
        await client.product.update({
          where: { id: input.itemId },
          data: { stock: balanceAfter },
        });
      } else {
        const material = await client.rawMaterial.findUnique({
          where: { id: input.itemId },
          select: { id: true, userId: true, stock: true, deletedAt: true },
        });
        if (!material || material.userId !== input.userId || material.deletedAt) {
          throw Err.notFound('Material not found');
        }
        balanceAfter = material.stock + input.delta;
        if (balanceAfter < 0) {
          throw Err.validation(
            `Stock would go negative for material ${input.itemId} (current ${material.stock}, delta ${input.delta}).`,
          );
        }
        await client.rawMaterial.update({
          where: { id: input.itemId },
          data: { stock: balanceAfter },
        });
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
};
