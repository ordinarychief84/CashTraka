import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';

type Ctx = { params: { id: string } };

const bodySchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const POST = (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const input = bodySchema.parse(body);
    const po = await purchaseOrdersService.cancel(
      auth.owner.id,
      ctx.params.id,
      input.reason ?? null,
      auth.principalId,
    );
    return ok(po);
  });
