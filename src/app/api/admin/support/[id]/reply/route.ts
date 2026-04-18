import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** POST /api/admin/support/[id]/reply — Add reply to ticket */
export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();

    const ticketId = ctx.params.id;
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'message is required and must be a string' },
        { status: 400 },
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    // Create the reply
    const reply = await prisma.ticketReply.create({
      data: {
        ticketId,
        userId: admin.id,
        message,
        isAdmin: true,
      },
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

    // Create notification for the ticket owner (if not the admin themselves)
    if (ticket.userId !== admin.id) {
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          type: 'info',
          title: 'Support Ticket Reply',
          message: `Admin replied to your ticket: "${ticket.subject}"`,
          link: `/support/${ticketId}`,
        },
      });
    }

    return NextResponse.json({ success: true, data: reply }, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.code === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: e.message ?? 'Forbidden' }, { status: 403 });
    }
    console.error('Error in POST /api/admin/support/[id]/reply:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
