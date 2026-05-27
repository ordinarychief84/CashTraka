import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { currenciesService } from '@/lib/services/currencies.service';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  code: z.string().trim().min(3).max(3),
  exchangeRate: z.number().positive().optional(),
});

export async function GET() {
  return handled(async () => {
    const { owner } = await requireAuth();
    const rows = await currenciesService.listForUser(owner.id);
    return ok({ currencies: rows });
  });
}

export async function POST(req: Request) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = CreateSchema.parse(await req.json());
    const created = await currenciesService.create(owner.id, body.code, body.exchangeRate);
    return ok({ currency: created }, 201);
  });
}
