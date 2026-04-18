import { z } from 'zod';
import { requirePermission } from '@/lib/auth';
import { billingService } from '@/lib/services/billing.service';
import { handled, ok, validationFail } from '@/lib/api-response';

export const runtime = 'nodejs';

const schema = z.object({
  plan: z.enum(['business', 'business_plus', 'landlord', 'estate_manager']),
});

/**
 * POST /api/billing/subscribe
 *
 * Starts a Paystack hosted checkout for the requested plan. Returns an
 * authorization URL that the client should redirect to.
 */
export const POST = (req: Request) =>
  handled(async () => {
    const ctx = await requirePermission('billing.write');
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const result = await billingService.initUpgrade(ctx.owner.id, parsed.data.plan);
    return ok(result);
  });
