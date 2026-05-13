import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { rawMaterialsService } from '@/lib/services/raw-materials.service';
import { rawMaterialSchema } from '@/lib/validators';

/** GET /api/raw-materials — paginated list / search / low-stock filter. */
export const GET = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? undefined;
    const lowStockOnly = searchParams.get('lowStockOnly') === '1';
    const supplierId = searchParams.get('supplierId') ?? undefined;
    const take = Math.min(Number(searchParams.get('take') ?? 50), 200);
    const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);
    const result = await rawMaterialsService.listForUser(auth.owner.id, {
      q,
      lowStockOnly,
      supplierId,
      take,
      skip,
    });
    return ok(result);
  });

/** POST /api/raw-materials — create a material. */
export const POST = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = rawMaterialSchema.parse(body);
    const material = await rawMaterialsService.create(
      auth.owner.id,
      input,
      auth.principalId,
    );
    return ok(material, 201);
  });
