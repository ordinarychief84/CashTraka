import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const debtRepo = {
  create: (data: Prisma.DebtCreateInput) => prisma.debt.create({ data }),
  byId: (id: string) => prisma.debt.findUnique({ where: { id } }),
  update: (id: string, data: Prisma.DebtUpdateInput) =>
    prisma.debt.update({ where: { id }, data }),
  list: (where: Prisma.DebtWhereInput, take = 100, skip = 0) =>
    prisma.debt.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } }),
  count: (where?: Prisma.DebtWhereInput) => prisma.debt.count({ where }),
};
