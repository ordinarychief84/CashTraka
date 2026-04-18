import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const customerRepo = {
  byId: (id: string) => prisma.customer.findUnique({ where: { id } }),
  list: (where: Prisma.CustomerWhereInput, take = 100, skip = 0) =>
    prisma.customer.findMany({
      where,
      take,
      skip,
      orderBy: { lastActivityAt: 'desc' },
    }),
  count: (where?: Prisma.CustomerWhereInput) => prisma.customer.count({ where }),
  search: (userId: string, q: string) => {
    const digits = q.replace(/\D/g, '');
    return prisma.customer.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: q } },
          ...(digits ? [{ phone: { contains: digits } }] : []),
        ],
      },
      orderBy: { lastActivityAt: 'desc' },
      take: 50,
    });
  },
};
