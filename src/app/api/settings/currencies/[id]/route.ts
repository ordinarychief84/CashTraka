import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { currenciesService } from '@/lib/services/currencies.service';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  exchangeRate: z.number().positive().optional(),
  isDefault: z.literal(true).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = PatchSchema.parse(await req.json());
    let updated;
    if (body.isDefault === true) {
      updated = await currenciesService.setDefault(owner.id, params.id);
    } else if (typeof body.exchangeRate === 'number') {
      updated = await currenciesService.setRate(owner.id, params.id, body.exchangeRate);
    } else {
      // Nothing to do — return current state.
      return ok({ currency: null });
    }
    return ok({ currency: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    await currenciesService.softDelete(owner.id, params.id);
    return ok({ deleted: true });
  });
}
