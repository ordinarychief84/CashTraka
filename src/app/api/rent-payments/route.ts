import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { nairaToKobo } from '@/lib/money';

const createSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  amount: z.coerce.number().int().positive('Amount must be positive'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
  status: z.enum(['PAID', 'PARTIAL', 'PENDING', 'OVERDUE']).default('PAID'),
  note: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const { tenantId, amount, period, status, note } = parsed.data;

  // Verify user owns the tenant
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, userId: user.id },
  });
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Check if a payment already exists for this tenant+period — upsert it
  const existing = await prisma.rentPayment.findUnique({
    where: { tenantId_period: { tenantId, period } },
  });

  if (existing) {
    const updated = await prisma.rentPayment.update({
      where: { id: existing.id },
      data: {
        amount,
        amountKobo: nairaToKobo(amount),
        status,
        note: note || null,
        paidAt: status === 'PAID' ? new Date() : existing.paidAt,
      },
    });
    return NextResponse.json({ id: updated.id, updated: true });
  }

  const payment = await prisma.rentPayment.create({
    data: {
      userId: user.id,
      tenantId,
      amount,
      amountKobo: nairaToKobo(amount),
      period,
      status,
      note: note || null,
      paidAt: status === 'PAID' ? new Date() : null,
    },
  });

  return NextResponse.json({ id: payment.id });
}
