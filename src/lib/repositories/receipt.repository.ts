import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const receiptRepo = {
  create: (data: Prisma.ReceiptCreateInput) => prisma.receipt.create({ data }),
  byId: (id: string) => prisma.receipt.findUnique({ where: { id } }),
  byNumber: (receiptNumber: string) =>
    prisma.receipt.findUnique({ where: { receiptNumber } }),
  byPaymentId: (paymentId: string) =>
    prisma.receipt.findUnique({ where: { paymentId } }),
  byDebtId: (debtId: string) =>
    prisma.receipt.findUnique({ where: { debtId } }),
  update: (id: string, data: Prisma.ReceiptUpdateInput) =>
    prisma.receipt.update({ where: { id }, data }),
  listForUser: (userId: string, take = 50, skip = 0) =>
    prisma.receipt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
  countForUser: (userId: string) =>
    prisma.receipt.count({ where: { userId } }),
};

/**
 * Generate the next ${prefix}-##### receipt number for a user. The prefix is
 * configurable per-business via `User.receiptPrefix` (default "CT"). Uniqueness
 * is enforced at the DB level (@unique); we retry if there's a race.
 *
 * Sequence is per-prefix: switching prefixes mid-stream restarts numbering.
 */
export async function nextReceiptNumber(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { receiptPrefix: true },
  });
  const rawPrefix = (user?.receiptPrefix ?? 'CT').trim().toUpperCase();
  // Defensive: only A-Z and 0-9 in the prefix to avoid weird URL-unsafe chars.
  const prefix = rawPrefix.replace(/[^A-Z0-9]/g, '') || 'CT';

  const latest = await prisma.receipt.findFirst({
    where: { userId, receiptNumber: { startsWith: `${prefix}-` } },
    orderBy: { createdAt: 'desc' },
    select: { receiptNumber: true },
  });
  let seq = 1;
  if (latest?.receiptNumber) {
    const m = latest.receiptNumber.match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `${prefix}-${String(seq + attempt).padStart(5, '0')}`;
    const clash = await prisma.receipt.findUnique({
      where: { receiptNumber: candidate },
    });
    if (!clash) return candidate;
  }
  // Fallback: suffix with timestamp to guarantee uniqueness.
  return `${prefix}-${String(seq).padStart(5, '0')}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}
