import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { addressesService } from '@/lib/services/company-book.service';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  street: z.string().trim().max(200).nullable().optional(),
  street2: z.string().trim().max(200).nullable().optional(),
  postcode: z.string().trim().max(20).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  country: z.string().trim().max(80).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().max(120).nullable().optional(),
  attention: z.string().trim().max(120).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = UpdateSchema.parse(await req.json());
    const updated = await addressesService.update(owner.id, params.id, body);
    return ok({ address: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    await addressesService.softDelete(owner.id, params.id);
    return ok({ deleted: true });
  });
}
