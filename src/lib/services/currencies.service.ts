import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { CURRENCY_CODES, getCurrencyInfo } from '@/lib/currency-catalog';

/**
 * Per-tenant currency book.
 *
 * Africa-first defaults: when a user opens Settings > Currencies
 * for the first time and has no rows, `listForUser` lazily seeds a
 * single NGN row marked as default at rate 1.0. The default
 * currency's row always exists, is always non-deletable, and its
 * rate is always pinned at 1.0 in `setRate`.
 */

export const currenciesService = {
  async listForUser(userId: string) {
    let rows = await prisma.currency.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    });
    if (rows.length === 0) {
      // Lazy seed: every CashTraka tenant starts with NGN as the
      // default. Nigeria-first per product spec.
      const seeded = await prisma.currency.create({
        data: {
          userId,
          code: 'NGN',
          exchangeRate: 1.0,
          isDefault: true,
        },
      });
      rows = [seeded];
    }
    return rows;
  },

  async create(userId: string, code: string, exchangeRate?: number) {
    const upper = code.trim().toUpperCase();
    if (!upper) throw Err.validation('Currency code is required.');
    if (upper.length !== 3) throw Err.validation('Currency code must be 3 letters (ISO 4217).');
    if (!CURRENCY_CODES.includes(upper)) {
      throw Err.validation(`"${upper}" is not in the supported currency list.`);
    }
    // Reject duplicates within the active set.
    const existing = await prisma.currency.findFirst({
      where: { userId, code: upper, deletedAt: null },
    });
    if (existing) {
      throw Err.validation(`Currency ${upper} is already enabled.`);
    }
    // Default rate falls back to the catalog's sample-vs-NGN rate
    // (a friendly starting point — the user can edit it inline).
    const fallback = getCurrencyInfo(upper)?.sampleRateVsNgn ?? 1.0;
    const rate = typeof exchangeRate === 'number' && exchangeRate > 0
      ? exchangeRate
      : fallback;
    return prisma.currency.create({
      data: {
        userId,
        code: upper,
        exchangeRate: rate,
        isDefault: false,
      },
    });
  },

  async setRate(userId: string, id: string, rate: number) {
    if (!Number.isFinite(rate) || rate <= 0) {
      throw Err.validation('Rate must be a positive number.');
    }
    const existing = await prisma.currency.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw Err.notFound('Currency not found.');
    }
    if (existing.isDefault) {
      // The default currency's rate is always 1.0 (everything else is
      // expressed relative to it). Reject the change instead of
      // silently coercing — saves a confused debugging session later.
      throw Err.validation('The default currency rate is fixed at 1.0.');
    }
    return prisma.currency.update({
      where: { id },
      data: { exchangeRate: rate },
    });
  },

  async setDefault(userId: string, id: string) {
    const target = await prisma.currency.findUnique({ where: { id } });
    if (!target || target.userId !== userId || target.deletedAt) {
      throw Err.notFound('Currency not found.');
    }
    if (target.isDefault) return target;
    return prisma.$transaction(async (tx) => {
      await tx.currency.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      // The new default is now anchored at 1.0 — every other currency's
      // rate should ideally be re-quoted by the user. We don't auto-
      // convert other rates because the math compounds with stale
      // numbers and would silently corrupt invoices.
      return tx.currency.update({
        where: { id },
        data: { isDefault: true, exchangeRate: 1.0 },
      });
    });
  },

  async softDelete(userId: string, id: string) {
    const existing = await prisma.currency.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw Err.notFound('Currency not found.');
    }
    if (existing.isDefault) {
      throw Err.validation('Cannot delete the default currency. Set another currency as default first.');
    }
    return prisma.currency.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
