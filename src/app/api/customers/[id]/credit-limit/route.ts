import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, fail } from '@/lib/api-response';

/**
 * POST /api/customers/[id]/credit-limit
 *
 * Sets or clears the per-customer credit cap. Body: { creditLimitKobo: number | null }.
 * null clears the limit. Owner-scoped — guards on customer ownership.
 */
export const POST = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const raw = body?.creditLimitKobo;

    let creditLimitKobo: number | null;
    if (raw === null || raw === undefined || raw === '') {
      creditLimitKobo = null;
    } else if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) {
      creditLimitKobo = raw;
    } else {
      return fail('creditLimitKobo must be a non-negative integer or null', 400);
    }

    const customer = await prisma.customer.findFirst({
      where: { id: ctx.params.id, userId: auth.owner.id },
      select: { id: true },
    });
    if (!customer) return fail('Customer not found', 404);

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { creditLimitKobo },
      select: { id: true, creditLimitKobo: true },
    });
    return ok(updated);
  });
