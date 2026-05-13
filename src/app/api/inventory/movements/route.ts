import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { inventoryService, type StockItemType, type StockMovementReason } from '@/lib/services/inventory.service';

/**
 * GET /api/inventory/movements?itemType=&reason=&take=&skip=
 * Filtered ledger across all items.
 */
export const GET = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const itemType = (searchParams.get('itemType') as StockItemType | null) ?? undefined;
    const reason = (searchParams.get('reason') as StockMovementReason | null) ?? undefined;
    const take = Math.min(Number(searchParams.get('take') ?? 100), 500);
    const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);
    const result = await inventoryService.listMovements(auth.owner.id, {
      itemType,
      reason,
      take,
      skip,
    });
    return ok(result);
  });
