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
 * Generate the next CT-##### receipt number for a user. Uniqueness is enforced
 * at the DB level (@unique); we retry if there's a race.
 */
export async function nextReceiptNumber(userId: string): Promise<string> {
  const latest = await prisma.receipt.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { receiptNumber: true },
  });
  let seq = 1;
  if (latest?.receiptNumber) {
    const m = latest.receiptNumber.match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `CT-${String(seq + attempt).padStart(5, '0')}`;
    const clash = await prisma.receipt.findUnique({
      where: { receiptNumber: candidate },
    });
    if (!clash) return candidate;
  }
  // Fallback: suffix with timestamp to guarantee uniqueness.
  return `CT-${String(seq).padStart(5, '0')}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}
