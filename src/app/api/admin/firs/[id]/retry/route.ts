import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { firsInvoiceService } from '@/lib/services/firs-invoice.service';
import { documentAudit } from '@/lib/services/document-audit.service';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** POST /api/admin/firs/[id]/retry, admin force-retry FIRS submission. */
export async function POST(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireAdmin();

    const invoice = await prisma.invoice.findUnique({
      where: { id: ctx.params.id },
      select: { id: true, userId: true, firsStatus: true, firsRetryCount: true },
    });
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let result: unknown = null;
    let errorMsg: string | null = null;
    try {
      result = await firsInvoiceService.retrySubmission(invoice.userId, invoice.id);
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : 'Retry failed';
    }

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'firs.admin-retry',
        targetId: invoice.id,
        details: JSON.stringify({
          targetId: invoice.id,
          actorAdminId: admin.id,
          prevStatus: invoice.firsStatus,
          prevRetryCount: invoice.firsRetryCount,
          error: errorMsg,
        }),
      },
    });

    await documentAudit.log({
      userId: invoice.userId,
      actorId: admin.id,
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: 'FIRS_SUBMITTED',
      metadata: { adminRetry: true, error: errorMsg },
    });

    if (errorMsg) {
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (code === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('POST /api/admin/firs/[id]/retry error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
