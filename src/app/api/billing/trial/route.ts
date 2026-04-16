import { z } from 'zod';
import { requirePermission } from '@/lib/auth';
import { billingService } from '@/lib/services/billing.service';
import { handled, ok, validationFail } from '@/lib/api-response';

export const runtime = 'nodejs';

const schema = z.object({
  plan: z.enum(['business', 'business_plus', 'landlord', 'estate_manager']),
});

/**
 * POST /api/billing/trial — start a 14-day trial on the target plan.
 * Only works if the user has never trialled before.
 */
export const POST = (req: Request) =>
  handled(async () => {
    const ctx = await requirePermission('billing.write');
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const result = await billingService.startTrial(ctx.owner.id, parsed.data.plan);
    return ok(result);
  });
