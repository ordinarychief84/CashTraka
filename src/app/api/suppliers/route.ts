import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { suppliersService } from '@/lib/services/suppliers.service';
import { supplierSchema } from '@/lib/validators';

/** GET /api/suppliers — paginated list / search. */
export const GET = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? undefined;
    const take = Math.min(Number(searchParams.get('take') ?? 50), 200);
    const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);
    const includeDeleted = searchParams.get('includeDeleted') === '1';
    const result = await suppliersService.listForUser(auth.owner.id, {
      q,
      take,
      skip,
      includeDeleted,
    });
    return ok(result);
  });

/** POST /api/suppliers — create a supplier. */
export const POST = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = supplierSchema.parse(body);
    const supplier = await suppliersService.create(
      auth.owner.id,
      input,
      auth.principalId,
    );
    return ok(supplier, 201);
  });
