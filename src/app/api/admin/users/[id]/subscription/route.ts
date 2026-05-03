import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, fail, validationFail } from '@/lib/api-response';

export const runtime = 'nodejs';

/**
 * POST /api/admin/users/[id]/subscription
 *
 * Lifecycle controls for a single user's subscription state. Each action
 * writes to AuditLog with the prevState in details. Use these for support
 * cases, comp extensions, and recovering from stuck billing flows.
 */
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('extend-trial'), days: z.number().int().min(1).max(365) }),
  z.object({ action: z.literal('set-active'), currentPeriodEnd: z.string() }),
  z.object({ action: z.literal('mark-past-due') }),
  z.object({ action: z.literal('mark-cancelled') }),
  z.object({ action: z.literal('restore-free') }),
]);

export const POST = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const user = await prisma.user.findUnique({ where: { id: ctx.params.id } });
    if (!user) return fail('User not found', 404);

    const prevState = {
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
      currentPeriodEnd: user.currentPeriodEnd,
    };

    const data: {
      plan?: string;
      subscriptionStatus?: string;
      trialEndsAt?: Date | null;
      currentPeriodEnd?: Date | null;
      pendingPlan?: string | null;
    } = {};

    switch (parsed.data.action) {
      case 'extend-trial': {
        const base =
          user.trialEndsAt && user.trialEndsAt.getTime() > Date.now()
            ? user.trialEndsAt
            : new Date();
        const next = new Date(base);
        next.setDate(next.getDate() + parsed.data.days);
        data.trialEndsAt = next;
        data.subscriptionStatus = 'trialing';
        break;
      }
      case 'set-active': {
        const cpe = new Date(parsed.data.currentPeriodEnd);
        if (Number.isNaN(cpe.getTime())) return fail('Invalid date', 422);
        data.subscriptionStatus = 'active';
        data.currentPeriodEnd = cpe;
        data.pendingPlan = null;
        break;
      }
      case 'mark-past-due': {
        data.subscriptionStatus = 'past_due';
        break;
      }
      case 'mark-cancelled': {
        data.subscriptionStatus = 'cancelled';
        break;
      }
      case 'restore-free': {
        data.plan = 'free';
        data.subscriptionStatus = 'free';
        data.trialEndsAt = null;
        data.currentPeriodEnd = null;
        data.pendingPlan = null;
        break;
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    await prisma.auditLog
      .create({
        data: {
          adminId: admin.id,
          action: 'subscription.' + parsed.data.action,
          targetId: user.id,
          details: JSON.stringify({ prevState, payload: parsed.data }),
        },
      })
      .catch(() => null);

    return ok({
      plan: updated.plan,
      subscriptionStatus: updated.subscriptionStatus,
      trialEndsAt: updated.trialEndsAt,
      currentPeriodEnd: updated.currentPeriodEnd,
    });
  });
