/**
 * Flutterwave Payment Service — CashTraka
 *
 * Handles customer-facing Flutterwave transactions.
 * Implements PaymentProviderAdapter for the provider registry.
 */

import crypto from 'node:crypto';
import type {
  PaymentProviderAdapter,
  InitPaymentArgs,
  InitPaymentResult,
  VerifyPaymentResult,
  ProviderResult,
} from './payment-provider.service';

const BASE = 'https://api.flutterwave.com/v3';

function secretKey(): string | null {
  return process.env.FLUTTERWAVE_SECRET_KEY || null;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit,
): Promise<ProviderResult<T>> {
  const key = secretKey();
  if (\!key) return { ok: false, error: 'not_configured' };
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
    if (\!res.ok || json?.status === 'error') {
      return { ok: false, error: json?.message || `flutterwave_${res.status}`, details: json };
    }
    return { ok: true, data: json.data as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' };
  }
}

export const flutterwaveAdapter: PaymentProviderAdapter = {
  name: 'FLUTTERWAVE',

  isConfigured(): boolean {
    return Boolean(secretKey());
  },

  async initTransaction(args: InitPaymentArgs): Promise<ProviderResult<InitPaymentResult>> {
    const result = await apiRequest<{
      link: string;
    }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: args.reference,
        amount: args.amount,
        currency: 'NGN',
        redirect_url: args.callbackUrl,
        customer: {
          email: args.email,
          name: args.customerName || undefined,
        },
        meta: args.metadata,
        customizations: {
          title: 'CashTraka Payment',
        },
      }),
    });

    if (\!result.ok) return result;
    return {
      ok: true,
      data: {
        authorizationUrl: result.data.link,
        reference: args.reference,
      },
    };
  },

  async verifyTransaction(transactionId: string): Promise<ProviderResult<VerifyPaymentResult>> {
    const result = await apiRequest<{
      status: string;
      tx_ref: string;
      amount: number;
      currency: string;
      id: number;
      customer: { email: string };
      meta?: Record<string, unknown>;
    }>(`/transactions/${encodeURIComponent(transactionId)}/verify`, { method: 'GET' });

    if (\!result.ok) return result;
    const d = result.data;
    return {
      ok: true,
      data: {
        success: d.status === 'successful',
        reference: d.tx_ref,
        amount: d.amount,
        currency: d.currency,
        providerTransactionId: String(d.id),
        customerEmail: d.customer?.email,
        status: d.status,
        metadata: d.meta as Record<string, unknown> | undefined,
      },
    };
  },

  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    const webhookHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    const signature = headers['verif-hash'] || '';
    if (\!webhookHash || \!signature) return false;
    // Flutterwave uses a simple hash comparison
    return signature === webhookHash;
  },
};
