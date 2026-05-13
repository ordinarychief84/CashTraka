import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { productionOrdersService } from '@/lib/services/production-orders.service';

type Ctx = { params: { id: string } };

export const POST = (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const order = await productionOrdersService.complete(
      auth.owner.id,
      ctx.params.id,
      auth.principalId,
    );
    return ok(order);
  });
