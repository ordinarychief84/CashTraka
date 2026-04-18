import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** GET /api/notifications — Return notifications for current user */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    const where: any = { userId: user.id };
    if (unreadOnly) where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: notifications }, { status: 200 });
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in GET /api/notifications:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}

/** PATCH /api/notifications — Mark as read for current user */
export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ids, all } = body;

    if (all === true) {
      // Mark all unread notifications for current user as read
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
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
          userId: user.id,
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
    console.error('Error in PATCH /api/notifications:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
