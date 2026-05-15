import { Err } from '@/lib/errors';
import { debtSchema } from '@/lib/validators';
import { prisma } from '@/lib/prisma';
import { upsertCustomer, recomputeCustomerTotals } from '@/lib/customers';
import { normalizeNigerianPhone } from '@/lib/whatsapp';
import { debtRepo } from '@/lib/repositories/debt.repository';
import { nairaToKobo } from '@/lib/money';
import { creditLimitService } from '@/lib/services/credit-limit.service';

export const debtService = {
  listForUser: async (
    userId: string,
    opts?: { status?: 'OPEN' | 'PAID'; take?: number; skip?: number },
  ) => {
    const take = opts?.take ?? 50;
    const skip = opts?.skip ?? 0;
    const where = { userId, ...(opts?.status ? { status: opts.status } : {}) };
    const [rows, total] = await Promise.all([
      debtRepo.list(where, take, skip),
      debtRepo.count(where),
    ]);
    return { rows, total };
  },

  getForUser: async (userId: string, id: string) => {
    const debt = await debtRepo.byId(id);
    if (!debt || debt.userId !== userId) throw Err.notFound('Debt not found');
    return debt;
  },

  create: async (userId: string, input: unknown) => {
    const parsed = debtSchema.parse(input);
    const { customerName, phone, amountOwed, dueDate } = parsed;
    const normalizedPhone = normalizeNigerianPhone(phone);
    const customer = await upsertCustomer(userId, customerName, phone);

    // Credit-limit guardrail (shared with invoice creation). Counts BOTH
    // open debts AND unpaid invoice balances toward the limit so an SME
    // can't unknowingly hand a customer ₦50k of inventory on debt + ₦50k
    // on an unpaid invoice when their cap is ₦80k. Throws when blocked.
    const amountOwedKobo = nairaToKobo(amountOwed);
    await creditLimitService.check({
      userId,
      customerId: customer.id,
      additionalKobo: amountOwedKobo,
      actionLabel: 'Adding this debt',
    });

    const debt = await prisma.debt.create({
      data: {
        userId,
        customerId: customer.id,
        customerNameSnapshot: customerName.trim(),
        phoneSnapshot: normalizedPhone,
        amountOwed,
        amountOwedKobo,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    await recomputeCustomerTotals(customer.id);
    return { id: debt.id };
  },

  /**
   * Mark a debt as PAID. Triggers receipt auto-generation (if not already done).
   * Returns the updated debt + the id of the generated Receipt (if any).
   */
  markPaid: async (userId: string, id: string) => {
    const debt = await debtRepo.byId(id);
    if (!debt || debt.userId !== userId) throw Err.notFound('Debt not found');
    if (debt.status === 'PAID') return { debt, receiptId: null };

    const updated = await debtRepo.update(debt.id, {
      status: 'PAID',
      amountPaid: debt.amountOwed,
      amountPaidKobo: nairaToKobo(debt.amountOwed),
    });
    await recomputeCustomerTotals(debt.customerId);

    // Lazy import to break a potential dependency cycle.
    const { receiptService } = await import('./receipt.service');
    const receipt = await receiptService.ensureForDebt(userId, id).catch(() => null);

    return { debt: updated, receiptId: receipt?.id ?? null };
  },
};
