/**
 * PayLink Service — CashTraka Payment Request Links
 */

import { prisma } from '@/lib/prisma';

async function nextLinkNumber(userId: string): Promise<string> {
  const latest = await prisma.paymentRequest.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { linkNumber: true },
  });
  if (latest?.linkNumber) {
    const num = parseInt(latest.linkNumber.replace('PLK-', ''), 10) || 0;
    return `PLK-${String(num + 1).padStart(5, '0')}`;
  }
  return 'PLK-00001';
}

export function whatsappPayLink(args: {
  phone: string;
  customerName: string;
  amount: number;
  token: string;
  businessName?: string;
  description?: string;
}): string {
  const appUrl = process.env.APP_URL || 'https://cashtraka.co';
  const payUrl = `${appUrl}/pay/${args.token}`;
  const biz = args.businessName || 'CashTraka';
  const desc = args.description ? `\nFor: ${args.description}` : '';

  const msg =
    `Hi ${args.customerName},\n\n` +
    `You have a payment request of ₦${args.amount.toLocaleString('en-NG')} from ${biz}.${desc}\n\n` +
    `Pay here: ${payUrl}\n\n` +
    `— Sent via CashTraka`;

  let normalized = args.phone.replace(/\s+/g, '');
  if (normalized.startsWith('0')) normalized = '234' + normalized.slice(1);
  if (!normalized.startsWith('+')) normalized = '+' + normalized;
  normalized = normalized.replace('+', '');

  return `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`;
}

export const paylinkService = {
  async create(args: {
    userId: string;
    customerId?: string;
    customerName: string;
    customerPhone: string;
    amount: number;
    description?: string;
    debtId?: string;
    expiresInDays?: number;
  }) {
    const linkNumber = await nextLinkNumber(args.userId);
    const expiresAt = args.expiresInDays
      ? new Date(Date.now() + args.expiresInDays * 86400000)
      : new Date(Date.now() + 30 * 86400000);

    return prisma.paymentRequest.create({
      data: {
        userId: args.userId,
        customerId: args.customerId || null,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        amount: args.amount,
        description: args.description || null,
        debtId: args.debtId || null,
        linkNumber,
        expiresAt,
      },
    });
  },

  async list(userId: string, opts?: { status?: string; take?: number; skip?: number }) {
    const where: Record<string, unknown> = { userId };
    if (opts?.status) where.status = opts.status;

    const [items, total] = await Promise.all([
      prisma.paymentRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: opts?.take || 50,
        skip: opts?.skip || 0,
        include: { customer: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.paymentRequest.count({ where }),
    ]);

    return { items, total };
  },

  async getByToken(token: string) {
    return prisma.paymentRequest.findUnique({
      where: { token },
      include: {
        user: { select: { name: true, businessName: true, whatsappNumber: true, bankName: true, bankAccountNumber: true, bankAccountName: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });
  },

  async markViewed(token: string) {
    return prisma.paymentRequest.updateMany({
      where: { token, viewedAt: null },
      data: { status: 'viewed', viewedAt: new Date() },
    });
  },

  async markClaimed(token: string) {
    return prisma.paymentRequest.update({
      where: { token },
      data: { status: 'claimed', claimedAt: new Date() },
    });
  },

  async confirm(id: string, userId: string) {
    return prisma.paymentRequest.update({
      where: { id, userId },
      data: { status: 'confirmed', confirmedAt: new Date() },
    });
  },

  async cancel(id: string, userId: string) {
    return prisma.paymentRequest.update({
      where: { id, userId },
      data: { status: 'cancelled' },
    });
  },

  async markWhatsAppSent(id: string, userId: string) {
    return prisma.paymentRequest.update({
      where: { id, userId },
      data: { whatsappSentAt: new Date() },
    });
  },

  async markEmailSent(id: string, userId: string) {
    return prisma.paymentRequest.update({
      where: { id, userId },
      data: { emailSentAt: new Date() },
    });
  },

  async expireStale() {
    return prisma.paymentRequest.updateMany({
      where: {
        status: { in: ['pending', 'viewed'] },
        expiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    });
  },

  async stats(userId: string) {
    const [pending, claimed, confirmed, total, totalAmount] = await Promise.all([
      prisma.paymentRequest.count({ where: { userId, status: { in: ['pending', 'viewed'] } } }),
      prisma.paymentRequest.count({ where: { userId, status: 'claimed' } }),
      prisma.paymentRequest.count({ where: { userId, status: 'confirmed' } }),
      prisma.paymentRequest.count({ where: { userId } }),
      prisma.paymentRequest.aggregate({
        where: { userId, status: 'confirmed' },
        _sum: { amount: true },
      }),
    ]);

    return {
      pending,
      claimed,
      confirmed,
      total,
      collectedAmount: totalAmount._sum.amount || 0,
    };
  },
};
