import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { productionOrdersService } from '@/lib/services/production-orders.service';
import { inventoryService } from '@/lib/services/inventory.service';

type Ctx = { params: { id: string } };

export const GET = (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const order = await productionOrdersService.getForUser(auth.owner.id, ctx.params.id);
    const shortages = await inventoryService.computeShortagesForOrder(
      auth.owner.id,
      order.id,
    );
    const estimatedCostKobo = await inventoryService.computeProductionOrderCostKobo(
      auth.owner.id,
      order.id,
    );
    return ok({ ...order, shortages, estimatedCostKobo });
  });
