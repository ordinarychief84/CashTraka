import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { customerOrdersService } from '@/lib/services/customer-orders.service';

type Ctx = { params: { id: string } };

export const GET = (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const order = await customerOrdersService.getForUser(auth.owner.id, ctx.params.id);
    return ok(order);
  });
