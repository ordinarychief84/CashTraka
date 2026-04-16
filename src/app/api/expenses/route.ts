import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { expenseSchema } from '@/lib/validators';
import { requireFeature } from '@/lib/gate';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feature = requireFeature(user, 'expenses');
  if (feature) return feature;

  const body = await req.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const { amount, category, note, incurredOn } = parsed.data;

  const expense = await prisma.expense.create({
    data: {
      userId: user.id,
      amount,
      category,
      note: note || null,
      incurredOn: incurredOn ? new Date(incurredOn) : new Date(),
    },
  });

  return NextResponse.json({ id: expense.id });
}
