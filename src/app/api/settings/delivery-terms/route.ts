import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { deliveryTermsService } from '@/lib/services/terms.service';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  return handled(async () => {
    const { owner: user } = await requireAuth();
    const rows = await deliveryTermsService.listForUser(user.id);
    return ok({ deliveryTerms: rows });
  });
}

export async function POST(req: Request) {
  return handled(async () => {
    const { owner: user } = await requireAuth();
    const body = CreateSchema.parse(await req.json());
    const created = await deliveryTermsService.create(user.id, body);
    return ok({ deliveryTerm: created }, 201);
  });
}
