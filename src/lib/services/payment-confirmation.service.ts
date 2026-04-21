/**
 * Payment Confirmation Service — CashTraka
 *
 * The single source of truth for confirming verified payments.
 * Called by webhook.service after provider verification succeeds.
 *
 * Responsibilities:
 * - Map verified provider result to internal records
 * - Update PromiseToPay / PaymentRequest / Debt / Payment
 * - Generate receipts
 * - Trigger notifications
 * - Update customer metrics
 * - Idempotent: safe to call multiple times for the same reference
 */

import { prisma } from '@/lib/prisma';
import type { PaymentProvider } from './payment-provider.service';
import type { VerifyPaymentResult } from './payment-provider.service';
import { receiptService } from './receipt.service';
import { emailService } from './email.service';
import { installmentService } from './installment.service';

export type ConfirmPaymentInput = {
  provider: PaymentProvider;
  reference: string;
  providerTransactionId: string;
  amount: number; // Naira
  currency: string;
  customerEmail?: string;
  metadata?: Record<string, unknown>;
  paidAt?: string;
  authorization?: VerifyPaymentResult['authorization'];
};

export const paymentConfirmationService = {
  async confirmPayment(input: ConfirmPaymentInput): Promise<void> {
    const { provider, reference, providerTransactionId, amount } = input;
    const now = new Date();

    // Check if this reference is tied to an InstallmentCharge (recurring auto-debit)
    const installmentCharge = await prisma.installmentCharge.findFirst({
      where: { reference, status: { in: ['PENDING', 'VERIFICATION_PENDING'] } },
      include: { installmentPlan: true },
    });

    if (installmentCharge) {
      await this.confirmInstallmentCharge(installmentCharge, input, now);
      return;
    }

    // Check if this reference is tied to a PromisePayment
    const promisePayment = await prisma.promisePayment.findFirst({
      where: { providerReference: reference, status: 'PENDING' },
      include: { promiseToPay: true },
    });

    if (promisePayment) {
      await this.confirmPromisePayment(promisePayment, input, now);
      return;
    }

    // Check if this reference is tied to a PaymentRequest
    const paymentRequest = await prisma.paymentRequest.findFirst({
      where: { externalRef: reference },
    });

    if (paymentRequest) {
      await this.confirmPaymentRequest(paymentRequest, input, now);
      return;
    }

    // No matching internal record — log but don't fail
    console.warn(`PAYMENT_CONFIRM: No matching record for reference ${reference}`);
  },

  async confirmPromisePayment(
    promisePayment: any,
    input: ConfirmPaymentInput,
    now: Date,
  ): Promise<void> {
    const { provider, reference, providerTransactionId, amount } = input;
    const promise = promisePayment.promiseToPay;

    // Idempotency: already confirmed
    if (promisePayment.status === 'SUCCESS') return;

    // Validate amount matches (allow small tolerance for fees)
    // Provider amount should be >= payment amount recorded
    if (amount < promisePayment.amount * 0.95) {
      console.warn(`PAYMENT_CONFIRM: Amount mismatch for ${reference}. Expected ~${promisePayment.amount}, got ${amount}`);
      // Still process — amount from provider is authoritative
    }

    // Update the PromisePayment record
    await prisma.promisePayment.update({
      where: { id: promisePayment.id },
      data: {
        status: 'SUCCESS',
        providerTransactionId,
        verifiedAt: now,
        paidAt: now,
        rawWebhookStored: true,
      },
    });

    // Calculate new remaining amount
    const newRemaining = Math.max(0, promise.remainingAmount - promisePayment.amount);
    const newStatus = newRemaining === 0 ? 'PAID' : 'PARTIALLY_PAID';

    // Update the PromiseToPay record
    await prisma.promiseToPay.update({
      where: { id: promise.id },
      data: {
        remainingAmount: newRemaining,
        status: newStatus,
        lastActionAt: now,
      },
    });

    // If there's a linked debt, update it
    if (promise.debtId) {
      const debt = await prisma.debt.findUnique({ where: { id: promise.debtId } });
      if (debt) {
        const newAmountPaid = debt.amountPaid + promisePayment.amount;
        const debtStatus = newAmountPaid >= debt.amountOwed ? 'CLOSED' : 'OPEN';
        await prisma.debt.update({
          where: { id: debt.id },
          data: { amountPaid: newAmountPaid, status: debtStatus },
        });
      }
    }

    // Create a Payment record for the business owner
    const payment = await prisma.payment.create({
      data: {
        userId: promise.userId,
        customerId: promise.customerId || '',
        customerNameSnapshot: promise.customerNameSnapshot,
        phoneSnapshot: promise.phoneSnapshot,
        amount: promisePayment.amount,
        status: 'PAID',
        verified: true,
        verifiedAt: now,
        verificationMethod: 'PROVIDER_WEBHOOK',
        externalRef: reference,
        provider,
        providerTransactionId,
        confirmedAutomatically: true,
        confirmedAt: now,
      },
    });

    // Update customer metrics
    if (promise.customerId) {
      await prisma.customer.update({
        where: { id: promise.customerId },
        data: {
          totalPaid: { increment: promisePayment.amount },
          transactionCount: { increment: 1 },
          lastActivityAt: now,
        },
      });
    }

    // Create notification for the business owner
    await prisma.notification.create({
      data: {
        userId: promise.userId,
        type: 'info',
        title: 'Payment received',
        message: `${promise.customerNameSnapshot} paid ₦${promisePayment.amount.toLocaleString()} via ${provider.toLowerCase()}. Auto-confirmed.`,
        link: `/promises/${promise.id}`,
      },
    });

    // Auto-generate receipt (non-blocking)
    try {
      const receipt = await receiptService.ensureForPayment(promise.userId, payment.id);
      // Send receipt email to customer if we have their email
      if (input.customerEmail && receipt) {
        const user = await prisma.user.findUnique({
          where: { id: promise.userId },
          select: { businessName: true, name: true },
        });
        const bizName = user?.businessName || user?.name || 'Business';
        await emailService.sendReceipt({
          to: input.customerEmail,
          business: bizName,
          customerName: promise.customerNameSnapshot,
          receiptNumber: receipt.receiptNumber,
          amount: promisePayment.amount,
          receiptUrl: `/receipts/${receipt.id}`,
        }).catch(() => null); // Non-fatal
      }
    } catch {
      // Receipt generation is non-fatal — don't fail the confirmation
    }
  },

  async confirmPaymentRequest(
    paymentRequest: any,
    input: ConfirmPaymentInput,
    now: Date,
  ): Promise<void> {
    const { provider, reference, providerTransactionId, amount } = input;

    // Idempotency: already confirmed
    if (paymentRequest.paymentStatus === 'SUCCESS' || paymentRequest.status === 'confirmed') return;

    // Update the PaymentRequest
    await prisma.paymentRequest.update({
      where: { id: paymentRequest.id },
      data: {
        status: 'confirmed',
        confirmedAt: now,
        paymentStatus: 'SUCCESS',
        webhookVerifiedAt: now,
        provider,
        externalRef: reference,
      },
    });

    // Create a Payment record for the business owner
    await prisma.payment.create({
      data: {
        userId: paymentRequest.userId,
        customerId: paymentRequest.customerId || '',
