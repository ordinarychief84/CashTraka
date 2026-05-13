import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { customerOrdersService } from '@/lib/services/customer-orders.service';
import { customerOrderStatusSchema } from '@/lib/validators';

type Ctx = { params: { id: string } };

export const PATCH = (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = customerOrderStatusSchema.parse(body);
    const order = await customerOrdersService.updateStatus(
      auth.owner.id,
      ctx.params.id,
      input.status,
      input.reason ?? null,
      auth.principalId,
    );
    return ok(order);
  });
