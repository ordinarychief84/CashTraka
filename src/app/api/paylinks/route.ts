import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { paylinkService } from '@/lib/services/paylink.service';
import { prisma } from '@/lib/prisma';

/** GET /api/paylinks, list user's payment request links */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const take = Number(url.searchParams.get('take')) || 50;
  const skip = Number(url.searchParams.get('skip')) || 0;

  const result = await paylinkService.list(user.id, { status, take, skip });
  return NextResponse.json(result);
}

/** POST /api/paylinks, create a new payment request link */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { customerName, customerPhone, amount, description, customerId, debtId, expiresInDays } = body;

    if (!customerName || !customerPhone || !amount || amount <= 0) {
      return NextResponse.json({ error: 'customerName, customerPhone, and a positive amount are required' }, { status: 400 });
    }

    if (customerId) {
      const cust = await prisma.customer.findFirst({ where: { id: customerId, userId: user.id } });
      if (!cust) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (debtId) {
      const debt = await prisma.debt.findFirst({ where: { id: debtId, userId: user.id } });
      if (!debt) return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    const paylink = await paylinkService.create({
      userId: user.id,
      customerId,
      customerName,
      customerPhone,
      amount: Math.round(Number(amount)),
      description,
      debtId,
      expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
    });

    return NextResponse.json(paylink, { status: 201 });
  } catch (err: unknown) {
    console.error('POST /api/paylinks error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
