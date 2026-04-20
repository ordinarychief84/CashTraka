import { requireAdmin, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** GET /api/admin/support — List all support tickets with pagination */
export async function GET(req: Request) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const assignedTo = url.searchParams.get('assignedTo');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('perPage') || '20', 10);

    const skip = (page - 1) * perPage;

    // Validate filter values to prevent arbitrary field injection
    const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
    const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    const where: any = {};
    if (status && VALID_STATUSES.includes(status)) where.status = status;
    if (priority && VALID_PRIORITIES.includes(priority)) where.priority = priority;
    if (assignedTo && /^[a-zA-Z0-9_-]+$/.test(assignedTo)) where.assignedTo = assignedTo;

    const tickets = await prisma.supportTicket.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: true,
      },
    });

    const total = await prisma.supportTicket.count({ where });

    const ticketsWithReplyCount = tickets.map((ticket) => ({
      ...ticket,
      replyCount: ticket.replies.length,
      replies: undefined,
    }));

    return NextResponse.json(
      {
        success: true,
        data: ticketsWithReplyCount,
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
    console.error('Error in GET /api/admin/support:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}

/** POST /api/admin/support — Create a ticket */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, description, priority } = body;

    if (!subject || typeof subject !== 'string') {
      return NextResponse.json(
        { success: false, error: 'subject is required and must be a string' },
        { status: 400 },
      );
    }

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'description is required and must be a string' },
        { status: 400 },
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject,
        description,
        priority: priority || 'medium',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...ticket,
          replyCount: ticket.replies.length,
          replies: undefined,
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
    console.error('Error in POST /api/admin/support:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
