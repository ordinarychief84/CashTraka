import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/** Called after the seller sends a reminder via WhatsApp. Advances nextDueAt. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (\!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id } = body;
  if (\!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const schedule = await prisma.reminderSchedule.findFirst({
    where: { id, userId: user.id },
  });
  if (\!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const intervalDays =
    schedule.frequency === 'daily' ? 1
    : schedule.frequency === 'every_3_days' ? 3
    : schedule.frequency === 'weekly' ? 7
    : schedule.intervalDays;

  const next = new Date();
  next.setDate(next.getDate() + intervalDays);
  next.setHours(9, 0, 0, 0);

  await prisma.reminderSchedule.update({
    where: { id: schedule.id },
    data: { lastSentAt: new Date(), nextDueAt: next },
  });

  return NextResponse.json({ ok: true, nextDueAt: next });
}
