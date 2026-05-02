import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOrStaff } from '@/lib/auth';
import { adminCan } from '@/lib/admin-rbac';
import type { AdminRole } from '@/lib/admin-rbac';

export const dynamic = 'force-dynamic';

/** GET /api/admin/recurring-invoices, all rules across tenants. */
export async function GET(req: Request) {
  try {
    const admin = await requireAdminOrStaff();
    if (!adminCan(admin.adminRole as AdminRole, 'recurring')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 200);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

    // Failed (lastRunError != null) first, then by nextRunAt ascending.
    const [rows, total] = await Promise.all([
      prisma.recurringInvoiceRule.findMany({
        orderBy: [
          { lastRunError: { sort: 'desc', nulls: 'last' } },
          { nextRunAt: 'asc' },
        ],
        take: limit,
        skip: offset,
        include: {
          user: {
            select: { id: true, name: true, email: true, businessName: true },
          },
        },
      }),
      prisma.recurringInvoiceRule.count(),
    ]);

    // Hydrate customer name from templateData (cheap parse) for the table view.
    const data = rows.map((r) => {
      let customerName: string | null = null;
      try {
        const tpl = JSON.parse(r.templateData) as { customerName?: string };
        customerName = tpl?.customerName ?? null;
      } catch {
        customerName = null;
      }
      return { ...r, customerName };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: { limit, offset, total },
    });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (code === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/admin/recurring-invoices error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
