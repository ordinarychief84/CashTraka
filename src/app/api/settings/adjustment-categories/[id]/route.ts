import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { adjustmentCategoriesService } from '@/lib/services/settings-extras.service';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  type: z.string().trim().max(60).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = UpdateSchema.parse(await req.json());
    const updated = await adjustmentCategoriesService.update(owner.id, params.id, body);
    return ok({ adjustmentCategory: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    await adjustmentCategoriesService.softDelete(owner.id, params.id);
    return ok({ deleted: true });
  });
}
