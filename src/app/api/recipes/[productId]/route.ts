import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { recipesService } from '@/lib/services/recipes.service';
import { inventoryService } from '@/lib/services/inventory.service';
import { recipeSchema } from '@/lib/validators';

type Ctx = { params: { productId: string } };

export const GET = async (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const recipe = await recipesService.getForProduct(auth.owner.id, ctx.params.productId);
    if (!recipe) return ok(null);
    const unitCostKobo = await inventoryService.computeRecipeUnitCostKobo(
      auth.owner.id,
      ctx.params.productId,
    );
    return ok({ ...recipe, unitCostKobo });
  });

export const PUT = async (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = recipeSchema.parse(body);
    const recipe = await recipesService.upsertForProduct(
      auth.owner.id,
      ctx.params.productId,
      input,
      auth.principalId,
    );
    return ok(recipe);
  });

export const DELETE = async (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    await recipesService.softDelete(
      auth.owner.id,
      ctx.params.productId,
      auth.principalId,
    );
    return ok({ deleted: true });
  });
