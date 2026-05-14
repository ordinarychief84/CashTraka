import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { productionOrdersService } from '@/lib/services/production-orders.service';

export const POST = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const updated = await productionOrdersService.markReady(
      auth.owner.id,
      ctx.params.id,
      auth.principalId,
    );
    return ok(updated);
  });
