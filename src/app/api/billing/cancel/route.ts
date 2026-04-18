import { requirePermission } from '@/lib/auth';
import { billingService } from '@/lib/services/billing.service';
import { handled, ok } from '@/lib/api-response';

export const runtime = 'nodejs';

/** POST /api/billing/cancel — owner-only; staff cannot cancel the subscription. */
export const POST = () =>
  handled(async () => {
    const ctx = await requirePermission('billing.write');
    const result = await billingService.cancel(ctx.owner.id);
    return ok(result);
  });
