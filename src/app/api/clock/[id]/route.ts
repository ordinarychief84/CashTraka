import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/** PATCH /api/clock/[id] — clock out (sets clockOut + computes hoursWorked). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entry = await prisma.clockEntry.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (entry.clockOut) {
    return NextResponse.json({ error: 'Already clocked out' }, { status: 409 });
  }

  const now = new Date();
  const diffMs = now.getTime() - entry.clockIn.getTime();
  const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // 2 decimals

  await prisma.clockEntry.update({
    where: { id: entry.id },
    data: { clockOut: now, hoursWorked: hours },
  });

  return NextResponse.json({ ok: true, hoursWorked: hours });
}

/** DELETE /api/clock/[id] — delete a clock entry. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entry = await prisma.clockEntry.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.clockEntry.delete({ where: { id: entry.id } });
  return NextResponse.json({ ok: true });
}
