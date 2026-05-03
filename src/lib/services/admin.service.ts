import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { userRepo } from '@/lib/repositories/user.repository';
import { notificationService } from '@/lib/services/notification.service';
import type { Prisma } from '@prisma/client';

/**
 * Admin-only operations: user search, detail, suspension, and notes.
 * Callers must have already checked `requireAdmin()` in the route handler.
 */

/**
 * Coerce "" → undefined so HTML <select> controls with a blank default
 * option (which submit as empty strings) don't trip `z.enum()` validation.
 * We can't use `.optional()` alone because Zod treats "" as present.
 */
const emptyAsUndefined = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), inner.optional());

const filterSchema = z.object({
  q: z.string().trim().optional(),
  role: emptyAsUndefined(z.enum(['USER', 'ADMIN'])),
  businessType: emptyAsUndefined(z.enum(['seller', 'property_manager'])),
  isSuspended: emptyAsUndefined(z.enum(['yes', 'no'])),
  hasActivity: emptyAsUndefined(z.enum(['yes', 'no'])),
  // "no" (default) hides deactivated users; "yes" shows them; "only" shows
  // only deactivated users. Deactivated users are retained for the 6-year
  // FIRS retention window.
  showDeleted: emptyAsUndefined(z.enum(['no', 'yes', 'only'])),
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
    // Default: hide deactivated users. "yes" shows everyone; "only" shows
    // exclusively deactivated users for retention review.
    if (filters.showDeleted === 'only') {
      where.deletedAt = { not: null };
    } else if (filters.showDeleted !== 'yes') {
      where.deletedAt = null;
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
    // Auto-notify + audit log
    await notificationService.onUserSuspended({ userId: targetId, adminId, reason });
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
    // Auto-notify + audit log
    await notificationService.onUserReactivated({ userId: targetId, adminId, reason });
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
async deleteUser(adminId: string, targetId: string, reason?: string) {
    if (adminId === targetId) throw Err.validation("You can't deactivate yourself");
    const target = await userRepo.byId(targetId);
    if (!target) throw Err.notFound('User not found');
    if (target.role === 'ADMIN') throw Err.forbidden("Can't deactivate another admin");
    if (target.deletedAt) {
      return { ok: true, deactivated: target.email, alreadyDeleted: true };
    }

    // Log the deactivation before mutating the user. Tax-relevant records
    // (invoices, receipts, payments, expenses, VAT returns, audit logs) stay
    // intact for the 6-year Nigerian FIRS retention window.
    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'DEACTIVATE_USER',
        targetId,
        details: `Deactivated user ${target.name} (${target.email})${reason ? `, reason: ${reason}` : ''}. Records retained for 6 years per Nigerian tax rules.`,
      },
    });

    // Soft delete: free the email for re-signup, mark deletedAt, and force
    // isSuspended so the existing suspension-aware code paths block access.
    const archivedEmail = `${target.email}.deleted-${Date.now()}@cashtraka.deleted`;
    await prisma.user.update({
      where: { id: targetId },
      data: {
        deletedAt: new Date(),
        isSuspended: true,
        email: archivedEmail,
      },
    });

    return { ok: true, deactivated: target.email };
  },

  async userStats() {
    // Cross-tenant aggregates exclude soft-deleted accounts so deactivated
    // users do not inflate the "live" headline numbers. The "deactivated"
    // count is reported separately for retention review.
    const live: Prisma.UserWhereInput = { deletedAt: null };
    const [total, active, suspended, freePlan, paidPlan, newThisMonth, deactivated] = await Promise.all([
      prisma.user.count({ where: live }),
      prisma.user.count({ where: { ...live, isSuspended: false } }),
      prisma.user.count({ where: { ...live, isSuspended: true } }),
      prisma.user.count({ where: { ...live, plan: 'free' } }),
      prisma.user.count({ where: { ...live, plan: { not: 'free' } } }),
      prisma.user.count({
        where: {
          ...live,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.user.count({ where: { deletedAt: { not: null } } }),
    ]);
    return { total, active, suspended, freePlan, paidPlan, newThisMonth, deactivated };
  },
};
