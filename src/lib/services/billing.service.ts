import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { paystackService } from './paystack.service';
import { emailService } from './email.service';
import {
  PLAN_PRICING,
  isPaidPlan,
  type PaidPlanKey,
} from '@/lib/billing/pricing';
import { PLAN_LABELS } from '@/lib/plan-limits';

/**
 * Billing orchestration — the bridge between User.plan + Paystack.
 *
 * All methods are idempotent. Mutations go through prisma directly (no repo
 * layer needed for billing — these are simple atomic updates).
 */

const TRIAL_DAYS = 14;
const DEFAULT_CYCLE_DAYS = 30;

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function newReference(): string {
  // Paystack references must be unique & URL-safe. Prefix so they're
  // identifiable in Paystack's dashboard.
  return 'ct_' + crypto.randomBytes(12).toString('hex');
}

function ensurePaidPlan(plan: string): asserts plan is PaidPlanKey {
  if (!isPaidPlan(plan)) {
    throw Err.validation(`Unknown paid plan "${plan}"`);
  }
}

export const billingService = {
  /**
   * Start a 14-day trial on a paid plan. Only allowed if the user has never
   * trialled before (`trialEndsAt === null`) AND is currently Free.
   */
  async startTrial(userId: string, targetPlan: string) {
    ensurePaidPlan(targetPlan);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Err.notFound('User not found');
    if (user.trialEndsAt) {
      throw Err.conflict('You have already used your trial.');
    }
    if (user.subscriptionStatus !== 'free' && user.subscriptionStatus !== null) {
      throw Err.conflict('Cannot start a trial with an existing subscription.');
    }

    const trialEndsAt = daysFromNow(TRIAL_DAYS);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: targetPlan,
        subscriptionStatus: 'trialing',
        trialEndsAt,
      },
    });

    emailService
      .sendTrialStarted?.({
        to: updated.email,
        name: updated.name,
        plan: PLAN_LABELS[targetPlan as keyof typeof PLAN_LABELS] ?? targetPlan,
        trialEndsAt,
      })
      .catch(() => null);

    return {
      plan: updated.plan,
      subscriptionStatus: updated.subscriptionStatus,
      trialEndsAt: updated.trialEndsAt,
    };
  },

  /**
   * Start a Paystack hosted checkout for the user's chosen plan. Returns the
   * authorization URL that the client should redirect to.
   */
  async initUpgrade(userId: string, targetPlan: string) {
    ensurePaidPlan(targetPlan);
    const pricing = PLAN_PRICING[targetPlan];

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Err.notFound('User not found');

    const reference = newReference();
    const callbackUrl =
      (process.env.BILLING_REDIRECT_URL ||
        (process.env.APP_URL ? process.env.APP_URL + '/billing/callback' : 'http://localhost:3000/billing/callback'));

    // Persist the attempt FIRST so even if Paystack's response is lost we can
    // reconcile later via verify.
    const attempt = await prisma.paymentAttempt.create({
      data: {
        userId: user.id,
        targetPlan,
        amount: pricing.amountKobo,
        currency: 'NGN',
        paystackReference: reference,
        status: 'pending',
      },
    });

    const init = await paystackService.initTransaction({
      email: user.email,
      amountKobo: pricing.amountKobo,
      reference,
      callbackUrl,
      metadata: { userId: user.id, targetPlan },
    });

    if (!init.ok) {
      await prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'failed' },
      });
      throw Err.validation(
        init.error === 'not_configured'
          ? 'Billing is not configured. Please contact support.'
          : 'Could not start checkout: ' + init.error,
      );
    }

    // Track what plan they're upgrading to so the webhook knows what to do.
    await prisma.user.update({
      where: { id: user.id },
      data: { pendingPlan: targetPlan },
    });

    return {
      authorizationUrl: init.data.authorization_url,
      reference: init.data.reference,
    };
  },

  /**
   * Finalise an upgrade — called from both the webhook handler AND the
   * /billing/verify callback (whichever arrives first wins; the other is a
   * no-op). Authoritative check against Paystack prevents fraud.
   */
  async completeUpgrade(reference: string): Promise<
    | { status: 'success'; userId: string; plan: PaidPlanKey }
    | { status: 'failed' | 'pending' | 'abandoned'; userId?: string }
  > {
    const attempt = await prisma.paymentAttempt.findUnique({
      where: { paystackReference: reference },
    });
    if (!attempt) throw Err.notFound('Payment attempt not found');

    // Idempotent short-circuit: already completed.
    if (attempt.status === 'success') {
      ensurePaidPlan(attempt.targetPlan);
      return { status: 'success', userId: attempt.userId, plan: attempt.targetPlan };
    }

    // Authoritative verify against Paystack.
    const verify = await paystackService.verifyTransaction(reference);
    if (!verify.ok) {
      return { status: 'pending', userId: attempt.userId };
    }
    const paystackStatus = verify.data.status;

    if (paystackStatus !== 'success') {
      await prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status:
            paystackStatus === 'failed' || paystackStatus === 'abandoned'
              ? paystackStatus
              : 'failed',
        },
      });
      return {
        status: paystackStatus === 'abandoned' ? 'abandoned' : 'failed',
        userId: attempt.userId,
      };
    }

    // Sanity check: amount charged matches what we expected.
    if (verify.data.amount !== attempt.amount) {
      await prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'failed' },
      });
      return { status: 'failed', userId: attempt.userId };
    }

    ensurePaidPlan(attempt.targetPlan);
    const pricing = PLAN_PRICING[attempt.targetPlan];
    const currentPeriodEnd = daysFromNow(pricing.cycleDays ?? DEFAULT_CYCLE_DAYS);

    const user = await prisma.user.update({
      where: { id: attempt.userId },
      data: {
        plan: attempt.targetPlan,
        subscriptionStatus: 'active',
        currentPeriodEnd,
        pendingPlan: null,
        paystackCustomerCode:
          verify.data.customer?.customer_code ?? undefined,
      },
    });

    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: 'success' },
    });

    emailService
      .sendSubscriptionReceipt?.({
        to: user.email,
        name: user.name,
        plan: pricing.label,
        amountKobo: verify.data.amount,
        reference,
        currentPeriodEnd,
        businessName: user.businessName || undefined,
      })
      .catch(() => null);

    return { status: 'success', userId: user.id, plan: attempt.targetPlan };
  },

  /** Flag a user as past-due. Called from the `invoice.payment_failed` webhook. */
  async markPastDue(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'past_due' },
    });
    emailService
      .sendPaymentFailed?.({
        to: user.email,
        name: user.name,
        plan:
          PLAN_LABELS[user.plan as keyof typeof PLAN_LABELS] ?? user.plan,
      })
      .catch(() => null);
  },

  /**
   * User-initiated cancellation. Keeps the user on their current tier until
   * the access boundary — `currentPeriodEnd` for active subs, `trialEndsAt`
   * for trials — then the gate silently treats them as Free.
   */
  async cancel(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Err.notFound('User not found');
    if (user.subscriptionStatus === 'free') {
      throw Err.conflict('No active subscription to cancel.');
    }
    // When cancelling a trial, roll trialEndsAt into currentPeriodEnd so the
    // UI + effectivePlan() have a single boundary to reason about.
    const data: { subscriptionStatus: string; currentPeriodEnd?: Date } = {
      subscriptionStatus: 'cancelled',
    };
    if (
      user.subscriptionStatus === 'trialing' &&
      user.trialEndsAt &&
      !user.currentPeriodEnd
    ) {
      data.currentPeriodEnd = user.trialEndsAt;
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
    });
    emailService
      .sendSubscriptionCancelled?.({
        to: updated.email,
        name: updated.name,
        plan:
          PLAN_LABELS[updated.plan as keyof typeof PLAN_LABELS] ?? updated.plan,
        accessUntil: updated.currentPeriodEnd ?? null,
      })
      .catch(() => null);
    return {
      subscriptionStatus: updated.subscriptionStatus,
      currentPeriodEnd: updated.currentPeriodEnd,
    };
  },

  /**
   * Run on every authed page load (cheap — all data is already in memory).
   * If a trial just expired without a payment, downgrade to Free so the
   * gate picks it up on the next write.
   */
  async expireTrialIfNeeded(user: {
    id: string;
    email?: string;
    name?: string;
    plan: string;
    subscriptionStatus: string | null;
    trialEndsAt: Date | null;
  }) {
    if (user.subscriptionStatus !== 'trialing') return;
    if (!user.trialEndsAt) return;
    if (user.trialEndsAt.getTime() > Date.now()) return;

    const planLabel = PLAN_LABELS[user.plan as keyof typeof PLAN_LABELS] ?? user.plan;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'free',
        subscriptionStatus: 'free',
      },
    });

    // Send trial expired email if we have the user's details
    if (user.email && user.name) {
      emailService
        .sendTrialExpired({ to: user.email, name: user.name, plan: planLabel })
        .catch(() => null);
    }
  },

  /**
   * Read current billing state for Settings UI. No side effects.
   */
  async status(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        businessType: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        pendingPlan: true,
      },
    });
    if (!user) throw Err.notFound('User not found');
    return user;
  },

  /**
   * Admin override. Flips a user's plan + status immediately. Logs via
   * AdminNote for audit.
   */
  async adminSetPlan(args: {
    adminId: string;
    userId: string;
    plan: string;
    status?: string;
    reason?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: args.userId } });
    if (!user) throw Err.notFound('User not found');

    let status = args.status;
    if (!status) {
      status = args.plan === 'free' ? 'free' : 'active';
    }

    const data: any = {
      plan: args.plan,
      subscriptionStatus: status,
    };
    // When flipping to a paid plan, set the right time boundary for the
    // lifecycle state. effectivePlan() treats a `trialing` row with a null
    // trialEndsAt as already expired, and an `active` row with a null
    // currentPeriodEnd as already expired — so we must always set them here
    // or the user silently lands on Free.
    if (status === 'active' && args.plan !== 'free') {
      const pricing = isPaidPlan(args.plan) ? PLAN_PRICING[args.plan] : null;
      data.currentPeriodEnd = daysFromNow(pricing?.cycleDays ?? DEFAULT_CYCLE_DAYS);
      data.pendingPlan = null;
    } else if (status === 'trialing' && args.plan !== 'free') {
      // Admin-granted trial — default window = TRIAL_DAYS (14).
      data.trialEndsAt = daysFromNow(TRIAL_DAYS);
      data.pendingPlan = null;
    } else if (args.plan === 'free') {
      data.currentPeriodEnd = null;
      data.trialEndsAt = null;
      data.pendingPlan = null;
    }

    const updated = await prisma.user.update({
      where: { id: args.userId },
      data,
    });

    const note =
      (args.reason ? args.reason + ' — ' : '') +
      `plan set to ${args.plan} (${status})`;
    await prisma.adminNote
      .create({
        data: {
          adminUserId: args.adminId,
          targetUserId: args.userId,
          note,
        },
      })
      .catch(() => null);

    return {
      plan: updated.plan,
      subscriptionStatus: updated.subscriptionStatus,
      currentPeriodEnd: updated.currentPeriodEnd,
    };
  },
};
