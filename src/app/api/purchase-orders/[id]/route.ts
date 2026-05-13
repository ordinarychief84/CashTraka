import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';

type Ctx = { params: { id: string } };

export const GET = (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const po = await purchaseOrdersService.getForUser(auth.owner.id, ctx.params.id);
    return ok(po);
  });
