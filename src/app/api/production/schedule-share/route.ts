import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok } from '@/lib/api-response';
import {
  productionScheduleShareLink,
  productionScheduleShareMessage,
} from '@/lib/whatsapp.util';

/**
 * GET /api/production/schedule-share
 *
 * Returns a `wa.me?text=…` link the seller can tap to forward
 * "what we're making this week" to a team WhatsApp group, a customer,
 * or post to their status. The link has no phone number — WhatsApp
 * opens its recipient picker so the user chooses.
 *
 * The text body is built from the next 7 days of active production
 * runs, summarised + capped at 8 lines so wa.me doesn't truncate.
 */
export const GET = (_req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const userId = auth.owner.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const orders = await prisma.productionOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'IN_PRODUCTION'] },
        OR: [
          { plannedStartAt: { lte: weekEnd, gte: today } },
          { plannedEndAt: { lte: weekEnd, gte: today } },
        ],
      },
      orderBy: [{ plannedStartAt: 'asc' }, { plannedEndAt: 'asc' }],
      include: {
        items: { include: { product: { select: { name: true } } } },
      },
      take: 50,
    });

    // Roll items up across runs so the share message says
    // "120 × Shea body butter" rather than listing every run separately.
    const totals = new Map<string, { productName: string; qty: number; whenLabel?: string }>();
    for (const o of orders) {
      const when = o.plannedEndAt
        ? new Date(o.plannedEndAt).toLocaleDateString('en-NG', { weekday: 'short' })
        : undefined;
      for (const it of o.items) {
        const key = it.product.name;
        const prev = totals.get(key);
        if (prev) {
          prev.qty += it.quantity;
          if (when && !prev.whenLabel) prev.whenLabel = when;
        } else {
          totals.set(key, { productName: it.product.name, qty: it.quantity, whenLabel: when });
        }
      }
    }
    const lines = [...totals.values()].sort((a, b) => b.qty - a.qty);

    const business = await prisma.user.findUnique({
      where: { id: userId },
      select: { businessName: true, name: true },
    });
    const businessName = business?.businessName || business?.name || 'our team';

    const windowLabel = `${today.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}–${new Date(weekEnd.getTime() - 1).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`;

    const message = productionScheduleShareMessage({
      businessName,
      windowLabel,
      lines,
    });
    const link = productionScheduleShareLink(message);

    return ok({
      link,
      message,
      runCount: orders.length,
      lineCount: lines.length,
    });
  });
