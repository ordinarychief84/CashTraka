import { requireUser } from '@/lib/auth';
import { billingService } from '@/lib/services/billing.service';
import { handled, ok, fail } from '@/lib/api-response';

export const runtime = 'nodejs';

/**
 * GET /api/billing/verify?reference=...
 *
 * Called by the /billing/callback page when Paystack redirects the user back.
 * Idempotent — if the webhook got there first, this just reads the already-
 * completed state. If the webhook is delayed, this finalises synchronously.
 */
export const GET = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');
    if (!reference) return fail('Missing reference', 400);

    const result = await billingService.completeUpgrade(reference);
    // Don't leak other users' attempts.
    if (result.userId && result.userId !== user.id) {
      return fail('Reference does not belong to this user', 403);
    }
    return ok(result);
  });
