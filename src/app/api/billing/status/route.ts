import { requireUser } from '@/lib/auth';
import { billingService } from '@/lib/services/billing.service';
import { PLAN_PRICING, isPaidPlan } from '@/lib/billing/pricing';
import { PLAN_LABELS, suggestUpgrade } from '@/lib/plan-limits';
import { handled, ok } from '@/lib/api-response';

export const runtime = 'nodejs';

/**
 * GET /api/billing/status — current billing state + the price of the plan
 * the user would upgrade to next. Powers the Settings Billing card.
 */
export const GET = () =>
  handled(async () => {
    const user = await requireUser();
    const status = await billingService.status(user.id);
    const suggested = suggestUpgrade(status.plan, status.businessType);
    const pricing = isPaidPlan(suggested) ? PLAN_PRICING[suggested] : null;

    return ok({
      plan: status.plan,
      planLabel: PLAN_LABELS[status.plan as keyof typeof PLAN_LABELS] ?? status.plan,
      businessType: status.businessType,
      subscriptionStatus: status.subscriptionStatus ?? 'free',
      trialEndsAt: status.trialEndsAt,
      currentPeriodEnd: status.currentPeriodEnd,
      pendingPlan: status.pendingPlan,
      suggested: {
        plan: suggested,
        label: PLAN_LABELS[suggested],
        amountKobo: pricing?.amountKobo ?? null,
      },
    });
  });
