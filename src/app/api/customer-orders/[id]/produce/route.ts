import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { customerOrdersService } from '@/lib/services/customer-orders.service';

type Ctx = { params: { id: string } };

export const POST = (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const result = await customerOrdersService.spawnProduction(
      auth.owner.id,
      ctx.params.id,
      auth.principalId,
    );
    return ok(result, 201);
  });
