import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { userRepo } from '@/lib/repositories/user.repository';
import type { Prisma } from '@prisma/client';

/**
 * Admin-only operations: user search, detail, suspension, and notes.
 * Callers must have already checked `requireAdmin()` in the route handler.
 */

const filterSchema = z.object({
  q: z.string().trim().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  businessType: z.enum(['seller', 'property_manager']).optional(),
  isSuspended: z.enum(['yes', 'no']).optional(),
  hasActivity: z.enum(['yes', 'no']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export const adminService = {
  async listUsers(rawFilters: unknown) {
    const filters = filterSchema.parse(rawFilters);
    const where: Prisma.UserWhereInput = {};
    if (filters.q) {
      const q = filters.q;
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { businessName: { contains: q } },
      ];
    }
    if (filters.role) where.role = filters.role;
    if (filters.businessType) where.businessType = filters.businessType;
    if (filters.isSuspended) where.isSuspended = filters.isSuspended === 'yes';
    if (filters.hasActivity === 'yes') {
      where.OR = [
        ...(where.OR ?? []),
        { payments: { some: {} } },
        { debts: { some: {} } },
      ];
    } else if (filters.hasActivity === 'no') {
      where.payments = { none: {} };
      where.debts = { none: {} };
    }

    const skip = (filters.page - 1) * filters.perPage;
    const [rows, total] = await Promise.all([
      userRepo.list({ where, skip, take: filters.perPage }),
      userRepo.count(where),
    ]);

    return {
      rows,
      pagination: {
        page: filters.page,
        perPage: filters.perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.perPage)),
      },
    };
  },

  async userDetail(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            payments: true,
            debts: true,
            customers: true,
            invoices: true,
          },
        },
      },
    });
    if (!user) throw Err.notFound('User not found');

    const [paidAgg, openDebtAgg, recentActivity, notes] = await Promise.all([
      prisma.payment.aggregate({
        where: { userId: id, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.debt.aggregate({
        where: { userId: id, status: 'OPEN' },
        _sum: { amountOwed: true, amountPaid: true },
      }),
      prisma.payment.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          customerNameSnapshot: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.adminNote.findMany({
        where: { targetUserId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { author: { select: { name: true, email: true } } },
      }),
    ]);

    const { passwordHash, ...safe } = user;
    return {
      user: safe,
      totals: {
        revenue: paidAgg._sum.amount ?? 0,
        outstandingDebt: Math.max(
          (openDebtAgg._sum.amountOwed ?? 0) - (openDebtAgg._sum.amountPaid ?? 0),
          0,
        ),
      },
      recentActivity,
      notes,
    };
  },

  async suspendUser(adminId: string, targetId: string, reason?: string) {
    if (adminId === targetId) throw Err.validation("You can't suspend yourself");
    const target = await userRepo.byId(targetId);
    if (!target) throw Err.notFound('User not found');
    if (target.role === 'ADMIN') throw Err.forbidden("Can't suspend another admin");
    const updated = await userRepo.setSuspended(targetId, true);
    if (reason) {
      await prisma.adminNote.create({
        data: {
          adminUserId: adminId,
          targetUserId: targetId,
          note: `SUSPENDED: ${reason}`,
        },
      });
    }
    return updated;
  },

  async reactivateUser(adminId: string, targetId: string, reason?: string) {
    const target = await userRepo.byId(targetId);
    if (!target) throw Err.notFound('User not found');
    const updated = await userRepo.setSuspended(targetId, false);
    if (reason) {
      await prisma.adminNote.create({
        data: {
          adminUserId: adminId,
          targetUserId: targetId,
          note: `REACTIVATED: ${reason}`,
        },
      });
    }
    return updated;
  },

  async addNote(adminId: string, targetId: string, note: string) {
    if (note.trim().length < 2) throw Err.validation('Note is too short');
    const target = await userRepo.byId(targetId);
    if (!target) throw Err.notFound('User not found');
    return prisma.adminNote.create({
      data: { adminUserId: adminId, targetUserId: targetId, note: note.trim() },
    });
  },
};
