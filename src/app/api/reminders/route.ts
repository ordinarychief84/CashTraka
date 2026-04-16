import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const createSchema = z.object({
  debtId: z.string().min(1),
  frequency: z.enum(['daily', 'every_3_days', 'weekly', 'custom']).default('weekly'),
  intervalDays: z.coerce.number().int().min(1).max(90).default(7),
});

function computeNextDue(frequency: string, intervalDays: number): Date {
  const d = new Date();
  const days =
    frequency === 'daily' ? 1
    : frequency === 'every_3_days' ? 3
    : frequency === 'weekly' ? 7
    : intervalDays;
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0); // Surface at 9 AM
  return d;
}

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
  const { debtId, frequency, intervalDays } = parsed.data;

  // Verify debt belongs to user and is OPEN.
  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId: user.id, status: 'OPEN' },
  });
  if (!debt) {
    return NextResponse.json(
      { error: 'Debt not found or already paid' },
      { status: 404 },
    );
  }

  // Upsert: one schedule per debt.
  const nextDueAt = computeNextDue(frequency, intervalDays);
  const existing = await prisma.reminderSchedule.findFirst({
    where: { debtId, userId: user.id },
  });

  if (existing) {
    await prisma.reminderSchedule.update({
      where: { id: existing.id },
      data: { frequency, intervalDays, nextDueAt, enabled: true },
    });
    return NextResponse.json({ id: existing.id, nextDueAt });
  }

  const schedule = await prisma.reminderSchedule.create({
    data: {
      userId: user.id,
      debtId,
      frequency,
      intervalDays,
      nextDueAt,
    },
  });
  return NextResponse.json({ id: schedule.id, nextDueAt });
}
