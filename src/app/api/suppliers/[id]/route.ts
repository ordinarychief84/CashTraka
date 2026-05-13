import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { suppliersService } from '@/lib/services/suppliers.service';
import { supplierUpdateSchema } from '@/lib/validators';

type Ctx = { params: { id: string } };

export const GET = (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const supplier = await suppliersService.getForUser(auth.owner.id, ctx.params.id);
    return ok(supplier);
  });

export const PATCH = (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = supplierUpdateSchema.parse(body);
    const supplier = await suppliersService.update(
      auth.owner.id,
      ctx.params.id,
      input,
      auth.principalId,
    );
    return ok(supplier);
  });

export const DELETE = (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    const supplier = await suppliersService.softDelete(
      auth.owner.id,
      ctx.params.id,
      auth.principalId,
    );
    return ok(supplier);
  });
