import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const paymentRepo = {
  create: (data: Prisma.PaymentCreateInput) => prisma.payment.create({ data }),
  byId: (id: string) =>
    prisma.payment.findUnique({
      where: { id },
      include: { items: true, customer: true },
    }),
  list: (where: Prisma.PaymentWhereInput, take = 100, skip = 0) =>
    prisma.payment.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
  count: (where?: Prisma.PaymentWhereInput) => prisma.payment.count({ where }),
  sumAmount: (where: Prisma.PaymentWhereInput) =>
    prisma.payment
      .aggregate({ where, _sum: { amount: true } })
      .then((r) => r._sum.amount ?? 0),
};
