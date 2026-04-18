import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (\!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (\!q) return NextResponse.json({ customers: [], payments: [], debts: [] });

  const digits = q.replace(/\D/g, '');

  const [customers, payments, debts] = await Promise.all([
    prisma.customer.findMany({
      where: {
        userId: user.id,
        OR: [
          { name: { contains: q } },
          ...(digits ? [{ phone: { contains: digits } }] : []),
        ],
      },
      orderBy: { lastActivityAt: 'desc' },
      take: 10,
    }),
    prisma.payment.findMany({
      where: {
        userId: user.id,
        OR: [
          { customerNameSnapshot: { contains: q } },
          ...(digits ? [{ phoneSnapshot: { contains: digits } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.debt.findMany({
      where: {
        userId: user.id,
        OR: [
          { customerNameSnapshot: { contains: q } },
          ...(digits ? [{ phoneSnapshot: { contains: digits } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return NextResponse.json({ customers, payments, debts });
}
