import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { bankAccountsService } from '@/lib/services/company-book.service';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  bankName: z.string().trim().max(80).nullable().optional(),
  registrationNo: z.string().trim().max(40).nullable().optional(),
  accountNumber: z.string().trim().max(40).nullable().optional(),
  iban: z.string().trim().max(40).nullable().optional(),
  swift: z.string().trim().max(20).nullable().optional(),
  fiNumber: z.string().trim().max(40).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = UpdateSchema.parse(await req.json());
    const updated = await bankAccountsService.update(owner.id, params.id, body);
    return ok({ bankAccount: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    await bankAccountsService.softDelete(owner.id, params.id);
    return ok({ deleted: true });
  });
}
