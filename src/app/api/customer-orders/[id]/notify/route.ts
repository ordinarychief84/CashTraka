import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { customerOrdersService } from '@/lib/services/customer-orders.service';

type Ctx = { params: { id: string } };

const bodySchema = z.object({
  kind: z.enum(['CONFIRMATION', 'READY']).default('CONFIRMATION'),
});

/**
 * POST /api/customer-orders/[id]/notify
 * Manually re-send the email + return a fresh WhatsApp link for either
 * the confirmation or ready notification (whichever the caller asks for).
 */
export const POST = (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const { kind } = bodySchema.parse(body);
    const result =
      kind === 'READY'
        ? await customerOrdersService.sendReadyNotification(auth.owner.id, ctx.params.id)
        : await customerOrdersService.sendConfirmationNotification(auth.owner.id, ctx.params.id);
    return ok(result);
  });
