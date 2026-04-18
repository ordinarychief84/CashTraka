import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** PATCH /api/admin/notifications/read — Mark notifications as read */
export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();

    const body = await req.json();
    const { ids, all } = body;

    if (all === true) {
      // Mark all unread notifications for current user as read
      await prisma.notification.updateMany({
        where: {
          userId: admin.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return NextResponse.json(
        { success: true, data: { message: 'All unread notifications marked as read' } },
        { status: 200 },
      );
    }

    if (Array.isArray(ids) && ids.length > 0) {
      // Mark specified notification ids as read
      await prisma.notification.updateMany({
        where: {
          id: { in: ids },
          userId: admin.id,
        },
        data: {
          isRead: true,
        },
      });

      return NextResponse.json(
        { success: true, data: { message: `${ids.length} notification(s) marked as read` } },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Either ids array or all=true is required' },
      { status: 400 },
    );
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.code === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: e.message ?? 'Forbidden' }, { status: 403 });
    }
    console.error('Error in PATCH /api/admin/notifications/read:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
