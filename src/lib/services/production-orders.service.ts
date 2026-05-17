import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { documentAudit } from '@/lib/services/document-audit.service';
import { inventoryService } from '@/lib/services/inventory.service';
import { shortageService } from '@/lib/services/shortage.service';
import { nextProductionNumber } from '@/lib/op-numbers';

export type ProductionOrderCreateItem = {
  productId: string;
  quantity: number;
};

export type ProductionOrderCreateInput = {
  plannedStartAt?: Date | null;
  plannedEndAt?: Date | null;
  notes?: string | null;
  items: ProductionOrderCreateItem[];
};

type ProductionStatus =
  | 'PLANNED'
  | 'MATERIALS_NEEDED'
  | 'READY_TO_PRODUCE'
  | 'IN_PRODUCTION'
  | 'COMPLETED'
  | 'DELAYED'
  | 'CANCELLED';

/**
 * Valid transitions. Any state can move to CANCELLED. Forward progression
 * is enforced so we don't accidentally re-start a completed run.
 */
const ALLOWED_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  PLANNED: ['MATERIALS_NEEDED', 'READY_TO_PRODUCE', 'IN_PRODUCTION', 'DELAYED', 'CANCELLED'],
  MATERIALS_NEEDED: ['PLANNED', 'READY_TO_PRODUCE', 'IN_PRODUCTION', 'DELAYED', 'CANCELLED'],
  READY_TO_PRODUCE: ['MATERIALS_NEEDED', 'IN_PRODUCTION', 'DELAYED', 'CANCELLED'],
  IN_PRODUCTION: ['COMPLETED', 'DELAYED', 'CANCELLED'],
  DELAYED: ['PLANNED', 'MATERIALS_NEEDED', 'READY_TO_PRODUCE', 'IN_PRODUCTION', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const productionOrdersService = {
  async listForUser(
    userId: string,
    opts?: { status?: ProductionStatus | ProductionStatus[]; take?: number; skip?: number },
  ) {
    const take = Math.min(opts?.take ?? 50, 200);
    const skip = Math.max(opts?.skip ?? 0, 0);
    const statusFilter = Array.isArray(opts?.status)
      ? { in: opts!.status }
      : opts?.status
        ? { equals: opts.status }
        : undefined;
    const where = {
      userId,
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.productionOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          customerOrder: { select: { id: true, orderNumber: true, customerName: true } },
        },
        take,
        skip,
      }),
      prisma.productionOrder.count({ where }),
    ]);
    return { rows, total };
  },

  async getForUser(userId: string, productionOrderId: string) {
    const order = await prisma.productionOrder.findUnique({
      where: { id: productionOrderId },
      include: {
        items: { include: { product: true } },
        customerOrder: true,
      },
    });
    if (!order || order.userId !== userId) {
      throw Err.notFound('Production order not found');
    }
    return order;
  },

  /** Create from scratch — validates products are owned and quantities positive. */
  async create(
    userId: string,
    input: ProductionOrderCreateInput,
    actorId?: string | null,
  ) {
    if (input.items.length === 0) {
      throw Err.validation('At least one product is required.');
    }
    const productIds = Array.from(new Set(input.items.map((i) => i.productId)));
    if (productIds.length !== input.items.length) {
      throw Err.validation('Each product can appear only once per production order.');
    }
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, userId, archived: false },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      throw Err.validation('One or more products are unavailable.');
    }

    const productionNumber = await nextProductionNumber(userId);

    const order = await prisma.productionOrder.create({
      data: {
        userId,
        productionNumber,
        status: 'PLANNED',
        plannedStartAt: input.plannedStartAt ?? null,
        plannedEndAt: input.plannedEndAt ?? null,
        notes: input.notes?.trim() || null,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            quantity: Math.max(1, Math.floor(i.quantity)),
          })),
        },
      },
      include: { items: true },
    });

    // Immediately compute shortages and flip to MATERIALS_NEEDED if any.
    const shortages = await inventoryService.computeShortagesForOrder(userId, order.id);
    const hasShortage = shortages.some((s) => s.shortBy > 0);
    const finalStatus: ProductionStatus = hasShortage ? 'MATERIALS_NEEDED' : 'PLANNED';
    const saved =
      finalStatus !== 'PLANNED'
        ? await prisma.productionOrder.update({
            where: { id: order.id },
            data: { status: finalStatus },
            include: { items: true },
          })
        : order;

    // Persist shortage alerts (fire-and-forget so create() stays fast).
    void shortageService
      .syncForProductionOrder(userId, saved.id)
      .catch((e) => console.warn('[production-orders] shortage sync failed', e));

    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'PRODUCTION_ORDER',
      entityId: saved.id,
      action: 'CREATED',
      metadata: {
        productionNumber: saved.productionNumber,
        status: saved.status,
        items: input.items.length,
        shortagesAtCreate: shortages.filter((s) => s.shortBy > 0).length,
      },
    });

    return { order: saved, shortages };
  },

  /**
   * Helper called by customer-orders.service when a CustomerOrder is
   * confirmed (or via the /api/customer-orders/[id]/produce route).
   * Aggregates CustomerOrderItems with productId into ProductionOrderItems.
   */
  async createFromCustomerOrder(
    userId: string,
    customerOrderId: string,
    actorId?: string | null,
  ) {
    const customerOrder = await prisma.customerOrder.findUnique({
      where: { id: customerOrderId },
      include: { items: true },
    });
    if (!customerOrder || customerOrder.userId !== userId) {
      throw Err.notFound('Customer order not found');
    }
    if (customerOrder.productionOrderId) {
      // Idempotency: return existing.
      const existing = await this.getForUser(userId, customerOrder.productionOrderId);
      return { order: existing, shortages: await inventoryService.computeShortagesForOrder(userId, existing.id) };
    }

    // Aggregate items by productId. Skip items without a productId (free-form).
    const byProduct = new Map<string, number>();
    for (const item of customerOrder.items) {
      if (!item.productId) continue;
      byProduct.set(item.productId, (byProduct.get(item.productId) ?? 0) + item.quantity);
    }
    if (byProduct.size === 0) {
      throw Err.validation('No products linked on the customer order.');
    }
    const items: ProductionOrderCreateItem[] = Array.from(byProduct.entries()).map(
      ([productId, quantity]) => ({ productId, quantity }),
    );

    const { order, shortages } = await this.create(
      userId,
      {
        plannedEndAt: customerOrder.dueAt ?? null,
        notes: `Auto-created from customer order ${customerOrder.orderNumber}`,
        items,
      },
      actorId,
    );

    await prisma.customerOrder.update({
      where: { id: customerOrder.id },
      data: { productionOrderId: order.id },
    });

    return { order, shortages };
  },

  /**
   * Start production. Writes PRODUCTION_CONSUME StockMovements for every
   * material the recipe needs (rounded up). Atomic — if any material would
   * go negative the whole transaction rolls back.
   */
  async start(userId: string, productionOrderId: string, actorId?: string | null) {
    const order = await prisma.productionOrder.findUnique({
      where: { id: productionOrderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                recipe: { include: { items: { include: { material: true } } } },
              },
            },
          },
        },
      },
    });
    if (!order || order.userId !== userId) {
      throw Err.notFound('Production order not found');
    }
    if (!ALLOWED_TRANSITIONS[order.status as ProductionStatus]?.includes('IN_PRODUCTION')) {
      throw Err.conflict(`Cannot start a production order in status ${order.status}.`);
    }

    // Aggregate materials required.
    const required = new Map<string, number>();
    for (const item of order.items) {
      const recipe = item.product.recipe;
      if (!recipe || recipe.deletedAt) {
        throw Err.validation(
          `Product "${item.product.name}" has no active recipe. Add a recipe before starting production.`,
        );
      }
      const yieldQty = Math.max(1, recipe.yieldQty);
      for (const ri of recipe.items) {
        const qty = Math.ceil((ri.quantity * item.quantity) / yieldQty);
        required.set(ri.materialId, (required.get(ri.materialId) ?? 0) + qty);
      }
    }

    // Stamp the batch. We auto-generate a batchNumber if the user
    // didn't already set one (most won't on the first run). Shape:
    // "BTH-YYYY-MM-DD-<lastSixOfProductionNumber>" so it's sortable
    // and links back to the order number visually. Users can edit it
    // post-start from the order detail page.
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const tail = order.productionNumber.slice(-6).toUpperCase();
    const autoBatch = order.batchNumber ?? `BTH-${dateStr}-${tail}`;

    // Pick the shortest shelfLifeDays across all items in the run so
    // the stamped expiresAt is the most conservative date — never claim
    // a product is good for longer than its weakest input allows.
    const shelfLives = order.items
      .map((it) => it.product.shelfLifeDays)
      .filter((d): d is number => typeof d === 'number' && d > 0);
    const minShelfLifeDays = shelfLives.length > 0 ? Math.min(...shelfLives) : null;
    const autoExpiresAt =
      order.expiresAt ??
      (minShelfLifeDays
        ? new Date(now.getTime() + minShelfLifeDays * 24 * 60 * 60 * 1000)
        : null);

    const result = await prisma.$transaction(async (tx) => {
      for (const [materialId, qty] of required.entries()) {
        await inventoryService.recordMovement(
          {
            userId,
            itemType: 'MATERIAL',
            itemId: materialId,
            reason: 'PRODUCTION_CONSUME',
            delta: -qty,
            refType: 'PRODUCTION_ORDER',
            refId: order.id,
          },
          tx,
        );
      }
      return tx.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'IN_PRODUCTION',
          startedAt: now,
          batchNumber: autoBatch,
          manufacturedAt: order.manufacturedAt ?? now,
          expiresAt: autoExpiresAt,
        },
        include: { items: true },
      });
    });

    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'PRODUCTION_ORDER',
      entityId: order.id,
      action: 'STARTED',
      metadata: { materialsConsumed: required.size },
    });

    // Materials just got consumed — resync shortage alerts so they close.
    void shortageService
      .syncForProductionOrder(userId, order.id)
      .catch((e) => console.warn('[production-orders] shortage sync failed', e));

    return result;
  },

  /**
   * Mark a production run READY_TO_PRODUCE — operator's signal that
   * materials check passed and all kit is gathered. Optional gate that
   * sits between MATERIALS_NEEDED and IN_PRODUCTION.
   */
  async markReady(
    userId: string,
    productionOrderId: string,
    actorId?: string | null,
  ) {
    const order = await prisma.productionOrder.findFirst({
      where: { id: productionOrderId, userId, deletedAt: null },
    });
    if (!order) throw Err.notFound('Production order not found');
    if (!ALLOWED_TRANSITIONS[order.status as ProductionStatus]?.includes('READY_TO_PRODUCE')) {
      throw Err.conflict(
        `Cannot mark a production order ready from status ${order.status}.`,
      );
    }
    const updated = await prisma.productionOrder.update({
      where: { id: productionOrderId },
      data: { status: 'READY_TO_PRODUCE' },
    });
    await documentAudit
      .log({
        userId,
        actorId: actorId ?? null,
        entityType: 'PRODUCTION_ORDER',
        entityId: productionOrderId,
        action: 'STATUS_CHANGED' as any,
        metadata: { status: 'READY_TO_PRODUCE' },
      })
      .catch(() => {});
    return updated;
  },

  /**
   * Complete production. Writes PRODUCTION_PRODUCE movements for each
   * finished product line, snapshots unit cost into ProductionOrderItem,
   * and transitions any linked CustomerOrder to READY.
   *
   * Optional QC quantities: when `quantityProduced` is supplied, the
   * actual stock movement uses it instead of the planned quantity. Damaged
   * units are subtracted (recorded as WRITE_OFF) and only `quantityAccepted`
   * lands as finished-goods stock.
   */
  async complete(
    userId: string,
    productionOrderId: string,
    actorId?: string | null,
    qc?: {
      quantityProduced?: number | null;
      quantityDamaged?: number | null;
      quantityAccepted?: number | null;
    },
  ) {
    const order = await prisma.productionOrder.findUnique({
      where: { id: productionOrderId },
      include: {
        items: true,
        customerOrder: { select: { id: true, status: true } },
      },
    });
    if (!order || order.userId !== userId) {
      throw Err.notFound('Production order not found');
    }
    if (!ALLOWED_TRANSITIONS[order.status as ProductionStatus]?.includes('COMPLETED')) {
      throw Err.conflict(`Cannot complete a production order in status ${order.status}.`);
    }

    // Derive QC qty. Default to planned qty (sum across items) when no QC
    // numbers were supplied so legacy callers keep working unchanged.
    const plannedTotal = order.items.reduce((s, it) => s + it.quantity, 0);
    const qtyProduced = qc?.quantityProduced ?? plannedTotal;
    const qtyDamaged = qc?.quantityDamaged ?? 0;
    const qtyAccepted =
      qc?.quantityAccepted ?? Math.max(0, qtyProduced - qtyDamaged);
    // Ratio for distributing across items when a multi-item run partially yields.
    const acceptedRatio = plannedTotal > 0 ? qtyAccepted / plannedTotal : 1;

    const result = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const unitCostKobo = await inventoryService.computeRecipeUnitCostKobo(userId, item.productId);
        await tx.productionOrderItem.update({
          where: { id: item.id },
          data: { unitCostKoboSnapshot: unitCostKobo },
        });
        const acceptedForLine = Math.max(
          0,
          Math.round(item.quantity * acceptedRatio),
        );
        if (acceptedForLine > 0) {
          await inventoryService.recordMovement(
            {
              userId,
              itemType: 'PRODUCT',
              itemId: item.productId,
              reason: 'PRODUCTION_PRODUCE',
              delta: acceptedForLine,
              refType: 'PRODUCTION_ORDER',
              refId: order.id,
              notes:
                qtyDamaged > 0
                  ? `Accepted ${acceptedForLine} of planned ${item.quantity}; ${item.quantity - acceptedForLine} not delivered (damaged or short)`
                  : undefined,
            },
            tx,
          );
        }
        // Update Product.costKobo to the latest produced cost (rolling snapshot).
        if (unitCostKobo > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { costKobo: unitCostKobo },
          });
        }
      }

      const updated = await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          quantityProduced: qtyProduced,
          quantityDamaged: qtyDamaged,
          quantityAccepted: qtyAccepted,
        },
        include: { items: true },
      });

      // Transition linked CustomerOrder to READY.
      if (order.customerOrder?.id) {
        const co = await tx.customerOrder.findUnique({
          where: { id: order.customerOrder.id },
          select: { status: true },
        });
        if (co && ['NEW', 'CONFIRMED', 'IN_PRODUCTION'].includes(co.status)) {
          await tx.customerOrder.update({
            where: { id: order.customerOrder.id },
            data: { status: 'READY' },
          });
        }
      }

      return updated;
    });

    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'PRODUCTION_ORDER',
      entityId: order.id,
      action: 'COMPLETED',
    });

    // Batch Cost Intelligence — fire-and-forget. A failure here MUST NEVER
    // roll back or undo the COMPLETED status transition. The two operations
    // are decoupled by design: production completion is a hard business
    // event, cost calculation is a derived computation that can be retried.
    // Logged but never re-thrown.
    void import('./batch-cost.service').then(({ computeAndSaveBatchCost }) =>
      computeAndSaveBatchCost(order.id).catch((err) => {
        console.error(
          '[production.complete] batch cost calculation failed',
          { productionOrderId: order.id, userId },
          err,
        );
      }),
    );

    return result;
  },

  async markDelayed(
    userId: string,
    productionOrderId: string,
    reason: string | null | undefined,
    actorId?: string | null,
  ) {
    const order = await prisma.productionOrder.findUnique({ where: { id: productionOrderId } });
    if (!order || order.userId !== userId) {
      throw Err.notFound('Production order not found');
    }
    if (!ALLOWED_TRANSITIONS[order.status as ProductionStatus]?.includes('DELAYED')) {
      throw Err.conflict(`Cannot delay a production order in status ${order.status}.`);
    }
    const updated = await prisma.productionOrder.update({
      where: { id: order.id },
      data: { status: 'DELAYED' },
    });
    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'PRODUCTION_ORDER',
      entityId: order.id,
      action: 'DELAYED',
      metadata: reason ? { reason } : undefined,
    });
    return updated;
  },

  async cancel(
    userId: string,
    productionOrderId: string,
    reason: string | null | undefined,
    actorId?: string | null,
  ) {
    const order = await prisma.productionOrder.findUnique({ where: { id: productionOrderId } });
    if (!order || order.userId !== userId) {
      throw Err.notFound('Production order not found');
    }
    if (order.status === 'COMPLETED') {
      throw Err.conflict('Completed orders cannot be cancelled.');
    }
    const updated = await prisma.productionOrder.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', deletedAt: new Date() },
    });
    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'PRODUCTION_ORDER',
      entityId: order.id,
      action: 'CANCELLED',
      metadata: reason ? { reason } : undefined,
    });
    return updated;
  },
};
