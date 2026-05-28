import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { paymentTermsService } from '@/lib/services/terms.service';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  netDays: z.number().int().min(0).max(3650).nullable().optional(),
  type: z
    .enum(['NET','CURRENT_MONTH','PAID_IN_CASH','PREPAYMENT','DUE_DATE','FACTORING','CURRENT_WEEK_MONDAY'])
    .nullable()
    .optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  return handled(async () => {
    const { owner: user } = await requireAuth();
    const rows = await paymentTermsService.listForUser(user.id);
    return ok({ paymentTerms: rows });
  });
}

export async function POST(req: Request) {
  return handled(async () => {
    const { owner: user } = await requireAuth();
    const body = CreateSchema.parse(await req.json());
    const created = await paymentTermsService.create(user.id, body);
    return ok({ paymentTerm: created }, 201);
  });
}
