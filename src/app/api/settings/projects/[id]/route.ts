import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { projectsService } from '@/lib/services/settings-extras.service';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  number: z.string().trim().min(1).max(32).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = UpdateSchema.parse(await req.json());
    const updated = await projectsService.update(owner.id, params.id, body);
    return ok({ project: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    await projectsService.softDelete(owner.id, params.id);
    return ok({ deleted: true });
  });
}
