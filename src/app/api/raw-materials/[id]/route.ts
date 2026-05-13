import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { rawMaterialsService } from '@/lib/services/raw-materials.service';
import { inventoryService } from '@/lib/services/inventory.service';
import { rawMaterialUpdateSchema } from '@/lib/validators';

type Ctx = { params: { id: string } };

export const GET = (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const withMovements = searchParams.get('movements') === '1';
    const material = await rawMaterialsService.getForUser(auth.owner.id, ctx.params.id);
    if (!withMovements) return ok(material);
    const movements = await inventoryService.movementsForItem(
      auth.owner.id,
      'MATERIAL',
      material.id,
      { take: 50 },
    );
    return ok({ ...material, movements });
  });

export const PATCH = (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = rawMaterialUpdateSchema.parse(body);
    const material = await rawMaterialsService.update(
      auth.owner.id,
      ctx.params.id,
      input,
      auth.principalId,
    );
    return ok(material);
  });

export const DELETE = (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const material = await rawMaterialsService.softDelete(
      auth.owner.id,
      ctx.params.id,
      auth.principalId,
    );
    return ok(material);
  });
