import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { handled, ok, validationFail } from '@/lib/api-response';
import { subscriptionsService } from '@/lib/services/subscriptions.service';

export const runtime = 'nodejs';

const itemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1).max(200),
  quantity: z.coerce.number().int().positive(),
  unitPriceKobo: z.coerce.number().int().nonnegative(),
});

const createSchema = z.object({
  customerId: z.string().min(1),
  cadence: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly']),
  startsAt: z.string().min(1),
  endsAt: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(itemSchema).min(1),
});

export const GET = () =>
  handled(async () => {
    const user = await requireUser();
    const rows = await subscriptionsService.listForUser(user.id);
    return ok({ rows });
  });

export const POST = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);
    const sub = await subscriptionsService.create(user.id, {
      customerId: parsed.data.customerId,
      cadence: parsed.data.cadence,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      notes: parsed.data.notes ?? null,
      items: parsed.data.items,
    });
    return ok(sub);
  });
