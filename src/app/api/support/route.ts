import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** GET /api/support — List current user's own tickets */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
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

    const ticketsWithReplyCount = tickets.map((ticket) => ({
      ...ticket,
      replyCount: ticket.replies.length,
      replies: undefined,
    }));

    return NextResponse.json({ success: true, data: ticketsWithReplyCount }, { status: 200 });
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in GET /api/support:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}

/** POST /api/support — Create a ticket */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, description } = body;

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
        priority: 'medium',
      },
      include: {
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
    console.error('Error in POST /api/support:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
