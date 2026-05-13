import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { inventoryService } from '@/lib/services/inventory.service';

/**
 * GET /api/inventory/shortages
 *   ?productionOrderId=<id> — scope to one order
 * Default: aggregate shortage across all active production orders.
 */
export const GET = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const productionOrderId = searchParams.get('productionOrderId');
    if (productionOrderId) {
      const rows = await inventoryService.computeShortagesForOrder(
        auth.owner.id,
        productionOrderId,
      );
      return ok({ rows, scope: 'order', productionOrderId });
    }
    const rows = await inventoryService.computeShortages(auth.owner.id);
    return ok({ rows, scope: 'all' });
  });
