/**
 * Paystack Customer Payment Service — CashTraka
 *
 * Handles customer-facing Paystack transactions (not billing/subscriptions).
 * Implements the PaymentProviderAdapter interface for the provider registry.
 */

import crypto from 'node:crypto';
import type {
  PaymentProviderAdapter,
  InitPaymentArgs,
  InitPaymentResult,
  VerifyPaymentResult,
  ProviderResult,
  ChargeAuthorizationArgs,
} from './payment-provider.service';

const BASE = 'https://api.paystack.co';

function secretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit,
): Promise<ProviderResult<T>> {
  const key = secretKey();
  if (!key) return { ok: false, error: 'not_configured' };
  try {
    const res = await fetch(BASE + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || json?.status === false) {
      return { ok: false, error: json?.message || `paystack_${res.status}`, details: json };
    }
    return { ok: true, data: json.data as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' };
  }
}

export const paystackCustomerAdapter: PaymentProviderAdapter = {
  name: 'PAYSTACK',

  isConfigured(): boolean {
    return Boolean(secretKey());
  },

  async initTransaction(args: InitPaymentArgs): Promise<ProviderResult<InitPaymentResult>> {
    const result = await apiRequest<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: args.email,
        amount: args.amount * 100, // Naira → kobo
        reference: args.reference,
        callback_url: args.callbackUrl,
        metadata: {
          ...args.metadata,
          customer_name: args.customerName,
        },
      }),
    });

    if (!result.ok) return result;
    return {
      ok: true,
      data: {
        authorizationUrl: result.data.authorization_url,
        reference: result.data.reference,
        accessCode: result.data.access_code,
      },
    };
  },

  async verifyTransaction(reference: string): Promise<ProviderResult<VerifyPaymentResult>> {
    const result = await apiRequest<{
      status: string;
      reference: string;
      amount: number;
      currency: string;
      id: number;
      paid_at?: string;
      customer: { email: string; customer_code?: string };
      authorization?: {
        authorization_code: string;
        reusable: boolean;
        bin?: string;
        last4?: string;
        bank?: string;
        channel?: string;
        card_type?: string;
        exp_month?: string;
        exp_year?: string;
      };
      metadata?: Record<string, unknown>;
    }>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });

    if (!result.ok) return result;
    const d = result.data;
    const authData = d.authorization;
    return {
      ok: true,
      data: {
        success: d.status === 'success',
        reference: d.reference,
        amount: d.amount / 100, // kobo → Naira
        currency: d.currency,
        providerTransactionId: String(d.id),
        customerEmail: d.customer?.email,
        status: d.status,
        metadata: d.metadata,
        paidAt: d.paid_at,
        authorization: authData
          ? {
              authorizationCode: authData.authorization_code,
              reusable: authData.reusable,
              bin: authData.bin,
              last4: authData.last4,
              bank: authData.bank,
              channel: authData.channel,
              cardType: authData.card_type,
              expMonth: authData.exp_month,
              expYear: authData.exp_year,
              customerCode: d.customer?.customer_code,
            }
          : undefined,
      },
    };
  },

  /**
   * Off-session charge against a previously-stored card authorization.
   * Used by recurring invoices and installment plans where the customer
   * already paid once via /transaction/initialize and Paystack returned
   * a reusable authorization_code in the verify response.
   *
   * If Paystack rejects the charge (card declined, insufficient funds,
   * authorization revoked), the result is { ok: false, error } and the
   * caller should mark the corresponding charge attempt as FAILED.
   */
  async chargeAuthorization(args: ChargeAuthorizationArgs): Promise<ProviderResult<VerifyPaymentResult>> {
    const result = await apiRequest<{
      status: string;
      reference: string;
      amount: number;
      currency: string;
      id: number;
      paid_at?: string;
      customer?: { email: string; customer_code?: string };
      authorization?: {
        authorization_code: string;
        reusable: boolean;
      };
      metadata?: Record<string, unknown>;
    }>('/transaction/charge_authorization', {
      method: 'POST',
      body: JSON.stringify({
        authorization_code: args.authorizationCode,
        email: args.email,
        amount: args.amount * 100, // Naira → kobo
        reference: args.reference,
        metadata: args.metadata,
      }),
    });

    if (!result.ok) return result;
    const d = result.data;
    return {
      ok: true,
      data: {
        success: d.status === 'success',
        reference: d.reference,
        amount: d.amount / 100,
        currency: d.currency,
        providerTransactionId: String(d.id),
        customerEmail: d.customer?.email,
        status: d.status,
        metadata: d.metadata,
        paidAt: d.paid_at,
        authorization: d.authorization
          ? {
              authorizationCode: d.authorization.authorization_code,
              reusable: d.authorization.reusable,
              customerCode: d.customer?.customer_code,
            }
          : undefined,
      },
    };
  },

  // Paystack signs with the per-webhook secret from the dashboard, configured as PAYSTACK_WEBHOOK_SECRET.
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    const sec = process.env.PAYSTACK_WEBHOOK_SECRET;
    const sig = headers['x-paystack-signature'] || headers['X-Paystack-Signature'];
    if (!sec || !sig) return false;
    const expected = crypto
      .createHmac('sha512', sec)
      .update(rawBody)
      .digest('hex');
    // Constant-time compare. timingSafeEqual throws on length mismatch,
    // so wrap defensively: different lengths just mean "no match".
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(sig, 'hex'),
      );
    } catch {
      return false;
    }
  },
};