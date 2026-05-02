import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * GET /api/order-confirmations → list the current business's order
 * confirmations. Creation is implicit via /api/offers/[id]/convert with
 * `target=ORDER`; we don't expose direct create here yet.
 */
export async function GET(_req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.orderConfirmation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      offer: { select: { offerNumber: true } },
    },
  });
  return NextResponse.json({ success: true, data: rows });
}
