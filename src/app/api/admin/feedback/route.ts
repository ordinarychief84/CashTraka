import { NextResponse } from 'next/server';
import { requireAdminOrStaff } from '@/lib/auth';
import { adminCan } from '@/lib/admin-rbac';
import type { AdminRole } from '@/lib/admin-rbac';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET /api/admin/feedback
 *
 * Platform-wide Service Check metrics + the 20 most recent negative
 * feedback rows across all tenants. RBAC: SUPER_ADMIN or REPORTS_VIEWER.
 */
export async function GET() {
  let admin;
  try {
    admin = await requireAdminOrStaff();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!adminCan(admin.adminRole as AdminRole, 'feedback')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const baseWhere = { submittedAt: { not: null } } as const;
  const [total, negative, recentNegative, totalLinks] = await Promise.all([
    prisma.feedback.count({ where: baseWhere }),
    prisma.feedback.count({
      where: { ...baseWhere, isNegative: true },
    }),
    prisma.feedback.findMany({
      where: { ...baseWhere, isNegative: true },
      orderBy: { submittedAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: { id: true, name: true, businessName: true, email: true },
        },
        customer: { select: { id: true, name: true } },
      },
    }),
    prisma.feedback.count({}),
  ]);

  const responseRate =
    totalLinks > 0 ? Math.round((total / totalLinks) * 100) : 0;

  return NextResponse.json({
    success: true,
    data: {
      total,
      negative,
      totalLinks,
      responseRate,
      recentNegative,
    },
  });
}
