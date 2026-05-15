import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { productionTemplatesService } from '@/lib/services/production-templates.service';

/** GET /api/production-templates/[id] — read one template. */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const t = await productionTemplatesService.getForUser(auth.owner.id, ctx.params.id);
    return ok(t);
  });

/** DELETE /api/production-templates/[id] — soft-delete. */
export const DELETE = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    await productionTemplatesService.softDelete(auth.owner.id, ctx.params.id);
    return ok({ deleted: true });
  });
