/**
 * Webhook Service — CashTraka
 *
 * Receives, persists, validates, and routes incoming payment webhooks.
 * Provider-agnostic: uses the PaymentProviderAdapter registry.
 */

import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import type { PaymentProvider } from './payment-provider.service';
import { paymentProviderService } from './payment-provider.service';
import { paymentConfirmationService } from './payment-confirmation.service';
import { ensureProvidersRegistered } from './provider-registry';

export type WebhookProcessResult = {
  status: 'processed' | 'duplicate' | 'rejected' | 'ignored' | 'failed';
  message: string;
};

export const webhookService = {
  /**
   * Main entry point for all payment webhooks.
   * 1. Validate signature
   * 2. Log raw event
   * 3. Identify event type
   * 4. Verify with provider
   * 5. Route to payment confirmation
   */
  async processWebhook(
    provider: PaymentProvider,
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<WebhookProcessResult> {
    ensureProvidersRegistered();
    const adapter = paymentProviderService.get(provider);
    if (\!adapter) {
      return { status: 'rejected', message: `Unknown provider: ${provider}` };
    }

    // 1. Validate webhook authenticity
    if (\!adapter.verifyWebhookSignature(rawBody, headers)) {
      // Still log for audit — but mark as rejected
      await this.logEvent(provider, 'unknown', null, null, rawBody, 'REJECTED');
      return { status: 'rejected', message: 'Invalid webhook signature' };
    }

    // 2. Parse payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { status: 'rejected', message: 'Invalid JSON payload' };
    }

    // 3. Extract event details based on provider
    const { eventType, reference, transactionId } = this.extractEventDetails(provider, payload);

    // 4. Idempotency check — dedupe by provider + reference + eventType
    const dedupeKey = `${provider}_${eventType}_${reference || transactionId || ''}`;
    const dedupeHash = createHash('sha256').update(dedupeKey).digest('hex').slice(0, 40);

    const existing = await prisma.webhookEventLog.findFirst({
      where: {
        provider,
        eventType,
        reference: reference || undefined,
        verificationStatus: { in: ['VERIFIED', 'DUPLICATE'] },
      },
    });
    if (existing) {
      await this.logEvent(provider, eventType, reference, transactionId, rawBody, 'DUPLICATE');
      return { status: 'duplicate', message: 'Event already processed' };
    }

    // 5. Log the raw event
    const logEntry = await this.logEvent(
      provider, eventType, reference, transactionId, rawBody, 'RECEIVED',
    );

    // 6. Only process payment success events
    if (\!this.isPaymentSuccessEvent(provider, eventType)) {
      return { status: 'ignored', message: `Event type ${eventType} not actionable` };
    }

    // 7. Verify the transaction with the provider API
    const verifyKey = provider === 'FLUTTERWAVE' ? (transactionId || reference\!) : reference\!;
    if (\!verifyKey) {
      await prisma.webhookEventLog.update({
        where: { id: logEntry.id },
        data: { verificationStatus: 'FAILED', processedAt: new Date() },
      });
      return { status: 'failed', message: 'No reference or transaction ID to verify' };
    }

    const verification = await adapter.verifyTransaction(verifyKey);
    if (\!verification.ok || \!verification.data.success) {
      await prisma.webhookEventLog.update({
        where: { id: logEntry.id },
        data: { verificationStatus: 'FAILED', processedAt: new Date() },
      });
      return { status: 'failed', message: 'Provider verification failed' };
    }

    // 8. Mark as verified
    await prisma.webhookEventLog.update({
      where: { id: logEntry.id },
      data: { verificationStatus: 'VERIFIED', processedAt: new Date() },
    });

    // 9. Route verified payment to confirmation service
    try {
      await paymentConfirmationService.confirmPayment({
        provider,
        reference: verification.data.reference,
        providerTransactionId: verification.data.providerTransactionId,
        amount: verification.data.amount,
        currency: verification.data.currency,
        customerEmail: verification.data.customerEmail,
        metadata: verification.data.metadata,
        paidAt: verification.data.paidAt,
        authorization: verification.data.authorization,
      });
    } catch (e) {
      console.error('PAYMENT_CONFIRM_ERROR:', e);
      // Don't return failure — the webhook was verified, just confirmation had issues
    }

    return { status: 'processed', message: 'Payment verified and confirmed' };
  },

  extractEventDetails(
    provider: PaymentProvider,
    payload: any,
  ): { eventType: string; reference: string | null; transactionId: string | null } {
    if (provider === 'PAYSTACK') {
      return {
        eventType: payload.event || 'unknown',
        reference: payload.data?.reference || null,
        transactionId: payload.data?.id ? String(payload.data.id) : null,
      };
    }
    if (provider === 'FLUTTERWAVE') {
      return {
        eventType: payload.event || 'unknown',
        reference: payload.data?.tx_ref || null,
        transactionId: payload.data?.id ? String(payload.data.id) : null,
      };
    }
    return { eventType: 'unknown', reference: null, transactionId: null };
  },

  isPaymentSuccessEvent(provider: PaymentProvider, eventType: string): boolean {
    if (provider === 'PAYSTACK') return eventType === 'charge.success';
    if (provider === 'FLUTTERWAVE') return eventType === 'charge.completed';
    return false;
  },

  async logEvent(
    provider: PaymentProvider,
    eventType: string,
    reference: string | null,
    transactionId: string | null,
    payload: string,
    verificationStatus: string,
  ) {
    return prisma.webhookEventLog.create({
      data: {
        provider,
        eventType,
        refere