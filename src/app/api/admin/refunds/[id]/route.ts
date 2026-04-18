import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** PATCH /api/admin/refunds/[id] — Process a refund */
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();

    const refundId = ctx.params.id;
    const body = await req.json();
    const { status, adminNote } = body;

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { success: false, error: 'status is required and must be a string' },
        { status: 400 },
      );
    }

    if (!['approved', 'processed', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'status must be one of: approved, processed, rejected' },
        { status: 400 },
      );
    }

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        user: true,
      },
    });

    if (!refund) {
      return NextResponse.json({ success: false, error: 'Refund not found' }, { status: 404 });
    }

    const now = new Date();
    const updateData: any = {
      status,
      processedBy: admin.id,
      processedAt: now,
    };

    if (adminNote !== undefined) {
      updateData.adminNote = adminNote;
    }

    // If status is processed, downgrade user plan to free
    if (status === 'processed') {
      updateData.user = {
        update: {
          plan: 'free',
          subscriptionStatus: 'free',
        },
      };
    }

    const updatedRefund = await prisma.refund.update({
      where: { id: refundId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create notification for the user
    const notificationTypes: Record<string, string> = {
      approved: 'info',
      processed: 'success',
      rejected: 'error',
    };

    const notificationMessages: Record<string, string> = {
      approved: 'Your refund request has been approved.',
      processed: 'Your refund has been processed. Your plan has been downgraded to free.',
      rejected: 'Your refund request has been rejected.',
    };

    await prisma.notification.create({
      data: {
        userId: refund.userId,
        type: notificationTypes[status],
        title: 'Refund Status Update',
        message: notificationMessages[status],
      },
    });

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: `refund.${status}`,
        targetId: refundId,
        details: JSON.stringify({ adminNote: adminNote || null }),
      },
    });

    return NextResponse.json({ success: true, data: updatedRefund }, { status: 200 });
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.code === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: e.message ?? 'Forbidden' }, { status: 403 });
    }
    console.error('Error in PATCH /api/admin/refunds/[id]:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
