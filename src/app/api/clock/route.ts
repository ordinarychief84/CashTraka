import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const clockInSchema = z.object({
  staffId: z.string().min(1),
  note: z.string().trim().max(200).optional().or(z.literal('')),
});

/** POST /api/clock, clock in a staff member. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = clockInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const staff = await prisma.staffMember.findFirst({
    where: { id: parsed.data.staffId, userId: user.id, status: 'active' },
  });
  if (!staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

  // Check they're not already clocked in (no clockOut yet).
  const openEntry = await prisma.clockEntry.findFirst({
    where: { staffId: staff.id, clockOut: null },
  });
  if (openEntry) {
    return NextResponse.json(
      { error: `${staff.name} is already clocked in since ${openEntry.clockIn.toISOString()}` },
      { status: 409 },
    );
  }

  const entry = await prisma.clockEntry.create({
    data: {
      userId: user.id,
      staffId: staff.id,
      clockIn: new Date(),
      note: parsed.data.note || null,
    },
  });

  return NextResponse.json({ id: entry.id, clockIn: entry.clockIn });
}
