import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { expenseSchema } from '@/lib/validators';
import { expenseService } from '@/lib/services/expense.service';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expense = await expenseService.get(user.id, params.id);
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(expense);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expense = await prisma.expense.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = expenseSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const { amount, category, note, incurredOn, kind } = parsed.data;

  await prisma.expense.update({
    where: { id: expense.id },
    data: {
      amount: amount ?? expense.amount,
      category: category ?? expense.category,
      note: note === undefined ? expense.note : note || null,
      kind: kind ?? expense.kind,
      incurredOn: incurredOn ? new Date(incurredOn) : expense.incurredOn,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expense = await prisma.expense.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.expense.delete({ where: { id: expense.id } });
  return NextResponse.json({ ok: true });
}
