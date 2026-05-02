import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

const VALID_STATUS = new Set(['ACTIVE', 'PAUSED', 'CANCELLED']);

/** PATCH /api/admin/recurring-invoices/[id], admin update of rule status / nextRunAt. */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const admin = await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const { status, nextRunAt } = body as { status?: string; nextRunAt?: string };

    const rule = await prisma.recurringInvoiceRule.findUnique({ where: { id: ctx.params.id } });
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!VALID_STATUS.has(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      data.status = status;
    }
    if (nextRunAt !== undefined) {
      const dt = new Date(nextRunAt);
      if (Number.isNaN(dt.getTime())) {
        return NextResponse.json({ error: 'Invalid nextRunAt' }, { status: 400 });
      }
      data.nextRunAt = dt;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.recurringInvoiceRule.update({
      where: { id: rule.id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'recurring.admin-update',
        targetId: rule.id,
        details: JSON.stringify({
          targetId: rule.id,
          changes: data,
          actorAdminId: admin.id,
          prevStatus: rule.status,
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (code === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('PATCH /api/admin/recurring-invoices/[id] error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
