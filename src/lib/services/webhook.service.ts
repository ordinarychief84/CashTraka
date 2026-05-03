/**
 * Webhook Service — CashTraka
 *
 * Receives, persists, validates, and routes incoming payment webhooks.
 * Provider-agnostic: uses the PaymentProviderAdapter registry.
 */

import { prisma } from '@/lib/prisma';
import type { PaymentProvider } from './payment-provider.service';
import { paymentProviderService } from './payment-provider.service';
import { paymentConfirmationService } from './payment-confirmation.service';
import { ensureProvidersRegistered } from './provider-registry';

export type WebhookProcessResult = {
  status: 'processed' | 'duplicate' | 'rejected' | 'ignored' | 'failed';
  message: string;
};

export type VerifyAndLogResult =
  | { ok: true; eventId: string; status: 'received' | 'duplicate' | 'ignored' }
  | { ok: false; error: string; code: number };

export const webhookService = {
  /**
   * Phase 1 (synchronous, fast): verify signature, dedupe, log to
   * `WebhookEventLog`. Designed to run in the request hot path so the
   * provider can get a 200 acknowledgement within ~1s. The heavy work
   * (provider verify + payment confirmation + side-effects) happens in
   * `reconcile` which the route calls via `waitUntil`.
   *
   * Returns:
   *   { ok: true, eventId } when the event is logged and ready for
   *     background reconciliation. `status: 'duplicate' | 'ignored'`
   *     means the route should still 200 but skip background work.
   *   { ok: false, error, code } on a hard rejection (bad signature,
   *     bad JSON). The route returns this status code directly.
   */
  async verifyAndLog(
    provider: PaymentProvider,
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<VerifyAndLogResult> {
    ensureProvidersRegistered();
    const adapter = paymentProviderService.get(provider);
    if (!adapter) {
      return { ok: false, error: `Unknown provider: ${provider}`, code: 400 };
    }

    // 1. Validate webhook authenticity
    if (!adapter.verifyWebhookSignature(rawBody, headers)) {
      // Still log for audit — but mark as rejected. Best-effort; if the
      // log write itself fails we still want to reject the request.
      await this.logEvent(provider, 'unknown', null, null, rawBody, 'REJECTED').catch(() => null);
      return { ok: false, error: 'Invalid webhook signature', code: 401 };
    }

    // 2. Parse payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { ok: false, error: 'Invalid JSON payload', code: 400 };
    }

    // 3. Extract event details based on provider
    const { eventType, reference, transactionId } = this.extractEventDetails(provider, payload);

    // 4. Idempotency check — dedupe by provider + reference + eventType
    const existing = await prisma.webhookEventLog.findFirst({
      where: {
        provider,
        eventType,
        reference: reference || undefined,
        verificationStatus: { in: ['VERIFIED', 'PROCESSED', 'DUPLICATE', 'RECEIVED'] },
      },
    });
    if (existing) {
      const dup = await this.logEvent(
        provider, eventType, reference, transactionId, rawBody, 'DUPLICATE',
      );
      return { ok: true, eventId: dup.id, status: 'duplicate' };
    }

    // 5. Log the raw event as RECEIVED — this is the eventId the
    // background `reconcile` step uses.
    const logEntry = await this.logEvent(
      provider, eventType, reference, transactionId, rawBody, 'RECEIVED',
    );

    // 6. Only payment-success events trigger background work.
    if (!this.isPaymentSuccessEvent(provider, eventType)) {
      return { ok: true, eventId: logEntry.id, status: 'ignored' };
    }

    return { ok: true, eventId: logEntry.id, status: 'received' };
  },

  /**
   * Phase 2 (background, heavy): provider-side verify + confirm payment.
   * Idempotent: if the row is already VERIFIED/PROCESSED/DUPLICATE we
   * return early. Errors are surfaced to the caller (the route logs
   * them) — the WebhookEventLog row stays as RECEIVED and a nightly
   * reconciliation cron can pick it up.
   */
  async reconcile(eventId: string): Promise<WebhookProcessResult> {
    ensureProvidersRegistered();
    const log = await prisma.webhookEventLog.findUnique({ where: { id: eventId } });
    if (!log) {
      return { status: 'failed', message: `WebhookEventLog ${eventId} not found` };
    }

    // Idempotency: another worker (or a Paystack retry) already finished this.
    if (log.verificationStatus === 'VERIFIED' || log.verificationStatus === 'PROCESSED') {
      return { status: 'duplicate', message: 'Already reconciled' };
    }
    if (log.verificationStatus === 'DUPLICATE' || log.verificationStatus === 'REJECTED') {
      return { status: 'ignored', message: `Skipping ${log.verificationStatus}` };
    }

    const provider = log.provider as PaymentProvider;
    const adapter = paymentProviderService.get(provider);
    if (!adapter) {
      return { status: 'failed', message: `Unknown provider in log: ${provider}` };
    }

    let payload: any;
    try {
      payload = JSON.parse(log.payload);
    } catch {
      await prisma.webhookEventLog.update({
        where: { id: log.id },
        data: { verificationStatus: 'FAILED', processedAt: new Date() },
      });
      return { status: 'failed', message: 'Stored payload is not valid JSON' };
    }

    const { eventType, reference, transactionId } = this.extractEventDetails(provider, payload);
    if (!this.isPaymentSuccessEvent(provider, eventType)) {
      // Defensive: verifyAndLog already handles this, but keep reconcile self-contained.
      await prisma.webhookEventLog.update({
        where: { id: log.id },
        data: { verificationStatus: 'PROCESSED', processedAt: new Date() },
      });
      return { status: 'ignored', message: `Event type ${eventType} not actionable` };
    }

    const verifyKey = provider === 'FLUTTERWAVE' ? (transactionId || reference!) : reference!;
    if (!verifyKey) {
      await prisma.webhookEventLog.update({
        where: { id: log.id },
        data: { verificationStatus: 'FAILED', processedAt: new Date() },
      });
      return { status: 'failed', message: 'No reference or transaction ID to verify' };
    }

    const verification = await adapter.verifyTransaction(verifyKey);
    if (!verification.ok || !verification.data.success) {
      await prisma.webhookEventLog.update({
        where: { id: log.id },
        data: { verificationStatus: 'FAILED', processedAt: new Date() },
      });
      return { status: 'failed', message: 'Provider verification failed' };
    }

    // Mark VERIFIED before confirmPayment so that a Paystack retry
    // arriving mid-confirmation hits the dedupe branch in verifyAndLog
    // and doesn't try to double-confirm. Payment.externalRef has its
    // own unique-index guard for the worst case.
    await prisma.webhookEventLog.update({
      where: { id: log.id },
      data: { verificationStatus: 'VERIFIED', processedAt: new Date() },
    });

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
      // Don't flip the log row back — confirmPayment is idempotent on
      // Payment.externalRef and a retry will be safe. We do bubble the
      // error so the route's waitUntil can log it loudly.
      throw e;
    }

    return { status: 'processed', message: 'Payment verified and confirmed' };
  },

  /**
   * Backwards-compatible single-shot entry point. Kept so any non-route
   * caller (tests, scripts) keeps working. New webhook routes should
   * use `verifyAndLog` + `reconcile` so the provider gets its 200 fast.
   */
  async processWebhook(
    provider: PaymentProvider,
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<WebhookProcessResult> {
    const stage1 = await this.verifyAndLog(provider, rawBody, headers);
    if (!stage1.ok) {
      return { status: 'rejected', message: stage1.error };
    }
    if (stage1.status === 'duplicate') {
      return { status: 'duplicate', message: 'Event already processed' };
    }
    if (stage1.status === 'ignored') {
      return { status: 'ignored', message: 'Event type not actionable' };
    }
    return this.reconcile(stage1.eventId);
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
        reference,
        transactionId,
        payload,
        verificationStatus,
      },
    });
  },
};