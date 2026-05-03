/**
 * Mono bank statement sync service (Tax+ tier).
 *
 * Wraps the Mono Connect linking flow + transaction polling behind a
 * swappable adapter. Ships with a NoopMonoAdapter that returns a clear
 * "not configured" error until MONO_PUBLIC_KEY + MONO_SECRET_KEY land.
 * Replace the adapter selection below with a RealMonoAdapter once the
 * commercial agreement and API keys are in place.
 *
 * Mirrors the FIRSInvoiceAdapter pattern in firs-invoice.service.ts:
 *   - Adapter is the wire-format boundary, swap it out without touching
 *     routes or the rest of the service.
 *   - All persistence (LinkedBankAccount + BankTransaction rows) lives
 *     here so routes stay thin.
 *   - All reads are owner-scoped to prevent cross-tenant leakage.
 */

import { prisma } from '@/lib/prisma';

export interface MonoAdapter {
  /// Returns Mono Connect widget config the client needs to launch the
  /// linking flow. v1 returns the public key + a reference id we generate.
  getLinkConfig(args: {
    userId: string;
  }): Promise<{ ok: boolean; publicKey?: string; reference?: string; error?: string }>;
  /// Exchange the Mono Connect code for an account id + meta.
  exchangeCode(args: {
    code: string;
    userId: string;
  }): Promise<{
    ok: boolean;
    account?: {
      externalId: string;
      bankName: string;
      accountName: string;
      accountNumber: string;
    };
    error?: string;
  }>;
  /// Pull recent transactions for a linked account.
  fetchTransactions(args: {
    externalId: string;
    from?: Date;
    to?: Date;
  }): Promise<{
    ok: boolean;
    transactions?: Array<{
      externalId: string;
      direction: 'CREDIT' | 'DEBIT';
      amountKobo: number;
      description: string | null;
      reference: string | null;
      occurredAt: Date;
    }>;
    error?: string;
  }>;
  /// Disconnect a linked account.
  disconnect(args: { externalId: string }): Promise<{ ok: boolean; error?: string }>;
}

class NoopMonoAdapter implements MonoAdapter {
  async getLinkConfig(_args: { userId: string }) {
    return {
      ok: false,
      error:
        'Mono integration not configured. Set MONO_PUBLIC_KEY and MONO_SECRET_KEY in env.',
    };
  }
  async exchangeCode(_args: { code: string; userId: string }) {
    return { ok: false, error: 'Mono integration not configured.' };
  }
  async fetchTransactions(_args: { externalId: string; from?: Date; to?: Date }) {
    return { ok: false, error: 'Mono integration not configured.' };
  }
  async disconnect(_args: { externalId: string }) {
    return { ok: false, error: 'Mono integration not configured.' };
  }
}

export const monoBankService = {
  // The `process.env.MONO_PUBLIC_KEY ? ...` ternary is intentional:
  // when keys land, swap the truthy branch for `new RealMonoAdapter()`
  // without touching the rest of the codebase.
  adapter: (process.env.MONO_PUBLIC_KEY
    ? new NoopMonoAdapter()
    : new NoopMonoAdapter()) as MonoAdapter,

  async getLinkConfig(userId: string) {
    return this.adapter.getLinkConfig({ userId });
  },

  async listLinkedAccounts(userId: string) {
    return prisma.linkedBankAccount.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  },

  async finishLink(args: { userId: string; code: string }) {
    const ex = await this.adapter.exchangeCode({ code: args.code, userId: args.userId });
    if (!ex.ok || !ex.account) return ex;
    const row = await prisma.linkedBankAccount.create({
      data: { userId: args.userId, ...ex.account },
    });
    return { ok: true, account: row };
  },

  async syncAccount(accountId: string, userId: string) {
    const acct = await prisma.linkedBankAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!acct) return { ok: false, error: 'Account not found' };
    const r = await this.adapter.fetchTransactions({ externalId: acct.externalId });
    if (!r.ok || !r.transactions) {
      await prisma.linkedBankAccount.update({
        where: { id: acct.id },
        data: { status: 'ERROR', errorMessage: r.error },
      });
      return r;
    }
    for (const t of r.transactions) {
      await prisma.bankTransaction.upsert({
        where: { externalId: t.externalId },
        create: { accountId: acct.id, ...t },
        update: {},
      });
    }
    await prisma.linkedBankAccount.update({
      where: { id: acct.id },
      data: { lastSyncAt: new Date(), status: 'ACTIVE', errorMessage: null },
    });
    return { ok: true, count: r.transactions.length };
  },

  async disconnectAccount(accountId: string, userId: string) {
    const acct = await prisma.linkedBankAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!acct) return { ok: false, error: 'Account not found' };
    // Best-effort upstream revoke. Failures here must not block the local
    // flip to DISCONNECTED, since the seller still wants the row gone
    // from their dashboard regardless of upstream availability.
    await this.adapter.disconnect({ externalId: acct.externalId }).catch(() => null);
    await prisma.linkedBankAccount.update({
      where: { id: acct.id },
      data: { status: 'DISCONNECTED' },
    });
    return { ok: true };
  },

  async listTransactions(
    userId: string,
    opts: { matchStatus?: string; limit?: number } = {},
  ) {
    return prisma.bankTransaction.findMany({
      where: {
        account: { userId },
        ...(opts.matchStatus ? { matchStatus: opts.matchStatus } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: opts.limit ?? 100,
    });
  },

  async matchToInvoice(transactionId: string, invoiceId: string, userId: string) {
    // Only allows matching to invoices owned by the same user.
    const inv = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });
    if (!inv) return { ok: false, error: 'Invoice not found' };
    // Verify the transaction belongs to one of this user's linked accounts
    // before mutating, otherwise a forged id could mark someone else's row.
    const tx = await prisma.bankTransaction.findFirst({
      where: { id: transactionId, account: { userId } },
    });
    if (!tx) return { ok: false, error: 'Transaction not found' };
    await prisma.bankTransaction.update({
      where: { id: tx.id },
      data: { matchedInvoiceId: invoiceId, matchStatus: 'MATCHED' },
    });
    return { ok: true };
  },
};
