import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { billingService } from '@/lib/services/billing.service';
import { handled, ok, validationFail } from '@/lib/api-response';

export const runtime = 'nodejs';

const schema = z.object({
  plan: z.enum([
    'free',
    'starter_quarterly',
    'starter_biannually',
    'starter_yearly',
    // Legacy keys
    'business',
    'business_plus',
    'landlord',
    'estate_manager',
  ]),
  status: z
    .enum(['free', 'trialing', 'active', 'past_due', 'cancelled'])
    .optional(),
  reason: z.string().trim().max(500).optional(),
});

/**
 * PATCH /api/admin/users/[id]/plan
 * Admin override - force-change a user's plan, optionally with a reason for
 * the audit trail.
 */
export const PATCH = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const result = await billingService.adminSetPlan({
      adminId: admin.id,
      userId: ctx.params.id,
      plan: parsed.data.plan,
      status: parsed.data.status,
      reason: parsed.data.reason,
    });
    return ok(result);
  });
