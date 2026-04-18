import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

/** Thin data-access wrappers for the User model. */

export const userRepo = {
  byId: (id: string) => prisma.user.findUnique({ where: { id } }),
  byEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  update: (id: string, data: Prisma.UserUpdateInput) =>
    prisma.user.update({ where: { id }, data }),
  setLastLogin: (id: string) =>
    prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } }),
  setSuspended: (id: string, isSuspended: boolean) =>
    prisma.user.update({ where: { id }, data: { isSuspended } }),
  list: (args: {
    where?: Prisma.UserWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) =>
    prisma.user.findMany({
      where: args.where,
      skip: args.skip,
      take: args.take,
      orderBy: args.orderBy ?? { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        businessType: true,
        businessName: true,
        plan: true,
        isSuspended: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
  count: (where?: Prisma.UserWhereInput) => prisma.user.count({ where }),
};
