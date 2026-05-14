import { prisma } from '@/lib/prisma';
import { inventoryService } from './inventory.service';
import { shortageService } from './shortage.service';

/**
 * Operational reports — owner-scoped, lightweight server-side aggregates
 * that power /reports/operations + the dashboard's Risk + Daily Action
 * panels.
 *
 * Every method here is a single Prisma query or a tight Map reduce — no
 * client side joins, no fan-out. Designed so /reports/operations can
 * render with one Promise.all without us building an analytics warehouse.
 */
export const operationsReportService = {
  /**
   * "Pending orders" — NEW + CONFIRMED customer orders that haven't been
   * fulfilled yet, ordered by due date.
   */
  async pendingOrders(userId: string) {
    return prisma.customerOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['NEW', 'CONFIRMED'] },
      },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
      include: {
        items: { select: { description: true, quantity: true } },
      },
      take: 100,
    });
  },

  /** Production runs currently being worked on. */
  async productionInProgress(userId: string) {
    return prisma.productionOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'IN_PRODUCTION',
      },
      orderBy: { startedAt: 'asc' },
      include: {
        items: { include: { product: { select: { name: true } } } },
        customerOrder: { select: { orderNumber: true, customerName: true } },
      },
      take: 100,
    });
  },

  /** Production runs that missed their plannedEndAt or were flagged. */
  async delayedProduction(userId: string) {
    const today = new Date();
    return prisma.productionOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { status: 'DELAYED' },
          {
            status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'IN_PRODUCTION'] },
            plannedEndAt: { lt: today },
          },
        ],
      },
      orderBy: { plannedEndAt: 'asc' },
      include: {
        items: { include: { product: { select: { name: true } } } },
        customerOrder: { select: { orderNumber: true, customerName: true } },
      },
      take: 100,
    });
  },

  /** Materials at or below reorderLevel. */
  async lowStockMaterials(userId: string) {
    return inventoryService.computeLowStockMaterials(userId);
  },

  /** Finished products at or below lowStockAt. */
  async lowStockProducts(userId: string) {
    return inventoryService.computeLowStockProducts(userId);
  },

  /** Materials with an expiry inside the next 30 days. */
  async expiringMaterials(userId: string) {
    return inventoryService.computeExpiringMaterials(userId, 30);
  },

  /** Stock movements grouped by reason for the last 30 days. */
  async stockMovementSummary(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await prisma.stockMovement.groupBy({
      by: ['reason', 'itemType'],
      where: { userId, createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { delta: true },
    });
    return rows.map((r) => ({
      reason: r.reason,
      itemType: r.itemType,
      count: r._count._all,
      totalDelta: r._sum.delta ?? 0,
    }));
  },

  /** Sales-by-product for the last `days` days (count + qty + revenue). */
  async salesByProduct(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await prisma.customerOrderItem.findMany({
      where: {
        customerOrder: {
          userId,
          deletedAt: null,
          status: { in: ['READY', 'DELIVERED'] },
          createdAt: { gte: since },
        },
      },
      select: {
        productId: true,
        description: true,
        quantity: true,
        totalKobo: true,
        product: { select: { name: true } },
      },
    });
    const byProduct = new Map<
      string,
      { name: string; orders: number; quantity: number; revenueKobo: number }
    >();
    for (const r of rows) {
      const key = r.productId ?? `_free:${r.description.toLowerCase()}`;
      const name = r.product?.name ?? r.description;
      const existing = byProduct.get(key) ?? {
        name,
        orders: 0,
        quantity: 0,
        revenueKobo: 0,
      };
      existing.orders += 1;
      existing.quantity += r.quantity;
      existing.revenueKobo += r.totalKobo;
      byProduct.set(key, existing);
    }
    return [...byProduct.values()].sort(
      (a, b) => b.revenueKobo - a.revenueKobo,
    );
  },

  /** Aggregate materials needed across active production. */
  async materialsNeeded(userId: string) {
    return inventoryService.computeShortages(userId);
  },

  /**
   * Open shortage alerts grouped for the "purchase recommendations" report.
   * Folds duplicate materials across production orders.
   */
  async purchaseRecommendations(userId: string) {
    const alerts = await shortageService.listOpenForUser(userId, { limit: 500 });
    const byMaterial = new Map<
      string,
      {
        materialId: string;
        materialName: string;
        unit: string;
        totalShortage: number;
        productionRefs: { id: string; number: string }[];
        severity: string;
      }
    >();
    for (const a of alerts) {
      const existing = byMaterial.get(a.materialId) ?? {
        materialId: a.materialId,
        materialName: a.material.name,
        unit: a.material.unit,
        totalShortage: 0,
        productionRefs: [],
        severity: a.severity,
      };
      existing.totalShortage += a.shortageQuantity;
      existing.productionRefs.push({
        id: a.productionOrderId,
        number: a.productionOrder.productionNumber,
      });
      // Promote severity to the highest seen.
      const sev = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      if (sev.indexOf(a.severity) > sev.indexOf(existing.severity)) {
        existing.severity = a.severity;
      }
      byMaterial.set(a.materialId, existing);
    }
    return [...byMaterial.values()].sort(
      (a, b) => b.totalShortage - a.totalShortage,
    );
  },

  /**
   * Estimated vs actual production cost by completed run. Pulls unit-cost
   * snapshot taken at COMPLETE vs the planned material cost at the time.
   */
  async estimatedVsActual(userId: string, days = 90) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const runs = await prisma.productionOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'COMPLETED',
        completedAt: { gte: since },
      },
      orderBy: { completedAt: 'desc' },
      take: 100,
      include: {
        items: {
          include: {
            product: {
              select: { name: true, costKobo: true, priceKobo: true },
            },
          },
        },
      },
    });
    return runs.map((r) => {
      const totalProduced = r.quantityAccepted ?? 0;
      const totalDamaged = r.quantityDamaged ?? 0;
      const actualCostKobo = r.items.reduce(
        (s, it) => s + (it.unitCostKoboSnapshot ?? 0) * it.quantity,
        0,
      );
      const revenueKobo = r.items.reduce(
        (s, it) => s + (it.product.priceKobo ?? 0) * it.quantity,
        0,
      );
      return {
        id: r.id,
        productionNumber: r.productionNumber,
        productNames: r.items.map((it) => it.product.name).join(', '),
        completedAt: r.completedAt,
        plannedQuantity: r.items.reduce((s, it) => s + it.quantity, 0),
        producedQuantity: r.quantityProduced ?? 0,
        damagedQuantity: totalDamaged,
        acceptedQuantity: totalProduced,
        actualCostKobo,
        revenueKobo,
        marginKobo: revenueKobo - actualCostKobo,
      };
    });
  },

  /** Total damaged units across completed runs in the last 90 days. */
  async damagedSummary(userId: string, days = 90) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const runs = await prisma.productionOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        completedAt: { gte: since },
      },
      select: {
        quantityProduced: true,
        quantityDamaged: true,
        quantityAccepted: true,
        completedAt: true,
      },
    });
    const totalProduced = runs.reduce((s, r) => s + (r.quantityProduced ?? 0), 0);
    const totalDamaged = runs.reduce((s, r) => s + (r.quantityDamaged ?? 0), 0);
    const totalAccepted = runs.reduce(
      (s, r) => s + (r.quantityAccepted ?? 0),
      0,
    );
    const yieldPct =
      totalProduced > 0
        ? Math.round((totalAccepted / totalProduced) * 100)
        : null;
    return { runs: runs.length, totalProduced, totalDamaged, totalAccepted, yieldPct };
  },

  /** Outstanding invoices (DRAFT, SENT, VIEWED, PARTIALLY_PAID, OVERDUE). */
  async outstandingInvoices(userId: string) {
    return prisma.invoice.findMany({
      where: {
        userId,
        status: { in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      take: 100,
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        total: true,
        amountPaid: true,
        status: true,
        dueDate: true,
        createdAt: true,
      },
    });
  },

  /** Receipts generated in the last `days` days. */
  async recentReceipts(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return prisma.receipt.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        receiptNumber: true,
        source: true,
        createdAt: true,
        status: true,
      },
    });
  },
};
