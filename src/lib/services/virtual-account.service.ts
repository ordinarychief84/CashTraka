/**
 * Virtual account per invoice service (Tax+ tier).
 *
 * Mints a unique 10-digit NUBAN tied to one invoice via a partner bank
 * (Wema / Sterling / Providus). Customers transfer to that account, the
 * partner webhook (future work) credits the invoice, and the receipt
 * sends. v1 ships the row + adapter; partner wiring lands when the
 * commercial agreement is signed.
 *
 * Mirrors the FIRSInvoiceAdapter pattern (firs-invoice.service.ts) and
 * the MonoAdapter pattern (mono-bank.service.ts) so swapping in a real
 * provider is a one-line change.
 */

import { prisma } from '@/lib/prisma';

export interface VirtualAccountAdapter {
  createForInvoice(args: {
    invoiceId: string;
    userId: string;
    expectedAmountKobo: number;
    reference: string;
  }): Promise<{
    ok: boolean;
    account?: {
      externalId: string;
      accountNumber: string;
      accountName: string;
      bankName: string;
      expiresAt?: Date;
    };
    error?: string;
  }>;
  expire(args: { externalId: string }): Promise<{ ok: boolean; error?: string }>;
}

class NoopVAAdapter implements VirtualAccountAdapter {
  async createForInvoice(_args: {
    invoiceId: string;
    userId: string;
    expectedAmountKobo: number;
    reference: string;
  }) {
    return {
      ok: false,
      error:
        'Virtual account integration not configured. Set VA_PROVIDER and VA_API_KEY in env.',
    };
  }
  async expire(_args: { externalId: string }) {
    return { ok: false, error: 'Virtual account integration not configured.' };
  }
}

export const virtualAccountService = {
  // Same swap-truthy-branch trick as Mono: when partner keys land,
  // replace the truthy branch with the real adapter.
  adapter: (process.env.VA_API_KEY
    ? new NoopVAAdapter()
    : new NoopVAAdapter()) as VirtualAccountAdapter,

  /**
   * Idempotent: returns the existing VA for the invoice when one already
   * exists, otherwise mints a new one via the adapter and persists.
   */
  async ensureForInvoice(invoiceId: string, userId: string) {
    const existing = await prisma.virtualAccount.findUnique({
      where: { invoiceId },
    });
    if (existing && existing.userId === userId) {
      return { ok: true as const, account: existing, alreadyExisted: true };
    }
    if (existing && existing.userId !== userId) {
      // A VA exists but for a different tenant. Treat as not found rather
      // than leak existence across tenants.
      return { ok: false as const, error: 'Invoice not found' };
    }
    const inv = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });
    if (!inv) return { ok: false as const, error: 'Invoice not found' };
    const r = await this.adapter.createForInvoice({
      invoiceId,
      userId,
      // Invoice.total is in Naira (no kobo) per the existing schema.
      expectedAmountKobo: inv.total * 100,
      reference: inv.invoiceNumber,
    });
    if (!r.ok || !r.account) return { ok: false as const, error: r.error };
    const row = await prisma.virtualAccount.create({
      data: {
        userId,
        invoiceId,
        provider: process.env.VA_PROVIDER ?? 'WEMA',
        externalId: r.account.externalId,
        accountNumber: r.account.accountNumber,
        accountName: r.account.accountName,
        bankName: r.account.bankName,
        expiresAt: r.account.expiresAt,
      },
    });
    return { ok: true as const, account: row };
  },

  /**
   * Public-page lookup. Returns the active VA for an invoice or null. No
   * userId scoping because this powers the public /invoice/[token] page,
   * and the invoiceId is already guarded by the public token.
   */
  async getForInvoice(invoiceId: string) {
    return prisma.virtualAccount.findUnique({
      where: { invoiceId },
    });
  },
};
