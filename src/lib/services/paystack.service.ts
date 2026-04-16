import crypto from 'node:crypto';

/**
 * Minimal Paystack REST client. No SDK dependency — `fetch` only. Every method
 * is resilient: if `PAYSTACK_SECRET_KEY` is unset, the call returns
 * `{ ok: false, error: 'not_configured' }` so the app keeps running in dev.
 *
 * Env vars:
 *   PAYSTACK_SECRET_KEY     sk_test_... / sk_live_...
 *   PAYSTACK_PUBLIC_KEY     pk_test_... (client-side only, not needed server-side)
 *   PAYSTACK_WEBHOOK_SECRET webhook-signing secret for HMAC verification
 */

const BASE = 'https://api.paystack.co';

export type PaystackResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: unknown };

function secret(): string | null {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

async function request<T>(
  path: string,
  init: RequestInit,
): Promise<PaystackResult<T>> {
  const key = secret();
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
      return {
        ok: false,
        error: json?.message || `paystack_${res.status}`,
        details: json,
      };
    }
    return { ok: true, data: json.data as T };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'network_error',
    };
  }
}

type InitTxResponse = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export const paystackService = {
  /**
   * Initialize a hosted checkout. Returns an authorization_url we redirect to.
   */
  initTransaction(args: {
    email: string;
    amountKobo: number;
    reference: string;
    callbackUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaystackResult<InitTxResponse>> {
    return request<InitTxResponse>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: args.email,
        amount: args.amountKobo,
        reference: args.reference,
        callback_url: args.callbackUrl,
        metadata: args.metadata,
      }),
    });
  },

  /**
   * Authoritative check on a transaction outcome. Called from the webhook
   * handler AND the /billing/verify callback — whichever arrives first
   * finalises the upgrade; the other becomes a no-op.
   */
  verifyTransaction(reference: string): Promise<
    PaystackResult<{
      status: string; // "success" | "failed" | "abandoned"
      reference: string;
      amount: number;
      currency: string;
      customer: { email: string; customer_code: string };
      metadata?: Record<string, unknown>;
    }>
  > {
    return request(`/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
    });
  },

  /**
   * Verify a Paystack webhook signature. Paystack signs the raw request body
   * with HMAC-SHA512 using the webhook secret and puts the hex digest in the
   * `x-paystack-signature` header.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const sec = process.env.PAYSTACK_WEBHOOK_SECRET;
    if (!sec || !signature) return false;
    const expected = crypto
      .createHmac('sha512', sec)
      .update(rawBody)
      .digest('hex');
    // Constant-time compare.
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signature, 'hex'),
      );
    } catch {
      return false;
    }
  },

  isConfigured(): boolean {
    return Boolean(secret());
  },
};
