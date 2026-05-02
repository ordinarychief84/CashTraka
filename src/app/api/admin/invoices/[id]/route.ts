import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireAdminOrStaff } from '@/lib/auth';
import { adminCan } from '@/lib/admin-rbac';
import type { AdminRole } from '@/lib/admin-rbac';
import { documentAudit } from '@/lib/services/document-audit.service';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** GET /api/admin/invoices/[id], full detail with items, user, credit notes. */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireAdminOrStaff();
    if (!adminCan(admin.adminRole as AdminRole, 'invoices')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: ctx.params.id },
      include: {
        items: true,
        user: {
          select: {
            id: true, name: true, email: true, businessName: true,
            businessAddress: true, whatsappNumber: true, plan: true,
          },
        },
        customer: { select: { id: true, name: true, phone: true } },
        creditNotes: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, amount: true, status: true, createdAt: true,
            customerNameSnapshot: true, verified: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const creditNoteTotal = invoice.creditNotes.reduce((s, cn) => s + cn.total, 0);

    return NextResponse.json({ success: true, data: { ...invoice, creditNoteTotal } });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (code === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/admin/invoices/[id] error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/invoices/[id], admin override of invoice status.
 * Only SUPER_ADMIN may force state changes (audit log requires User.id FK).
 * Body: { action: 'force-paid' | 'force-cancelled' | 'force-credited', reason: string }
 */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    // Mutating override requires a real super-admin User row (audit log FK).
    const admin = await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const reason = (body?.reason as string | undefined)?.toString().trim();

    if (!action || !['force-paid', 'force-cancelled', 'force-credited'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }
    if (reason.length > 500) {
      return NextResponse.json({ error: 'reason too long (max 500)' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: ctx.params.id },
      select: { id: true, userId: true, status: true, total: true },
    });
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const prevStatus = invoice.status;
    const data: Record<string, unknown> = {};
    let docAction: 'PAID' | 'CANCELLED' | 'CREDITED' = 'PAID';

    if (action === 'force-paid') {
      data.status = 'PAID';
      data.paidAt = new Date();
      data.amountPaid = invoice.total;
      docAction = 'PAID';
    } else if (action === 'force-cancelled') {
      data.status = 'CANCELLED';
      docAction = 'CANCELLED';
    } else {
      data.status = 'CREDITED';
      docAction = 'CREDITED';
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data,
    });

    // Platform-level admin audit log.
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'invoice.override',
        targetId: invoice.id,
        details: JSON.stringify({
          targetId: invoice.id,
          action,
          reason,
          actorAdminId: admin.id,
          prevStatus,
        }),
      },
    });

    // Per-document audit trail.
    await documentAudit.log({
      userId: invoice.userId,
      actorId: admin.id,
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: docAction,
      metadata: {
        adminOverride: true,
        action,
        reason,
        actorAdminId: admin.id,
        prevStatus,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (code === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('PATCH /api/admin/invoices/[id] error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
