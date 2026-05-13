import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { productionOrdersService } from '@/lib/services/production-orders.service';

type Ctx = { params: { id: string } };

const bodySchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const POST = (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const input = bodySchema.parse(body);
    const order = await productionOrdersService.markDelayed(
      auth.owner.id,
      ctx.params.id,
      input.reason ?? null,
      auth.principalId,
    );
    return ok(order);
  });
