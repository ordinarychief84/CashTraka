import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [payments, debts, latestDebt] = await Promise.all([
    prisma.payment.count({ where: { userId: user.id } }),
    prisma.debt.count({ where: { userId: user.id } }),
    prisma.debt.findFirst({
      where: { userId: user.id, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    payments,
    debts,
    latestDebt: latestDebt
      ? {
          id: latestDebt.id,
          customerName: latestDebt.customerNameSnapshot,
          phone: latestDebt.phoneSnapshot,
          amountOwed: latestDebt.amountOwed,
        }
      : null,
    // Landlord vertical removed: these fields stay in the response (set to
    // null/zero) so any in-flight client still parsing them doesn't crash.
    properties: 0,
    tenants: 0,
    latestProperty: null,
    latestTenant: null,
  });
}
