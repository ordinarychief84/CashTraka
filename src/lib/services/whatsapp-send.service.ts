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
  /** Latest sent timestamp for one (user, entity, touchpoint).
   *
   *  Wrapped in try/catch so pages that hydrate from this never 500 just
   *  because the WhatsAppSendLog table hasn't been migrated yet. The
   *  send-confirmation UI degrades to "not yet sent" — exactly what the
   *  app would show without any prior send. Errors are logged once so
   *  ops still sees them. */
  async latestSentAt(
    userId: string,
    entityId: string,
    touchpointType:
      | 'order_confirmed'
      | 'production_done'
      | 'invoice_issued'
      | 'payment_received',
  ): Promise<Date | null> {
    try {
      const row = await prisma.whatsAppSendLog.findFirst({
        where: { userId, entityId, touchpointType },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true },
      });
      return row?.sentAt ?? null;
    } catch (err) {
      console.warn(
        '[whatsappSend.latestSentAt] read failed (table missing? migrate not run?)',
        err instanceof Error ? err.message : err,
      );
      return null;
    }
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
    //
    // If the WhatsAppSendLog table doesn't exist yet (migration not run),
    // treat as "no sends recorded" so the dashboard rail still renders.
    // The whole method then returns a zero-total which hides the rail —
    // exactly what we want during a degraded state.
    let sentLogs: { entityId: string; touchpointType: string }[];
    try {
      sentLogs = await prisma.whatsAppSendLog.findMany({
        where: { userId },
        select: { entityId: true, touchpointType: true },
      });
    } catch (err) {
      console.warn(
        '[whatsappSend.unsentCounts] read failed (table missing? migrate not run?)',
        err instanceof Error ? err.message : err,
      );
      return { orderConfirmed: 0, productionDone: 0, invoiceIssued: 0, paymentReceived: 0, total: 0 };
    }
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
