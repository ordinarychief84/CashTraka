import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { productionTemplatesService } from '@/lib/services/production-templates.service';

/** POST /api/production-templates/[id]/pause */
export const POST = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const t = await productionTemplatesService.pause(auth.owner.id, ctx.params.id);
    return ok(t);
  });
