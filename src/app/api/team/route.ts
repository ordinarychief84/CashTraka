import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { enforceQuota } from '@/lib/gate';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  pin: z.string().trim().max(6).optional().or(z.literal('')),
  role: z.string().trim().max(60).optional().or(z.literal('')),
  hourlyRate: z.coerce.number().int().nonnegative().optional(),
  dailyRate: z.coerce.number().int().nonnegative().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const staff = await prisma.staffMember.findMany({
    where: { userId: user.id, status: 'active' },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(staff);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await enforceQuota(user, 'create_staff');
  if (gate) return gate;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const { name, phone, pin, role, hourlyRate, dailyRate } = parsed.data;

  const member = await prisma.staffMember.create({
    data: {
      userId: user.id,
      name: name.trim(),
      phone: phone || null,
      pin: pin || null,
      role: role || null,
      hourlyRate: hourlyRate ?? null,
      dailyRate: dailyRate ?? null,
    },
  });

  return NextResponse.json({ id: member.id });
}
