import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** GET /api/admin/notifications — List admin's own notifications */
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();

    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('perPage') || '20', 10);

    const skip = (page - 1) * perPage;

    const where: any = { userId: admin.id };
    if (unreadOnly) where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.notification.count({ where });

    return NextResponse.json(
      {
        success: true,
        data: notifications,
        pagination: {
          page,
          perPage,
          total,
          pages: Math.ceil(total / perPage),
        },
      },
      { status: 200 },
    );
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.code === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: e.message ?? 'Forbidden' }, { status: 403 });
    }
    console.error('Error in GET /api/admin/notifications:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}

/** POST /api/admin/notifications — Broadcast notification to users */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();

    const body = await req.json();
    const { title, message, type, userIds, broadcast } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'title is required and must be a string' },
        { status: 400 },
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'message is required and must be a string' },
        { status: 400 },
      );
    }

    let targetUserIds: string[] = [];

    if (broadcast === true) {
      // Send to all users
      const allUsers = await prisma.user.findMany({
        select: { id: true },
      });
      targetUserIds = allUsers.map((u) => u.id);
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      // Send to specific users
      targetUserIds = userIds;
    } else {
      return NextResponse.json(
        { success: false, error: 'Either broadcast=true or userIds array is required' },
        { status: 400 },
      );
    }

    // Create notifications for all target users
    const notifications = await Promise.all(
      targetUserIds.map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            title,
            message,
            type: type || 'info',
          },
        }),
      ),
    );

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'notification.broadcast',
        details: JSON.stringify({
          title,
          message,
          type: type || 'info',
          broadcast,
          targetCount: targetUserIds.length,
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          count: notifications.length,
          broadcast,
        },
      },
      { status: 201 },
    );
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.code === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: e.message ?? 'Forbidden' }, { status: 403 });
    }
    console.error('Error in POST /api/admin/notifications:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
