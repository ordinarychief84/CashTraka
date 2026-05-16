import { prisma } from '@/lib/prisma';

/**
 * Read-side helpers for the WhatsAppSendLog table (Decision 5 of 5).
 *
 * Writes go through POST /api/whatsapp-sends (so the user ID can be
 * established from the session cookie). These helpers run server-side
 * during page render to hydrate the WhatsAppSendButton with its prior
 * "sent" timestamp.
 */
export const whatsappSendService = {
  /** Latest sent timestamp for one (user, entity, touchpoint). */
  async latestSentAt(
    userId: string,
    entityId: string,
    touchpointType:
      | 'order_confirmed'
      | 'production_done'
      | 'invoice_issued'
      | 'payment_received',
  ): Promise<Date | null> {
    const row = await prisma.whatsAppSendLog.findFirst({
      where: { userId, entityId, touchpointType },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    });
    return row?.sentAt ?? null;
  },

  /**
   * For the dashboard "not yet notified" rail. Returns the count of
   * relevant entities that have NO send-log row at all.
   *
   * Each touchpoint expects a different entity-source query:
   *   order_confirmed    — CustomerOrders in CONFIRMED status
   *   production_done    — ProductionOrders in COMPLETED status
   *   invoice_issued     — Invoices in SENT status
   *   payment_received   — Receipts (no status filter, all generated)
   *
   * Returns aggregate counts so the dashboard can render a single
   * compact rail like "3 customers not yet notified".
   */
  async unsentCounts(userId: string): Promise<{
    orderConfirmed: number;
    productionDone: number;
    invoiceIssued: number;
    paymentReceived: number;
    total: number;
  }> {
    // Pull entity IDs that already have at least one send-log row, then
    // count entities without one. Cheaper than per-entity joins for the
    // dashboard refresh path.
    const sentLogs = await prisma.whatsAppSendLog.findMany({
      where: { userId },
      select: { entityId: true, touchpointType: true },
    });
    const sentSet = new Set(sentLogs.map((l) => `${l.touchpointType}:${l.entityId}`));

    const [orders, production, invoices] = await Promise.all([
      prisma.customerOrder.findMany({
        where: { userId, status: 'CONFIRMED', deletedAt: null },
        select: { id: true },
      }),
      prisma.productionOrder.findMany({
        where: { userId, status: 'COMPLETED', deletedAt: null },
        select: { id: true },
      }),
      prisma.invoice.findMany({
        where: { userId, status: 'SENT' },
        select: { id: true },
      }),
    ]);

    const orderConfirmed = orders.filter(
      (o) => !sentSet.has(`order_confirmed:${o.id}`),
    ).length;
    const productionDone = production.filter(
      (p) => !sentSet.has(`production_done:${p.id}`),
    ).length;
    const invoiceIssued = invoices.filter(
      (i) => !sentSet.has(`invoice_issued:${i.id}`),
    ).length;

    // payment_received intentionally not counted in the dashboard —
    // receipts auto-generate after every payment, so the inbox of
    // "unsent receipts" would dominate the rail. Owners share receipts
    // ad-hoc from the receipt detail page instead.

    const total = orderConfirmed + productionDone + invoiceIssued;
    return { orderConfirmed, productionDone, invoiceIssued, paymentReceived: 0, total };
  },
};
