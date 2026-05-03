import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { expenseSchema } from '@/lib/validators';
import { requireFeature } from '@/lib/gate';
import { expenseService } from '@/lib/services/expense.service';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feature = await requireFeature(user, 'expenses');
  if (feature) return feature;

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') as 'business' | 'personal' | null;
  const category = url.searchParams.get('category') || undefined;
  const search = url.searchParams.get('q') || undefined;
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const limit = Number(url.searchParams.get('limit')) || 50;
  const offset = Number(url.searchParams.get('offset')) || 0;

  const { expenses, total } = await expenseService.list(user.id, {
    kind: kind || undefined,
    category,
    search,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    limit: Math.min(limit, 100),
    offset,
  });

  return NextResponse.json({ expenses, total });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feature = await requireFeature(user, 'expenses');
  if (feature) return feature;

  const body = await req.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const expense = await expenseService.create(user.id, parsed.data);
  return NextResponse.json({ id: expense.id });
}
