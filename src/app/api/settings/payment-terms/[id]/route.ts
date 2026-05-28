import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { paymentTermsService } from '@/lib/services/terms.service';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  netDays: z.number().int().min(0).max(3650).nullable().optional(),
  type: z
    .enum(['NET','CURRENT_MONTH','PAID_IN_CASH','PREPAYMENT','DUE_DATE','FACTORING','CURRENT_WEEK_MONDAY'])
    .nullable()
    .optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner: user } = await requireAuth();
    const body = UpdateSchema.parse(await req.json());
    const updated = await paymentTermsService.update(user.id, params.id, body);
    return ok({ paymentTerm: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner: user } = await requireAuth();
    await paymentTermsService.softDelete(user.id, params.id);
    return ok({ deleted: true });
  });
}
