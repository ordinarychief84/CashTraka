import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { inventoryService } from '@/lib/services/inventory.service';

/**
 * GET /api/inventory/expiring?days=14
 * Materials whose expiresAt falls within the next N days.
 */
export const GET = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const daysAhead = Math.max(1, Math.min(Number(searchParams.get('days') ?? 14), 365));
    const rows = await inventoryService.computeExpiringMaterials(auth.owner.id, daysAhead);
    return ok({ rows, daysAhead });
  });
