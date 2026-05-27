import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { customFieldsService } from '@/lib/services/custom-fields.service';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    await customFieldsService.softDelete(owner.id, params.id);
    return ok({ deleted: true });
  });
}
