import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrStaff } from '@/lib/auth';
import { adminCan } from '@/lib/admin-rbac';
import type { AdminRole } from '@/lib/admin-rbac';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = new Set([
  'DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID',
  'PAID', 'OVERDUE', 'CANCELLED', 'CREDITED',
]);
const VALID_FIRS = new Set([
  'PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'RETRYING', 'FAILED',
]);

/** GET /api/admin/invoices, paginated cross-tenant invoice list. */
export async function GET(req: Request) {
  try {
    const admin = await requireAdminOrStaff();
    if (!adminCan(admin.adminRole as AdminRole, 'invoices')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const q = (url.searchParams.get('q') || '').trim();
    const userId = url.searchParams.get('userId');
    const firsStatus = url.searchParams.get('firsStatus');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

    const where: Record<string, unknown> = {};
    if (status && status !== 'all' && VALID_STATUSES.has(status)) {
      where.status = status;
    }
    if (userId) {
      where.userId = userId;
    }
    if (firsStatus) {
      if (firsStatus === 'none') {
        where.firsStatus = null;
      } else if (VALID_FIRS.has(firsStatus)) {
        where.firsStatus = firsStatus;
      }
    }
    if (q) {
      where.OR = [
        { invoiceNumber: { contains: q } },
        { customerName: { contains: q } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          customerName: true,
          total: true,
          amountPaid: true,
          dueDate: true,
          createdAt: true,
          firsStatus: true,
          firsIrn: true,
          firsRetryCount: true,
          user: {
            select: { id: true, name: true, businessName: true, email: true },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: { limit, offset, total },
    });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('GET /api/admin/invoices error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
