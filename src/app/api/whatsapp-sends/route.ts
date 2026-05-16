import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, validationFail } from '@/lib/api-response';

/**
 * POST /api/whatsapp-sends   (Decision 5 of 5)
 *
 * Append-only log of "Yes, I sent it" confirmations the owner clicks after
 * tapping a wa.me deep link. The table is INSERT-ONLY by convention — no
 * PATCH / DELETE endpoints. Re-sends create another row, which is fine.
 *
 * Body:
 *   {
 *     entityType:     "order" | "production" | "invoice" | "receipt"
 *     entityId:       string
 *     touchpointType: "order_confirmed" | "production_done"
 *                   | "invoice_issued"  | "payment_received"
 *     sentAt:         ISO8601 string (client-side `new Date().toISOString()`,
 *                                     server validates + falls back to now)
 *   }
 */

const schema = z.object({
  entityType: z.enum(['order', 'production', 'invoice', 'receipt']),
  entityId: z.string().min(1).max(64),
  touchpointType: z.enum([
    'order_confirmed',
    'production_done',
    'invoice_issued',
    'payment_received',
  ]),
  sentAt: z.string().datetime().optional(),
});

export const POST = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const sentAt = parsed.data.sentAt ? new Date(parsed.data.sentAt) : new Date();
    if (Number.isNaN(sentAt.getTime())) {
      // Should not happen given zod's .datetime() guard, but be defensive.
      return ok({ id: null, accepted: false });
    }

    const row = await prisma.whatsAppSendLog.create({
      data: {
        userId: auth.owner.id,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        touchpointType: parsed.data.touchpointType,
        sentAt,
      },
      select: { id: true, sentAt: true },
    });

    return ok({ id: row.id, sentAt: row.sentAt.toISOString(), accepted: true });
  });
