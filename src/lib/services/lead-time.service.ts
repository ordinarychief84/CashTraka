import { prisma } from '@/lib/prisma';
import { shortageService } from '@/lib/services/shortage.service';

/**
 * Lead-time-aware shortage timeline.
 *
 * Composes against the existing `MaterialShortageAlert` rows + each
 * material's `expectedLeadTimeDays` to answer the actually-useful
 * operational question:
 *
 *   "When is the last day I can place the order before production
 *    actually blocks?"
 *
 *   orderByDate = neededByDate − expectedLeadTimeDays
 *   daysToOrderBy = ceil((orderByDate − now) / 1 day)
 *
 * Urgency tones (cron + UI use the same map):
 *
 *   daysToOrderBy <= 0    → critical (already overdue)
 *   daysToOrderBy <= 1    → urgent
 *   daysToOrderBy <= 3    → soon
 *   daysToOrderBy <= 7    → upcoming
 *   daysToOrderBy >  7    → calm
 *
 * Materials without a known lead time (`expectedLeadTimeDays = null`)
 * default to 3 days — Nigerian SME baseline for "I'll get it
 * mid-week from my regular supplier."
 */

const DAY_MS = 86_400_000;
const DEFAULT_LEAD_TIME_DAYS = 3;

export type LeadTimeUrgency = 'critical' | 'urgent' | 'soon' | 'upcoming' | 'calm';

export type LeadTimeAlert = {
  alertId: string;
  materialId: string;
  materialName: string;
  unit: string;
  shortageQuantity: number;
  availableQuantity: number;
  requiredQuantity: number;
  neededByDate: Date | null;
  leadTimeDays: number;
  /** Last calendar date the owner can place the order to land in time. */
  orderByDate: Date | null;
  /** Days from now to `orderByDate`. Negative = already overdue. */
  daysToOrderBy: number | null;
  urgency: LeadTimeUrgency;
  productionOrderId: string;
  productionNumber: string;
  /** Resolved supplier — used by the UI's "Order from X" CTA. null when material has no preferred supplier. */
  supplierId: string | null;
  supplierName: string | null;
};

function urgencyFor(days: number | null): LeadTimeUrgency {
  if (days === null) return 'upcoming';
  if (days <= 0) return 'critical';
  if (days <= 1) return 'urgent';
  if (days <= 3) return 'soon';
  if (days <= 7) return 'upcoming';
  return 'calm';
}

export const leadTimeService = {
  async forUser(
    userId: string,
    opts?: { limit?: number; materialId?: string },
  ): Promise<LeadTimeAlert[]> {
    const alerts = await shortageService.listOpenForUser(userId, { limit: opts?.limit ?? 200 });
    const filtered = opts?.materialId
      ? alerts.filter((a) => a.materialId === opts.materialId)
      : alerts;
    if (filtered.length === 0) return [];

    // Hydrate lead time + supplier info from the materials.
    const materialIds = Array.from(new Set(filtered.map((a) => a.materialId)));
    const materials = await prisma.rawMaterial.findMany({
      where: { id: { in: materialIds }, userId },
      select: {
        id: true,
        expectedLeadTimeDays: true,
        supplierId: true,
        supplier: { select: { id: true, name: true } },
      },
    });
    const matById = new Map(materials.map((m) => [m.id, m]));

    const now = Date.now();

    const rows: LeadTimeAlert[] = filtered.map((a) => {
      const mat = matById.get(a.materialId);
      const leadTimeDays = mat?.expectedLeadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;

      let orderByDate: Date | null = null;
      let daysToOrderBy: number | null = null;
      if (a.neededByDate) {
        orderByDate = new Date(a.neededByDate.getTime() - leadTimeDays * DAY_MS);
        daysToOrderBy = Math.ceil((orderByDate.getTime() - now) / DAY_MS);
      }

      return {
        alertId: a.id,
        materialId: a.materialId,
        materialName: a.material.name,
        unit: a.material.unit,
        shortageQuantity: a.shortageQuantity,
        availableQuantity: a.availableQuantity,
        requiredQuantity: a.requiredQuantity,
        neededByDate: a.neededByDate,
        leadTimeDays,
        orderByDate,
        daysToOrderBy,
        urgency: urgencyFor(daysToOrderBy),
        productionOrderId: a.productionOrderId,
        productionNumber: a.productionOrder.productionNumber,
        supplierId: mat?.supplierId ?? null,
        supplierName: mat?.supplier?.name ?? null,
      };
    });

    // Sort: critical first, then by daysToOrderBy ascending, nulls last.
    return rows.sort((a, b) => {
      const ord: Record<LeadTimeUrgency, number> = {
        critical: 0, urgent: 1, soon: 2, upcoming: 3, calm: 4,
      };
      if (ord[a.urgency] !== ord[b.urgency]) return ord[a.urgency] - ord[b.urgency];
      const ad = a.daysToOrderBy ?? Number.MAX_SAFE_INTEGER;
      const bd = b.daysToOrderBy ?? Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });
  },

  /** Urgency label for UI rendering — kept in one place. */
  urgencyLabel(u: LeadTimeUrgency): string {
    switch (u) {
      case 'critical': return 'Order today or block';
      case 'urgent': return 'Order today';
      case 'soon': return 'Order this week';
      case 'upcoming': return 'Order soon';
      case 'calm': return 'On schedule';
    }
  },
};
