import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrStaff } from '@/lib/auth';
import { adminCan } from '@/lib/admin-rbac';
import type { AdminRole } from '@/lib/admin-rbac';

export const dynamic = 'force-dynamic';

/** GET /api/admin/firs, FIRS dashboard aggregates. */
export async function GET() {
  try {
    const admin = await requireAdminOrStaff();
    if (!adminCan(admin.adminRole as AdminRole, 'firs')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const day = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const STATUSES = ['ACCEPTED', 'REJECTED', 'RETRYING', 'FAILED', 'PENDING', 'SUBMITTED'];

    const [
      statusCounts,
      noneCount,
      submitted24h,
      submitted7d,
      submitted30d,
      topErrors,
      stuck,
      topUsers,
    ] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['firsStatus'],
        where: { firsStatus: { in: STATUSES } },
        _count: { firsStatus: true },
      }),
      prisma.invoice.count({ where: { firsStatus: null } }),
      prisma.invoice.count({ where: { firsSubmittedAt: { gte: day } } }),
      prisma.invoice.count({ where: { firsSubmittedAt: { gte: week } } }),
      prisma.invoice.count({ where: { firsSubmittedAt: { gte: month } } }),
      prisma.invoice.groupBy({
        by: ['firsLastError'],
        where: { firsLastError: { not: null } },
        _count: { firsLastError: true },
        orderBy: { _count: { firsLastError: 'desc' } },
        take: 10,
      }),
      prisma.invoice.findMany({
        where: { firsRetryCount: { gte: 3 } },
        orderBy: { firsRetryCount: 'desc' },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          firsLastError: true,
          firsRetryCount: true,
          firsSubmittedAt: true,
          firsStatus: true,
          user: { select: { id: true, name: true, businessName: true, email: true } },
        },
      }),
      prisma.invoice.groupBy({
        by: ['userId'],
        where: { firsSubmittedAt: { gte: month } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
    ]);

    const byStatus: Record<string, number> = { none: noneCount };
    for (const s of STATUSES) byStatus[s] = 0;
    for (const row of statusCounts) {
      const k = row.firsStatus || 'none';
      byStatus[k] = row._count.firsStatus;
    }

    // Hydrate top user info.
    const userIds = topUsers.map((u) => u.userId);
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, businessName: true, email: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const topUsersHydrated = topUsers.map((u) => ({
      userId: u.userId,
      count: u._count.userId,
      user: userById.get(u.userId) || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        byStatus,
        windows: { last24h: submitted24h, last7d: submitted7d, last30d: submitted30d },
        topErrors: topErrors.map((e) => ({
          error: e.firsLastError,
          count: e._count.firsLastError,
        })),
        stuck,
        topUsers: topUsersHydrated,
      },
    });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (code === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/admin/firs error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
