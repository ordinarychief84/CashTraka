import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { languagesService } from '@/lib/services/settings-extras.service';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().min(1).max(8).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = UpdateSchema.parse(await req.json());
    const updated = await languagesService.update(owner.id, params.id, body);
    return ok({ language: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    await languagesService.softDelete(owner.id, params.id);
    return ok({ deleted: true });
  });
}
