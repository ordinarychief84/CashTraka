import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const ticketSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject too long'),
  description: z.string().trim().min(1, 'Description is required').max(5000, 'Description too long'),
});

/** GET /api/support, List current user's own tickets */
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

/** POST /api/support, Create a ticket */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 5 tickets per user per hour
    const ip = clientIp(req);
    const limited = rateLimit('support-ticket', user.id, { max: 5, windowMs: 60 * 60_000 });
    if (!limited.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many tickets. Try again later.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = ticketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      );
    }
    const { subject, description } = parsed.data;

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
