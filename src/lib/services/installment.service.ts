/**
 * Installment Service — CashTraka
 *
 * Manages installment plans for recurring auto-debit via Paystack authorization.
 *
 * Responsibilities:
 * - Create installment plan from a first successful payment with reusable auth
 * - Calculate next charge date and amount
 * - Track remaining balance and completed installments
 * - Transition plan states (ACTIVE → COMPLETED, FAILED, CANCELLED)
 * - Prevent overcharging beyond remaining balance
 * - Surface failed plans to collection queue
 */

import { prisma } from '@/lib/prisma';
import { nairaToKobo } from '@/lib/money';

export type InstallmentInterval = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

const VALID_INTERVALS: InstallmentInterval[] = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];

export type CreateInstallmentPlanInput = {
  userId: string;
  promiseToPayId?: string;
  debtId?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  initialAmount?: number; // first payment already made
  recurringAmount: number;
  interval: InstallmentInterval;
  totalInstallments?: number; // null = charge until cleared
  paystackAuthorizationCode: string;
  paystackAuthorizationReusable: boolean;
  paystackCustomerCode?: string;
  paystackEmail: string;
};

function computeNextChargeDate(from: Date, interval: InstallmentInterval): Date {
  const next = new Date(from);
  switch (interval) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

export const installmentService = {
  /**
   * Create an installment plan after a first successful payment with reusable auth.
   * Validates all inputs before creation.
   */
  async create(input: CreateInstallmentPlanInput) {
    // ── Validation ──────────────────────────────────────────────
    if (!input.paystackAuthorizationReusable) {
      throw new Error('INSTALLMENT_CREATE: Authorization is not reusable — cannot create plan');
    }
    if (!input.paystackAuthorizationCode) {
      throw new Error('INSTALLMENT_CREATE: Missing authorization code');
    }
    if (!VALID_INTERVALS.includes(input.interval)) {
      throw new Error(`INSTALLMENT_CREATE: Invalid interval "${input.interval}"`);
    }
    if (input.recurringAmount <= 0) {
      throw new Error('INSTALLMENT_CREATE: recurringAmount must be greater than zero');
    }
    if (input.totalAmount <= 0) {
      throw new Error('INSTALLMENT_CREATE: totalAmount must be greater than zero');
    }

    const initialPaid = input.initialAmount ?? 0;
    const remainingAmount = Math.max(0, input.totalAmount - initialPaid);

    if (remainingAmount <= 0) {
      throw new Error('INSTALLMENT_CREATE: No remaining amount to charge — balance already cleared');
    }

    if (input.recurringAmount > remainingAmount && !input.totalInstallments) {
      // Auto-adjust: single remaining charge at the remaining amount
      // This is fine — the charge service will cap at remainingAmount
    }

    const nextChargeAt = computeNextChargeDate(new Date(), input.interval);

    const plan = await prisma.installmentPlan.create({
      data: {
        userId: input.userId,
        promiseToPayId: input.promiseToPayId,
        debtId: input.debtId,
        customerId: input.customerId,
        customerNameSnapshot: input.customerName,
        phoneSnapshot: input.customerPhone,
        totalAmount: input.totalAmount,
        remainingAmount,
        initialAmount: input.initialAmount,
        recurringAmount: input.recurringAmount,
        totalAmountKobo: nairaToKobo(input.totalAmount),
        remainingAmountKobo: nairaToKobo(remainingAmount),
        initialAmountKobo:
          input.initialAmount == null ? null : nairaToKobo(input.initialAmount),
        recurringAmountKobo: nairaToKobo(input.recurringAmount),
        interval: input.interval,
        totalInstallments: input.totalInstallments,
        completedInstallments: initialPaid > 0 ? 1 : 0,
        nextChargeAt,
        status: 'ACTIVE',
        paystackAuthorizationCode: input.paystackAuthorizationCode,
        paystackAuthorizationReusable: true,
        paystackCustomerCode: input.paystackCustomerCode,
        paystackEmail: input.paystackEmail,
      },
    });

    console.log(`INSTALLMENT_CREATED: Plan ${plan.id} for user ${input.userId}, ` +
      `total=${input.totalAmount} remaining=${remainingAmount} recurring=${input.recurringAmount} ` +
      `interval=${input.interval} nextCharge=${nextChargeAt.toISOString()}`);

    return plan;
  },

  /**
   * Compute the actual charge amount for the next installment.
   * Caps at remaining balance to prevent overcharging.
   */
  computeChargeAmount(plan: { recurringAmount: number; remainingAmount: number }): number {
    if (plan.remainingAmount <= 0) return 0;
    return Math.min(plan.recurringAmount, plan.remainingAmount);
  },

  /**
   * Update plan after a successful charge.
   * Transitions to COMPLETED if remaining balance is zero.
   */
  async recordSuccessfulCharge(
    planId: string,
    chargedAmount: number,
  ): Promise<{ completed: boolean; remaining: number }> {
    const plan = await prisma.installmentPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error(`INSTALLMENT: Plan ${planId} not found`);

    const newRemaining = Math.max(0, plan.remainingAmount - chargedAmount);
    const completed = newRemaining === 0;
    const newCompletedCount = plan.completedInstallments + 1;
    const now = new Date();

    // Check if we've hit totalInstallments limit
    const reachedLimit = plan.totalInstallments != null && newCompletedCount >= plan.totalInstallments;
    const isFinished = completed || reachedLimit;

    await prisma.installmentPlan.update({
      where: { id: planId },
      data: {
        remainingAmount: newRemaining,
        remainingAmountKobo: nairaToKobo(newRemaining),
        completedInstallments: newCompletedCount,
        lastChargedAt: now,
        failedAttempts: 0, // reset on success
        lastFailureReason: null,
        status: isFinished ? 'COMPLETED' : 'ACTIVE',
        nextChargeAt: isFinished ? null : computeNextChargeDate(now, plan.interval as InstallmentInterval),
      },
    });

    console.log(`INSTALLMENT_CHARGED: Plan ${planId} charged=${chargedAmount} ` +
      `remaining=${newRemaining} completed=${isFinished ? 'YES' : 'NO'}`);

    return { completed: isFinished, remaining: newRemaining };
  },

  /**
   * Record a failed charge attempt. After 3 consecutive failures, pause the plan.
   */
  async recordFailedCharge(planId: string, reason: string): Promise<void> {
    const plan = await prisma.installmentPlan.findUnique({ where: { id: planId } });
    if (!plan) return;

    const newFailedAttempts = plan.failedAttempts + 1;
    const shouldPause = newFailedAttempts >= 3;

    await prisma.installmentPlan.update({
      where: { id: planId },
      data: {
        failedAttempts: newFailedAttempts,
        lastFailureReason: reason,
        status: shouldPause ? 'FAILED' : plan.status,
        // Push next charge by one interval even on failure
        nextChargeAt: shouldPause ? null : computeNextChargeDate(new Date(), plan.interval as InstallmentInterval),
      },
    });

    console.log(`INSTALLMENT_FAILED: Plan ${planId} attempt=${newFailedAttempts} ` +
      `reason="${reason}" paused=${shouldPause}`);
  },

  /**
   * Cancel an active installment plan.
   */
  async cancel(planId: string, userId: string): Promise<void> {
    const plan = await prisma.installmentPlan.findFirst({
      where: { id: planId, userId },
    });
    if (!plan) throw new Error('Installment plan not found');
    if (plan.status === 'COMPLETED' || plan.status === 'CANCELLED') {
      throw new Error(`Cannot cancel plan in ${plan.status} state`);
    }

    await prisma.installmentPlan.update({
      where: { id: planId },
      data: { status: 'CANCELLED', nextChargeAt: null },
    });

    console.log(`INSTALLMENT_CANCELLED: Plan ${planId}`);
  },

  /**
   * Fetch all plans due for charging.
   * Only returns ACTIVE plans with reusable authorization and nextChargeAt <= now.
   */
  async getDuePlans(): Promise<any[]> {
    const now = new Date();
    return prisma.installmentPlan.findMany({
      where: {
        status: 'ACTIVE',
        paystackAuthorizationReusable: true,
        paystackAuthorizationCode: { not: null },
        nextChargeAt: { lte: now },
        remainingAmount: { gt: 0 },
      },
      orderBy: { nextChargeAt: 'asc' },
    });
  },

  /**
   * Get active/failed plans for a user — used in dashboard and collection queue.
   */
  async listForUser(userId: string, statuses?: string[]): Promise<any[]> {
    return prisma.installmentPlan.findMany({
      where: {
        userId,
        status: { in: statuses || ['ACTIVE', 'FAILED', 'PAUSED'] },
      },
      include: {
        charges: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  /**
   * Get a single plan with its charge history.
   */
  async getById(planId: string, userId: string) {
    return prisma.installmentPlan.findFirst({
      where: { id: planId, userId },
      include: {
        charges: { orderBy: { createdAt: 'desc' } },
      },
    });
  },
};
