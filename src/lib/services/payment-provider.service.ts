/**
 * Payment Provider Abstraction — CashTraka
 *
 * Defines a common interface for payment providers (Paystack, Flutterwave, etc.)
 * so the core business logic never knows which provider it's talking to.
 */

export type PaymentProvider = 'PAYSTACK' | 'FLUTTERWAVE';

export type InitPaymentArgs = {
  email: string;
  /** Amount in Naira (whole units, not kobo) */
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  customerName?: string;
};

export type InitPaymentResult = {
  authorizationUrl: string;
  reference: string;
  accessCode?: string;
};

export type VerifyPaymentResult = {
  success: boolean;
  reference: string;
  amount: number; // Naira
  currency: string;
  providerTransactionId: string;
  customerEmail?: string;
  status: string; // provider raw status
  metadata?: Record<string, unknown>;
  paidAt?: string; // ISO timestamp
  // Authorization info for recurring charges
  authorization?: {
    authorizationCode: string;
    reusable: boolean;
    bin?: string;
    last4?: string;
    bank?: string;
    channel?: string;
    cardType?: string;
    expMonth?: string;
    expYear?: string;
    customerCode?: string;
  };
};

export type ProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: unknown };

/**
 * Every payment provider must implement this interface.
 */
export interface PaymentProviderAdapter {
  readonly name: PaymentProvider;
  isConfigured(): boolean;
  initTransaction(args: InitPaymentArgs): Promise<ProviderResult<InitPaymentResult>>;
  verifyTransaction(referenceOrId: string): Promise<ProviderResult<VerifyPaymentResult>>;
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean;
}

// Registry of adapters keyed by provider name
const adapters = new Map<PaymentProvider, PaymentProviderAdapter>();

export const paymentProviderService = {
  register(adapter: PaymentProviderAdapter) {
    adapters.set(adapter.name, adapter);
  },

  get(provider: PaymentProvider): PaymentProviderAdapter | undefined {
    return adapters.get(provider);
  },

  getOrThrow(provider: PaymentProvider): PaymentProviderAdapter {
    const adapter = adapters.get(provider);
    if (!adapter) throw new Error(`Payment provider ${provider} not registered`);
    return adapter;
  },

  /** Return all configured providers. */
  available(): PaymentProvider[] {
    return Array.from(adapters.entries())
      .filter(([, a]) => a.isConfigured())
      .map(([name]) => name);
  },
};