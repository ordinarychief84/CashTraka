import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { rawMaterialsService } from '@/lib/services/raw-materials.service';
import { adjustStockSchema } from '@/lib/validators';

type Ctx = { params: { id: string } };

/** POST /api/raw-materials/[id]/adjust — adjust stock by a delta. */
export const POST = (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = adjustStockSchema.parse(body);
    const movement = await rawMaterialsService.adjustStock(
      auth.owner.id,
      ctx.params.id,
      input,
      auth.principalId,
    );
    return ok(movement, 201);
  });
