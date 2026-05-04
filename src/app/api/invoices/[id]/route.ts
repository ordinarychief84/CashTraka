import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { nairaToKobo } from '@/lib/money';

const patchSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'CANCELLED']).optional(),
  note: z.string().trim().max(500).optional(),
  dueDate: z.string().optional(),
  tax: z.coerce.number().int().nonnegative().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const { status, note, dueDate, tax } = parsed.data;

  const nextTax = tax !== undefined ? tax : invoice.tax;
  const nextTotal = tax !== undefined ? invoice.subtotal + tax : invoice.total;
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: status ?? invoice.status,
      note: note !== undefined ? note || null : invoice.note,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : invoice.dueDate,
      tax: nextTax,
      taxKobo: nairaToKobo(nextTax),
      total: nextTotal,
      totalKobo: nairaToKobo(nextTotal),
      paidAt: status === 'PAID' ? new Date() : invoice.paidAt,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.invoice.delete({ where: { id: invoice.id } });
  return NextResponse.json({ ok: true });
}
