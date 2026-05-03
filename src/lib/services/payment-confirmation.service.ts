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
import { documentAudit } from './document-audit.service';
import { feedbackService } from './feedback.service';

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

    // Check if this is an invoice payment (public-pay flow).
    // Reference is minted as `INV-{last12-of-id}-{ts36}` and metadata
    // carries `{ type: 'invoice_payment', invoiceId, invoiceNumber }`.
    const metadata = (input.metadata ?? {}) as Record<string, unknown>;
    const metaInvoiceId =
      typeof metadata.invoiceId === 'string' ? metadata.invoiceId : null;
    if (metaInvoiceId || reference.startsWith('INV-')) {
      const invoice = metaInvoiceId
        ? await prisma.invoice.findUnique({ where: { id: metaInvoiceId } })
        : null;
      if (invoice) {
        await this.confirmInvoicePayment(invoice, input, now);
        return;
      }
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

    // Auto-generate receipt (non-blocking). Pass through the remaining balance
    // so partial payments render correctly on the public receipt + PDF.
    try {
      const receipt = await receiptService.ensureForPayment(promise.userId, payment.id, {
        source: 'PROMISE',
        balanceRemaining: newRemaining > 0 ? newRemaining : null,
      });
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

    // Best-effort: mint a Service Check feedback link.
    feedbackService
      .maybeCreateAfterPayment(payment.id, promise.userId)
      .catch(() => null);
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
        customerNameSnapshot: paymentRequest.customerName,
        phoneSnapshot: paymentRequest.customerPhone,
        amount: paymentRequest.amount,
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
    if (paymentRequest.customerId) {
      await prisma.customer.update({
        where: { id: paymentRequest.customerId },
        data: {
          totalPaid: { increment: paymentRequest.amount },
          transactionCount: { increment: 1 },
          lastActivityAt: now,
        },
      });
    }

    // Close linked debt if applicable
    if (paymentRequest.debtId) {
      const debt = await prisma.debt.findUnique({ where: { id: paymentRequest.debtId } });
      if (debt) {
        const newAmountPaid = debt.amountPaid + paymentRequest.amount;
        const debtStatus = newAmountPaid >= debt.amountOwed ? 'CLOSED' : 'OPEN';
        await prisma.debt.update({
          where: { id: debt.id },
          data: { amountPaid: newAmountPaid, status: debtStatus },
        });
      }
    }

    // Notification
    await prisma.notification.create({
      data: {
        userId: paymentRequest.userId,
        type: 'info',
        title: 'PayLink payment confirmed',
        message: `${paymentRequest.customerName} paid ₦${paymentRequest.amount.toLocaleString()} via ${provider.toLowerCase()}. Auto-confirmed.`,
        link: `/paylinks`,
      },
    });

    // Auto-generate receipt (non-blocking)
    try {
      const paymentRecord = await prisma.payment.findFirst({
        where: { externalRef: reference, userId: paymentRequest.userId },
        select: { id: true },
      });
      if (paymentRecord) {
        const receipt = await receiptService.ensureForPayment(paymentRequest.userId, paymentRecord.id, { source: 'PAYSTACK' });
        // Send receipt email to customer if we have their email
        if (input.customerEmail && receipt) {
          const user = await prisma.user.findUnique({
            where: { id: paymentRequest.userId },
            select: { businessName: true, name: true },
          });
          const bizName = user?.businessName || user?.name || 'Business';
          await emailService.sendReceipt({
            to: input.customerEmail,
            business: bizName,
            customerName: paymentRequest.customerName,
            receiptNumber: receipt.receiptNumber,
            amount: paymentRequest.amount,
            receiptUrl: `/receipts/${receipt.id}`,
          }).catch(() => null); // Non-fatal
        }
        // Best-effort: mint a Service Check feedback link.
        feedbackService
          .maybeCreateAfterPayment(paymentRecord.id, paymentRequest.userId)
          .catch(() => null);
      }
    } catch {
      // Receipt generation is non-fatal — don't fail the confirmation
    }
  },

  /**
   * Confirm a recurring installment charge.
   * Uses a database transaction for atomicity.
   */
  async confirmInstallmentCharge(
    charge: any,
    input: ConfirmPaymentInput,
    now: Date,
  ): Promise<void> {
    const { provider, reference, providerTransactionId, amount } = input;
    const plan = charge.installmentPlan;

    // Idempotency: already confirmed
    if (charge.status === 'SUCCESS') {
      console.log(`INSTALLMENT_CONFIRM: Charge ${charge.id} already confirmed — skipping`);
      return;
    }

    // Validate amount matches expected charge amount (5% tolerance for fees)
    if (amount < charge.amount * 0.95) {
      console.warn(
        `INSTALLMENT_CONFIRM: Amount mismatch for ${reference}. ` +
        `Expected ~${charge.amount}, got ${amount}. Proceeding with provider amount.`
      );
    }

    // Use the actual charged amount, not the expected — provider is authoritative
    const confirmedAmount = charge.amount;

    // ── Transactional update of all related records ──────────
    const payment = await prisma.$transaction(async (tx) => {
      // 1. Mark the InstallmentCharge as successful
      await tx.installmentCharge.update({
        where: { id: charge.id },
        data: {
          status: 'SUCCESS',
          providerTransactionId,
          verifiedAt: now,
          paidAt: now,
        },
      });

      // 2. Create Payment record
      const paymentRecord = await tx.payment.create({
        data: {
          userId: plan.userId,
          customerId: plan.customerId || '',
          customerNameSnapshot: plan.customerNameSnapshot,
          phoneSnapshot: plan.phoneSnapshot,
          amount: confirmedAmount,
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

      // 3. Link payment to the charge
      await tx.installmentCharge.update({
        where: { id: charge.id },
        data: { paymentId: paymentRecord.id },
      });

      // 4. Update linked PromiseToPay if applicable
      if (plan.promiseToPayId) {
        const promise = await tx.promiseToPay.findUnique({ where: { id: plan.promiseToPayId } });
        if (promise) {
          const newRemaining = Math.max(0, promise.remainingAmount - confirmedAmount);
          const newStatus = newRemaining === 0 ? 'PAID' : 'PARTIALLY_PAID';
          await tx.promiseToPay.update({
            where: { id: promise.id },
            data: {
              remainingAmount: newRemaining,
              status: newStatus,
              lastActionAt: now,
            },
          });
        }
      }

      // 5. Update linked Debt if applicable
      if (plan.debtId) {
        const debt = await tx.debt.findUnique({ where: { id: plan.debtId } });
        if (debt) {
          const newAmountPaid = debt.amountPaid + confirmedAmount;
          const debtStatus = newAmountPaid >= debt.amountOwed ? 'CLOSED' : 'OPEN';
          await tx.debt.update({
            where: { id: debt.id },
            data: { amountPaid: newAmountPaid, status: debtStatus },
          });
        }
      }

      // 6. Update customer metrics
      if (plan.customerId) {
        await tx.customer.update({
          where: { id: plan.customerId },
          data: {
            totalPaid: { increment: confirmedAmount },
            transactionCount: { increment: 1 },
            lastActivityAt: now,
          },
        });
      }

      return paymentRecord;
    });

    // ── Post-transaction: update installment plan ────────────
    const { completed, remaining: planRemaining } = await installmentService.recordSuccessfulCharge(plan.id, confirmedAmount);

    // ── Notification ─────────────────────────────────────────
    await prisma.notification.create({
      data: {
        userId: plan.userId,
        type: 'info',
        title: completed ? 'Installment plan completed' : 'Installment payment received',
        message: completed
          ? `${plan.customerNameSnapshot}'s installment plan is fully paid. ₦${confirmedAmount.toLocaleString()} auto-collected via ${provider.toLowerCase()}.`
          : `₦${confirmedAmount.toLocaleString()} auto-collected from ${plan.customerNameSnapshot} via ${provider.toLowerCase()}.`,
        link: `/installments/${plan.id}`,
      },
    });

    // ── Receipt generation (non-blocking) ────────────────────
    try {
      const receipt = await receiptService.ensureForPayment(plan.userId, payment.id, {
        source: 'INSTALLMENT',
        balanceRemaining: planRemaining > 0 ? planRemaining : null,
      });

      // Link receipt to the charge
      if (receipt) {
        await prisma.installmentCharge.update({
          where: { id: charge.id },
          data: { receiptId: receipt.id },
        }).catch(() => null);
      }

      if (input.customerEmail && receipt) {
        const user = await prisma.user.findUnique({
          where: { id: plan.userId },
          select: { businessName: true, name: true },
        });
        const bizName = user?.businessName || user?.name || 'Business';
        await emailService.sendReceipt({
          to: input.customerEmail,
          business: bizName,
          customerName: plan.customerNameSnapshot,
          receiptNumber: receipt.receiptNumber,
          amount: confirmedAmount,
          receiptUrl: `/receipts/${receipt.id}`,
        }).catch(() => null);
      }
    } catch {
      // Non-fatal
    }

    // Best-effort: mint a Service Check feedback link.
    feedbackService
      .maybeCreateAfterPayment(payment.id, plan.userId)
      .catch(() => null);

    console.log(
      `INSTALLMENT_CONFIRMED: Charge ${charge.id} plan=${plan.id} ` +
      `amount=${confirmedAmount} completed=${completed} ref=${reference}`
    );
  },

  /**
   * Confirm a public-pay invoice payment (customer paying via /invoice/[token]).
   * The reference is minted by /api/invoices/[id]/pay; metadata carries invoiceId.
   */
  async confirmInvoicePayment(
    invoice: any,
    input: ConfirmPaymentInput,
    now: Date,
  ): Promise<void> {
    const { provider, reference, providerTransactionId, amount } = input;

    // Idempotency: bail if a Payment with this externalRef already exists for this user.
    const existingPayment = await prisma.payment.findFirst({
      where: { externalRef: reference, userId: invoice.userId },
      select: { id: true },
    });
    if (existingPayment) {
      console.log(`INVOICE_CONFIRM: Reference ${reference} already processed — skipping`);
      return;
    }

    // `amount` arrives in Naira (provider adapters divide kobo by 100 — see
    // paystack-customer.service.ts:116). Use directly.
    const paidAmount = amount;

    const { payment, finalStatus } = await prisma.$transaction(async (tx) => {
      // Re-read invoice in tx for fresh amountPaid / total
      const fresh = await tx.invoice.findUnique({ where: { id: invoice.id } });
      if (!fresh) throw new Error('Invoice not found in tx');

      const newAmountPaid = fresh.amountPaid + paidAmount;
      let nextStatus = fresh.status;
      let paidAt: Date | null = fresh.paidAt;
      if (newAmountPaid >= fresh.total && fresh.total > 0) {
        nextStatus = 'PAID';
        paidAt = now;
      } else if (newAmountPaid > 0 && newAmountPaid < fresh.total) {
        nextStatus = 'PARTIALLY_PAID';
      }

      await tx.invoice.update({
        where: { id: fresh.id },
        data: {
          amountPaid: newAmountPaid,
          status: nextStatus,
          paidAt,
        },
      });

      const paymentRecord = await tx.payment.create({
        data: {
          userId: fresh.userId,
          customerId: fresh.customerId || '',
          customerNameSnapshot: fresh.customerName,
          phoneSnapshot: fresh.customerPhone,
          amount: paidAmount,
          status: 'PAID',
          verified: true,
          verifiedAt: now,
          verificationMethod: 'PROVIDER_WEBHOOK',
          externalRef: reference,
          provider,
          providerTransactionId,
          confirmedAutomatically: true,
          confirmedAt: now,
          // Link payment to its source invoice for receipt rendering.
          invoiceId: fresh.id,
        },
      });

      // Update customer metrics
      if (fresh.customerId) {
        await tx.customer.update({
          where: { id: fresh.customerId },
          data: {
            totalPaid: { increment: paidAmount },
            transactionCount: { increment: 1 },
            lastActivityAt: now,
          },
        });
      }

      return { payment: paymentRecord, finalStatus: nextStatus };
    });

    // Receipt generation (non-blocking)
    try {
      const receipt = await receiptService.ensureForPayment(invoice.userId, payment.id, {
        source: 'PAYSTACK',
      });
      if (invoice.customerEmail && receipt) {
        const user = await prisma.user.findUnique({
          where: { id: invoice.userId },
          select: { businessName: true, name: true },
        });
        const bizName = user?.businessName || user?.name || 'Business';
        await emailService
          .sendReceipt({
            to: invoice.customerEmail,
            business: bizName,
            customerName: invoice.customerName,
            receiptNumber: receipt.receiptNumber,
            amount: paidAmount,
            receiptUrl: `/receipts/${receipt.id}`,
          })
          .catch(() => null);
      }
    } catch {
      // Non-fatal
    }

    // Notification for the seller
    await prisma.notification
      .create({
        data: {
          userId: invoice.userId,
          type: 'info',
          title: finalStatus === 'PAID' ? 'Invoice paid' : 'Invoice partially paid',
          message: `${invoice.customerName} paid ₦${paidAmount.toLocaleString()} on invoice ${invoice.invoiceNumber} via ${provider.toLowerCase()}.`,
          link: `/invoices/${invoice.id}`,
        },
      })
      .catch(() => null);

    // Audit log (awaited per FIX 5)
    await documentAudit.log({
      userId: invoice.userId,
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: finalStatus === 'PAID' ? 'PAID' : 'PARTIALLY_PAID',
      metadata: {
        paymentId: payment.id,
        reference,
        amountKobo: paidAmount * 100,
      },
    });

    // Best-effort: mint a Service Check feedback link. We mint one for the
    // payment itself, plus a separate one tied to the invoice when it just
    // flipped to PAID.
    feedbackService
      .maybeCreateAfterPayment(payment.id, invoice.userId)
      .catch(() => null);
    if (finalStatus === 'PAID') {
      feedbackService
        .maybeCreateAfterInvoicePaid(invoice.id, invoice.userId)
        .catch(() => null);
    }

    console.log(
      `INVOICE_CONFIRMED: invoice=${invoice.id} ref=${reference} ` +
        `amount=${paidAmount} status=${finalStatus}`,
    );
  },

  /**
   * Store authorization data from a first successful payment.
   * Called after any confirmed payment where Paystack returns a reusable authorization.
   * Does NOT create an installment plan — that's done explicitly by the user or business logic.
   */
  async storeAuthorizationIfReusable(
    input: ConfirmPaymentInput & { userId: string },
  ): Promise<void> {
    if (!input.authorization || !input.authorization.reusable) return;
    if (input.provider !== 'PAYSTACK') return; // Only Paystack supports recurring via auth code

    console.log(
      `AUTH_STORED: Reusable authorization available for user ${input.userId} ` +
      `ref=${input.reference} last4=${input.authorization.last4 || '****'}`
    );
    // Authorization data is passed to the caller (webhook.service / promise service)
    // which decides whether to create an installment plan.
    // We don't auto-create plans — the business user must opt in.
  },
};
