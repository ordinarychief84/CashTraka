import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { deliveryTermsService } from '@/lib/services/terms.service';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner: user } = await requireAuth();
    const body = UpdateSchema.parse(await req.json());
    const updated = await deliveryTermsService.update(user.id, params.id, body);
    return ok({ deliveryTerm: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner: user } = await requireAuth();
    await deliveryTermsService.softDelete(user.id, params.id);
    return ok({ deleted: true });
  });
}
