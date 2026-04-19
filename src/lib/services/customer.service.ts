import { customerRepo } from '@/lib/repositories/customer.repository';
import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
// Keep the existing upsert/recompute logic — it's already battle-tested.
export { upsertCustomer, recomputeCustomerTotals } from '@/lib/customers';

export const customerService = {
  async forUser(userId: string, opts?: { q?: string; skip?: number; take?: number }) {
    const q = (opts?.q ?? '').trim();
    if (q) {
      const results = await customerRepo.search(userId, q);
      return { rows: results, total: results.length };
    }
    const take = opts?.take ?? 50;
    const skip = opts?.skip ?? 0;
    const [rows, total] = await Promise.all([
      customerRepo.list({ userId }, take, skip),
      customerRepo.count({ userId }),
    ]);
    return { rows, total };
  },

  async detailForUser(userId: string, customerId: string) {
    const customer = await customerRepo.byId(customerId);
    if (!customer || customer.userId !== userId) throw Err.notFound('Customer not found');
    const [payments, debts] = await Promise.all([
      prisma.payment.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.debt.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { customer, payments, debts };
  },
};
