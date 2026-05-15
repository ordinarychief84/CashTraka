import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';

/**
 * Per-customer credit-limit enforcement.
 *
 * Single source of truth for "is this customer allowed to take on more
 * owed money?". Used by:
 *   • debtService.create  — refuses a new Debt that would push over
 *   • POST /api/invoices  — refuses a new Invoice that would push over
 *
 * The "currently owed" calculation deliberately counts BOTH open debts
 * AND unpaid invoice balances, not just `Customer.totalOwedKobo` (which
 * is debt-only — see customers.ts:recomputeCustomerTotals). Invoices
 * that go SENT and never get paid are exactly the leakage path this
 * feature exists to stop.
 *
 * Status:
 *   ok       → headroom available, action allowed
 *   warning  → would push above 75% of limit (allowed, surfaced as caution)
 *   blocked  → would push above 100% (refused)
 *   no_limit → customer has no `creditLimitKobo` set
 */

export type CreditCheckResult =
  | { status: 'no_limit'; limitKobo: null; currentOwedKobo: number; headroomKobo: null }
  | { status: 'ok'; limitKobo: number; currentOwedKobo: number; headroomKobo: number }
  | { status: 'warning'; limitKobo: number; currentOwedKobo: number; headroomKobo: number; projectedOwedKobo: number }
  | { status: 'blocked'; limitKobo: number; currentOwedKobo: number; projectedOwedKobo: number; overByKobo: number };

const INVOICE_OPEN_STATUSES = ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] as const;

export const creditLimitService = {
  /** Compute the customer's current outstanding from BOTH debts + invoices. */
  async currentOwedKobo(customerId: string): Promise<number> {
    const [debtAgg, invoices] = await Promise.all([
      prisma.debt.aggregate({
        where: { customerId, status: 'OPEN' },
        _sum: { amountOwedKobo: true, amountPaidKobo: true },
      }),
      // Invoice doesn't track customerId on its own — we look up via the
      // customer-name+phone fan-out. But Invoice DOES have customerId.
      prisma.invoice.findMany({
        where: {
          customerId,
          status: { in: [...INVOICE_OPEN_STATUSES] },
        },
        select: { totalKobo: true, amountPaidKobo: true },
      }),
    ]);

    const debtOwed = Math.max(
      0,
      (debtAgg._sum.amountOwedKobo ?? 0) - (debtAgg._sum.amountPaidKobo ?? 0),
    );
    const invoiceOwed = invoices.reduce(
      (s, i) => s + Math.max(0, i.totalKobo - i.amountPaidKobo),
      0,
    );
    return debtOwed + invoiceOwed;
  },

  /** Run the gate. Throws when blocked (callers usually want the throw to bubble up to the route). */
  async check(args: {
    userId: string;
    customerId: string;
    additionalKobo: number;
    actionLabel?: string;
  }): Promise<CreditCheckResult> {
    const customer = await prisma.customer.findFirst({
      where: { id: args.customerId, userId: args.userId },
      select: { id: true, name: true, creditLimitKobo: true },
    });
    if (!customer) {
      throw Err.notFound('Customer not found');
    }

    const currentOwedKobo = await this.currentOwedKobo(customer.id);

    if (customer.creditLimitKobo == null || customer.creditLimitKobo <= 0) {
      return { status: 'no_limit', limitKobo: null, currentOwedKobo, headroomKobo: null };
    }

    const limitKobo = customer.creditLimitKobo;
    const projectedOwedKobo = currentOwedKobo + Math.max(0, args.additionalKobo);

    if (projectedOwedKobo > limitKobo) {
      throw Err.validation(
        `Credit limit reached for ${customer.name}. ${
          args.actionLabel ? args.actionLabel + ' would push' : 'This would push'
        } owed to ₦${(projectedOwedKobo / 100).toLocaleString('en-NG')} — limit is ₦${(
          limitKobo / 100
        ).toLocaleString('en-NG')}. Collect payment or raise the limit on the customer profile.`,
      );
    }

    const headroomKobo = limitKobo - projectedOwedKobo;
    const status: 'ok' | 'warning' =
      projectedOwedKobo > limitKobo * 0.75 ? 'warning' : 'ok';
    if (status === 'warning') {
      return {
        status,
        limitKobo,
        currentOwedKobo,
        headroomKobo,
        projectedOwedKobo,
      };
    }
    return { status, limitKobo, currentOwedKobo, headroomKobo };
  },
};
