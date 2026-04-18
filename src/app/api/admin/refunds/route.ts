import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** GET /api/admin/refunds — List all refunds with pagination */
export async function GET(req: Request) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('perPage') || '20', 10);

    const skip = (page - 1) * perPage;

    const where: any = {};
    if (status) where.status = status;

    const refunds = await prisma.refund.findMany({
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
        paymentAttempt: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const total = await prisma.refund.count({ where });

    return NextResponse.json(
      {
        success: true,
        data: refunds,
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
    console.error('Error in GET /api/admin/refunds:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}

/** POST /api/admin/refunds — Create a refund request */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { userId, paymentAttemptId, amount, reason } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userId is required and must be a string' },
        { status: 400 },
      );
    }

    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        { success: false, error: 'amount is required and must be a number' },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { success: false, error: 'reason is required and must be a string' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (paymentAttemptId) {
      const paymentAttempt = await prisma.paymentAttempt.findUnique({
        where: { id: paymentAttemptId },
      });

      if (!paymentAttempt) {
        return NextResponse.json(
          { success: false, error: 'Payment attempt not found' },
          { status: 404 },
        );
      }
    }

    const refund = await prisma.refund.create({
      data: {
        userId,
        paymentAttemptId: paymentAttemptId || null,
        amount,
        reason,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        paymentAttempt: true,
      },
    });

    return NextResponse.json({ success: true, data: refund }, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.code === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: e.message ?? 'Forbidden' }, { status: 403 });
    }
    console.error('Error in POST /api/admin/refunds:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
