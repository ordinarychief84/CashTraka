import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';
import { purchaseOrderReceiveSchema } from '@/lib/validators';

type Ctx = { params: { id: string } };

export const POST = (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = purchaseOrderReceiveSchema.parse(body);
    const po = await purchaseOrdersService.receive(
      auth.owner.id,
      ctx.params.id,
      input.items,
      auth.principalId,
    );
    return ok(po);
  });
