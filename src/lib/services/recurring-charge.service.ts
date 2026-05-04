/**
 * Recurring Charge Service — CashTraka
 *
 * Orchestrates automatic installment charges using Paystack's
 * charge_authorization endpoint.
 *
 * Flow:
 * 1. Fetch due installment plans (ACTIVE, reusable auth, nextChargeAt <= now)
 * 2. For each plan:
 *    a. Validate: reusable auth present, plan active, remaining > 0
 *    b. Compute charge amount (min of recurringAmount, remainingAmount)
 *    c. Create pending InstallmentCharge record
 *    d. Generate unique reference
 *    e. Call Paystack charge_authorization
 *    f. Wait for webhook + server-side verification (handled by webhook.service)
 *    g. On any initiation failure: log, increment failure count
 *
 * IMPORTANT: This service only INITIATES charges. Confirmation happens
 * exclusively through webhook → verification → payment-confirmation flow.
 * We never mark a charge as successful from the initiation response alone.
 */

import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { paystackCustomerAdapter } from './paystack-customer.service';
import { installmentService } from './installment.service';
import { ensureProvidersRegistered } from './provider-registry';
import { nairaToKobo } from '@/lib/money';

export type ChargeRunResult = {
  plansEvaluated: number;
  plansCharged: number;
  skipped: number;
  failures: number;
  details: {
    planId: string;
    status: 'charged' | 'skipped' | 'failed';
    reason?: string;
    reference?: string;
    amount?: number;
  }[];
};

function generateReference(planId: string): string {
  const stamp = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString('hex');
  return `inst_${planId.slice(-6)}_${stamp}_${rand}`;
}

export const recurringChargeService = {
  /**
   * Process all due installment plans.
   * Called by the cron endpoint. Idempotent per charge window.
   */
  async runDueCharges(): Promise<ChargeRunResult> {
    ensureProvidersRegistered();

    const result: ChargeRunResult = {
      plansEvaluated: 0,
      plansCharged: 0,
      skipped: 0,
      failures: 0,
      details: [],
    };

    const duePlans = await installmentService.getDuePlans();
    result.plansEvaluated = duePlans.length;

    console.log(`RECURRING_CHARGE_RUN: ${duePlans.length} plans due`);

    for (const plan of duePlans) {
      try {
        const chargeResult = await this.chargePlan(plan);
        result.details.push(chargeResult);
        if (chargeResult.status === 'charged') result.plansCharged++;
        else if (chargeResult.status === 'skipped') result.skipped++;
        else result.failures++;
      } catch (err) {
        result.failures++;
        result.details.push({
          planId: plan.id,
          status: 'failed',
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
        console.error(`RECURRING_CHARGE_ERROR: Plan ${plan.id}`, err);
      }
    }

    console.log(
      `RECURRING_CHARGE_COMPLETE: evaluated=${result.plansEvaluated} ` +
      `charged=${result.plansCharged} skipped=${result.skipped} failed=${result.failures}`
    );

    return result;
  },

  /**
   * Charge a single installment plan.
   */
  async chargePlan(plan: any): Promise<{
    planId: string;
    status: 'charged' | 'skipped' | 'failed';
    reason?: string;
    reference?: string;
    amount?: number;
  }> {
    const planId = plan.id;

    // ── Pre-flight checks ──────────────────────────────────────
    if (plan.status !== 'ACTIVE') {
      return { planId, status: 'skipped', reason: `Plan status is ${plan.status}` };
    }

    if (!plan.paystackAuthorizationCode || !plan.paystackAuthorizationReusable) {
      return { planId, status: 'skipped', reason: 'No reusable authorization' };
    }

    if (plan.remainingAmount <= 0) {
      // Auto-complete stale plans
      await prisma.installmentPlan.update({
        where: { id: planId },
        data: { status: 'COMPLETED', nextChargeAt: null },
      });
      return { planId, status: 'skipped', reason: 'Remaining balance is zero' };
    }

    if (!plan.paystackEmail) {
      return { planId, status: 'skipped', reason: 'Missing customer email for Paystack' };
    }

    // ── Prevent double-charge in same window ──────────────────
    // Check if a PENDING charge already exists for this plan today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existingPending = await prisma.installmentCharge.findFirst({
      where: {
        installmentPlanId: planId,
        status: { in: ['PENDING', 'VERIFICATION_PENDING'] },
        createdAt: { gte: todayStart },
      },
    });
    if (existingPending) {
      return { planId, status: 'skipped', reason: `Pending charge ${existingPending.reference} already exists today` };
    }

    // ── Compute charge amount ─────────────────────────────────
    const chargeAmount = installmentService.computeChargeAmount(plan);
    if (chargeAmount <= 0) {
      return { planId, status: 'skipped', reason: 'Computed charge amount is zero' };
    }

    // ── Create pending charge record BEFORE calling Paystack ──
    const reference = generateReference(planId);

    const charge = await prisma.installmentCharge.create({
      data: {
        installmentPlanId: planId,
        userId: plan.userId,
        amount: chargeAmount,
        amountKobo: nairaToKobo(chargeAmount),
        reference,
        status: 'PENDING',
      },
    });

    console.log(
      `RECURRING_CHARGE_ATTEMPT: Plan ${planId} ref=${reference} ` +
      `amount=${chargeAmount} remaining=${plan.remainingAmount}`
    );

    // ── Call Paystack charge_authorization ─────────────────────
    const chargeResult = await paystackCustomerAdapter.chargeAuthorization({
      authorizationCode: plan.paystackAuthorizationCode,
      email: plan.paystackEmail,
      amount: chargeAmount,
      reference,
      metadata: {
        installment_plan_id: planId,
        installment_charge_id: charge.id,
        customer_name: plan.customerNameSnapshot,
      },
    });

    if (!chargeResult.ok) {
      // Charge initiation failed
      await prisma.installmentCharge.update({
        where: { id: charge.id },
        data: { status: 'FAILED', failureReason: chargeResult.error },
      });

      await installmentService.recordFailedCharge(planId, chargeResult.error);

      console.log(`RECURRING_CHARGE_INITIATION_FAILED: Plan ${planId} ref=${reference} error="${chargeResult.error}"`);

      return {
        planId,
        status: 'failed',
        reason: chargeResult.error,
        reference,
        amount: chargeAmount,
      };
    }

    // Charge initiated — update to VERIFICATION_PENDING.
    // The actual confirmation happens via webhook → webhook.service → payment-confirmation.
    await prisma.installmentCharge.update({
      where: { id: charge.id },
      data: {
        status: 'VERIFICATION_PENDING',
        providerTransactionId: chargeResult.data.transactionId,
      },
    });

    console.log(
      `RECURRING_CHARGE_INITIATED: Plan ${planId} ref=${reference} ` +
      `txId=${chargeResult.data.transactionId} status=${chargeResult.data.status}`
    );

    return {
      planId,
      status: 'charged',
      reference,
      amount: chargeAmount,
    };
  },
};
