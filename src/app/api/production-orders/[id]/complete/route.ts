import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { productionOrdersService } from '@/lib/services/production-orders.service';
import { productionCompletionSchema } from '@/lib/validators';

type Ctx = { params: { id: string } };

export const POST = (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    // Body is optional — legacy callers POST with no body.
    let qc: ReturnType<typeof productionCompletionSchema.parse> | undefined;
    try {
      const raw = await req.json();
      qc = productionCompletionSchema.parse(raw);
    } catch {
      qc = undefined;
    }
    const order = await productionOrdersService.complete(
      auth.owner.id,
      ctx.params.id,
      auth.principalId,
      qc,
    );
    return ok(order);
  });
