import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { productionTemplatesService } from '@/lib/services/production-templates.service';

/**
 * POST /api/production-templates/[id]/run-now
 *
 * Spawns a ProductionOrder from the template immediately. Advances
 * `nextRunAt` forward by the template's cadence so the user doesn't
 * get a duplicate spawn at the next cron tick.
 */
export const POST = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const order = await productionTemplatesService.spawn(auth.owner.id, ctx.params.id);
    return ok({ productionOrderId: order.id, productionNumber: order.productionNumber });
  });
