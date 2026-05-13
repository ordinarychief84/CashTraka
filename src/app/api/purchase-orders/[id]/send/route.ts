import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';

type Ctx = { params: { id: string } };

export const POST = (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const result = await purchaseOrdersService.send(
      auth.owner.id,
      ctx.params.id,
      auth.principalId,
    );
    return ok(result);
  });
