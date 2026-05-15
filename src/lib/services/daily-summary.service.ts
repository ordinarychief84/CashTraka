import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';

/**
 * End-of-day operational summary. Aggregates everything an owner-operator
 * wants to know at 7pm:
 *
 *   • orders received today
 *   • production runs completed today
 *   • cash received today
 *   • debts still outstanding
 *   • materials at/below reorder level
 *
 * Returned shape is small and serialisable so it can drop straight into
 * the daily-summary email template + a WhatsApp share link.
 *
 * Numbers are kobo Int (formatted by the email layer). Counts are plain
 * integers. Nothing here writes — purely read-only.
 */
export type DailySummary = {
  date: Date;
  ordersReceived: number;
  productionCompleted: number;
  productionInProgress: number;
  cashReceivedKobo: number;
  outstandingKobo: number;
  lowMaterials: { name: string; stock: number; reorderLevel: number; unit: string }[];
  lowMaterialsCount: number;
  topDebtors: { name: string; amountKobo: number }[];
};

export const dailySummaryService = {
  /**
   * Build the day's summary for `userId`. The "day" is anchored on the
   * caller's clock — pass `today` explicitly when running from a cron so
   * timezone is the cron's, not the request's.
   */
  async build(userId: string, today: Date = new Date()): Promise<DailySummary> {
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const [
      ordersReceived,
      productionCompleted,
      productionInProgress,
      paymentsToday,
      outstandingInvoices,
      lowMaterialsRaw,
      topDebtors,
    ] = await Promise.all([
      prisma.customerOrder.count({
        where: {
          userId,
          deletedAt: null,
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.productionOrder.count({
        where: {
          userId,
          deletedAt: null,
          status: 'COMPLETED',
          completedAt: { gte: startOfDay },
        },
      }),
      prisma.productionOrder.count({
        where: {
          userId,
          deletedAt: null,
          status: { in: ['IN_PRODUCTION', 'READY_TO_PRODUCE'] },
        },
      }),
      prisma.payment.aggregate({
        where: {
          userId,
          status: 'PAID',
          createdAt: { gte: startOfDay },
        },
        _sum: { amountKobo: true },
      }),
      prisma.invoice.findMany({
        where: {
          userId,
          status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        select: { totalKobo: true, amountPaidKobo: true },
      }),
      inventoryService.computeLowStockMaterials(userId),
      // Top 3 debtors today. Customer table snapshots totalOwedKobo so we
      // don't have to roll up debts on the fly.
      prisma.customer.findMany({
        where: { userId, totalOwedKobo: { gt: 0 } },
        orderBy: { totalOwedKobo: 'desc' },
        take: 3,
        select: { name: true, totalOwedKobo: true },
      }),
    ]);

    const cashReceivedKobo = paymentsToday._sum.amountKobo ?? 0;
    const outstandingKobo = outstandingInvoices.reduce(
      (s, i) => s + Math.max(0, i.totalKobo - i.amountPaidKobo),
      0,
    );

    return {
      date: startOfDay,
      ordersReceived,
      productionCompleted,
      productionInProgress,
      cashReceivedKobo,
      outstandingKobo,
      lowMaterials: lowMaterialsRaw.slice(0, 5).map((m) => ({
        name: m.name,
        stock: m.stock,
        reorderLevel: m.reorderLevel,
        unit: m.unit,
      })),
      lowMaterialsCount: lowMaterialsRaw.length,
      topDebtors: topDebtors.map((d) => ({
        name: d.name,
        amountKobo: d.totalOwedKobo,
      })),
    };
  },

  /**
   * Renders the summary into a single line for WhatsApp / SMS-style
   * recap. Keep this short — owners will glance, not read.
   */
  toWhatsAppText(name: string, businessName: string | null | undefined, s: DailySummary): string {
    const naira = (k: number) => '₦' + Math.round(k / 100).toLocaleString('en-NG');
    const dateLabel = s.date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
    });

    const lines: string[] = [];
    lines.push(`*CashTraka daily recap — ${dateLabel}*`);
    if (businessName) lines.push(`${businessName} (${name})`);
    lines.push('');
    lines.push(`Orders today: ${s.ordersReceived}`);
    lines.push(`Production completed: ${s.productionCompleted}`);
    lines.push(`In production: ${s.productionInProgress}`);
    lines.push(`Cash received: ${naira(s.cashReceivedKobo)}`);
    lines.push(`Still owed: ${naira(s.outstandingKobo)}`);
    if (s.lowMaterialsCount > 0) {
      const names = s.lowMaterials.map((m) => m.name).join(', ');
      lines.push('');
      lines.push(`⚠️ ${s.lowMaterialsCount} material(s) low: ${names}`);
    }
    if (s.topDebtors.length > 0) {
      lines.push('');
      lines.push('Top debtors:');
      for (const d of s.topDebtors) {
        lines.push(`  • ${d.name}: ${naira(d.amountKobo)}`);
      }
    }
    return lines.join('\n');
  },
};
