import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { nairaToKobo } from '@/lib/money';

const patchSchema = z.object({
  amount: z.coerce.number().int().positive().optional(),
  status: z.enum(['PAID', 'PARTIAL', 'PENDING', 'OVERDUE']).optional(),
  note: z.string().trim().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payment = await prisma.rentPayment.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const d = parsed.data;

  await prisma.rentPayment.update({
    where: { id: payment.id },
    data: {
      ...(d.amount !== undefined && {
        amount: d.amount,
        amountKobo: nairaToKobo(d.amount),
      }),
      ...(d.status !== undefined && { status: d.status }),
      ...(d.note !== undefined && { note: d.note || null }),
      ...(d.status === 'PAID' && !payment.paidAt && { paidAt: new Date() }),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payment = await prisma.rentPayment.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.rentPayment.delete({ where: { id: payment.id } });
  return NextResponse.json({ ok: true });
}
