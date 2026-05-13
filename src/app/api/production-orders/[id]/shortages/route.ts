import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { inventoryService } from '@/lib/services/inventory.service';

type Ctx = { params: { id: string } };

export const GET = (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const rows = await inventoryService.computeShortagesForOrder(
      auth.owner.id,
      ctx.params.id,
    );
    return ok({ rows });
  });
