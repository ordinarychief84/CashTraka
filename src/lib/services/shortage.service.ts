import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { inventoryService } from './inventory.service';

/**
 * Persisted material shortage alerts.
 *
 * The `inventory.service.computeShortages*` helpers compute shortages on
 * demand from current stock + active production orders. That's fine for
 * "what should I buy today?" but it loses history.
 *
 * This service writes/updates rows in `MaterialShortageAlert` so we can:
 *   - flag the dashboard with a real count
 *   - show shortage trend over 30/90 days
 *   - record what action was taken (PO drafted, substitute used, ignored)
 *
 * `syncForProductionOrder` is the entry point — call it on production
 * order create + on any status flip that affects materials. Each call:
 *   1. computes the current shortage for that order
 *   2. upserts an OPEN alert per (productionOrderId, materialId)
 *   3. closes alerts that no longer have a shortage (status → RESOLVED)
 */

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

function deriveSeverity(args: {
  shortageQuantity: number;
  required: number;
  safetyStock?: number | null;
  hoursToNeededBy?: number | null;
}): Severity {
  const { shortageQuantity, required, safetyStock, hoursToNeededBy } = args;
  const ratio = required > 0 ? shortageQuantity / required : 1;
  // Time pressure escalates severity by one band.
  const urgent =
    hoursToNeededBy != null && hoursToNeededBy >= 0 && hoursToNeededBy < 48;
  if (ratio >= 0.75 || (safetyStock != null && shortageQuantity >= safetyStock * 3)) {
    return urgent ? 'CRITICAL' : 'HIGH';
  }
  if (ratio >= 0.4) return urgent ? 'HIGH' : 'MEDIUM';
  if (ratio >= 0.1) return urgent ? 'MEDIUM' : 'LOW';
  return 'LOW';
}

export const shortageService = {
  /**
   * Recompute shortages for one production order and persist OPEN alerts.
   * Idempotent — running it twice in a row is a no-op aside from
   * `updatedAt`.
   */
  async syncForProductionOrder(userId: string, productionOrderId: string) {
    const order = await prisma.productionOrder.findFirst({
      where: { id: productionOrderId, userId, deletedAt: null },
      select: { id: true, plannedEndAt: true },
    });
    if (!order) throw Err.notFound('Production order not found');

    const live = await inventoryService.computeShortagesForOrder(
      userId,
      productionOrderId,
    );

    const hoursToNeededBy = order.plannedEndAt
      ? (order.plannedEndAt.getTime() - Date.now()) / 3600000
      : null;

    // Fetch all material rows so we can read safetyStock for severity.
    const materialIds = live.map((r) => r.materialId);
    const materials = materialIds.length
      ? await prisma.rawMaterial.findMany({
          where: { id: { in: materialIds } },
          select: { id: true, safetyStock: true },
        })
      : [];
    const safetyById = new Map(materials.map((m) => [m.id, m.safetyStock]));

    const now = new Date();
    const seenMaterialIds = new Set<string>();

    for (const row of live) {
      if (row.shortBy <= 0) continue;
      seenMaterialIds.add(row.materialId);
      const severity = deriveSeverity({
        shortageQuantity: row.shortBy,
        required: row.required,
        safetyStock: safetyById.get(row.materialId) ?? null,
        hoursToNeededBy,
      });

      await prisma.materialShortageAlert.upsert({
        where: {
          productionOrderId_materialId: {
            productionOrderId,
            materialId: row.materialId,
          },
        },
        create: {
          userId,
          productionOrderId,
          materialId: row.materialId,
          requiredQuantity: row.required,
          availableQuantity: row.onHand,
          shortageQuantity: row.shortBy,
          severity,
          recommendedAction: 'BUY_MATERIAL',
          neededByDate: order.plannedEndAt ?? null,
          status: 'OPEN',
        },
        update: {
          requiredQuantity: row.required,
          availableQuantity: row.onHand,
          shortageQuantity: row.shortBy,
          severity,
          neededByDate: order.plannedEndAt ?? null,
          // If the alert was previously RESOLVED but the shortage came
          // back, reopen it.
          status: 'OPEN',
          resolvedAt: null,
          resolutionNote: null,
          updatedAt: now,
        },
      });
    }

    // Close any previously-open alerts whose shortage cleared.
    if (seenMaterialIds.size === 0) {
      await prisma.materialShortageAlert.updateMany({
        where: {
          productionOrderId,
          status: 'OPEN',
        },
        data: { status: 'RESOLVED', resolvedAt: now },
      });
    } else {
      await prisma.materialShortageAlert.updateMany({
        where: {
          productionOrderId,
          status: 'OPEN',
          materialId: { notIn: [...seenMaterialIds] },
        },
        data: { status: 'RESOLVED', resolvedAt: now },
      });
    }

    return { written: live.length, closed: seenMaterialIds.size };
  },

  async listOpenForUser(userId: string, opts?: { limit?: number }) {
    const take = Math.min(opts?.limit ?? 200, 500);
    return prisma.materialShortageAlert.findMany({
      where: { userId, status: 'OPEN' },
      include: {
        material: { select: { name: true, unit: true } },
        productionOrder: {
          select: { productionNumber: true, plannedEndAt: true, status: true },
        },
      },
      orderBy: [{ severity: 'desc' }, { neededByDate: 'asc' }, { createdAt: 'asc' }],
      take,
    });
  },

  async countOpenForUser(userId: string) {
    return prisma.materialShortageAlert.count({
      where: { userId, status: 'OPEN' },
    });
  },

  /**
   * Mark an alert as IGNORED — used when the operator decides to live with
   * the shortage (e.g. half-finishing a run rather than waiting on a PO).
   */
  async ignore(userId: string, alertId: string, note?: string | null) {
    const alert = await prisma.materialShortageAlert.findFirst({
      where: { id: alertId, userId },
    });
    if (!alert) throw Err.notFound('Alert not found');
    return prisma.materialShortageAlert.update({
      where: { id: alertId },
      data: {
        status: 'IGNORED',
        resolutionNote: note?.trim() || null,
        resolvedAt: new Date(),
      },
    });
  },

  /**
   * Mark an alert as RESOLVED — used when a PO was sent / substitute swapped
   * / stock was already replenished by a manual adjustment.
   */
  async resolve(
    userId: string,
    alertId: string,
    args: { note?: string | null; action?: string | null },
  ) {
    const alert = await prisma.materialShortageAlert.findFirst({
      where: { id: alertId, userId },
    });
    if (!alert) throw Err.notFound('Alert not found');
    return prisma.materialShortageAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        recommendedAction: args.action ?? alert.recommendedAction,
        resolutionNote: args.note?.trim() || null,
        resolvedAt: new Date(),
      },
    });
  },

  /**
   * 30-day count of created alerts per day. Used by the dashboard
   * "shortage trend" sparkline.
   */
  async trendForUser(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await prisma.materialShortageAlert.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, severity: true },
    });
    const byDay = new Map<string, { count: number; critical: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, { count: 0, critical: 0 });
    }
    for (const r of rows) {
      const key = r.createdAt.toISOString().slice(0, 10);
      const cell = byDay.get(key);
      if (cell) {
        cell.count += 1;
        if (r.severity === 'CRITICAL' || r.severity === 'HIGH') cell.critical += 1;
      }
    }
    return [...byDay.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
};
