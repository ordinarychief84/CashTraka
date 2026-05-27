import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { bankAccountsService } from '@/lib/services/company-book.service';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  bankName: z.string().trim().max(80).nullable().optional(),
  registrationNo: z.string().trim().max(40).nullable().optional(),
  accountNumber: z.string().trim().max(40).nullable().optional(),
  iban: z.string().trim().max(40).nullable().optional(),
  swift: z.string().trim().max(20).nullable().optional(),
  fiNumber: z.string().trim().max(40).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  return handled(async () => {
    const { owner } = await requireAuth();
    const rows = await bankAccountsService.listForUser(owner.id);
    return ok({ bankAccounts: rows });
  });
}

export async function POST(req: Request) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = CreateSchema.parse(await req.json());
    const created = await bankAccountsService.create(owner.id, body);
    return ok({ bankAccount: created }, 201);
  });
}
