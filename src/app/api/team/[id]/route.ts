import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().max(30).optional(),
  pin: z.string().trim().max(6).optional(),
  role: z.string().trim().max(60).optional(),
  hourlyRate: z.coerce.number().int().nonnegative().optional(),
  dailyRate: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await prisma.staffMember.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  await prisma.staffMember.update({
    where: { id: member.id },
    data: {
      name: parsed.data.name ?? member.name,
      phone: parsed.data.phone !== undefined ? (parsed.data.phone || null) : member.phone,
      pin: parsed.data.pin !== undefined ? (parsed.data.pin || null) : member.pin,
      role: parsed.data.role !== undefined ? (parsed.data.role || null) : member.role,
      hourlyRate: parsed.data.hourlyRate !== undefined ? parsed.data.hourlyRate : member.hourlyRate,
      dailyRate: parsed.data.dailyRate !== undefined ? parsed.data.dailyRate : member.dailyRate,
      status: parsed.data.status ?? member.status,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await prisma.staffMember.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Soft-delete by marking inactive (preserves clock history)
  await prisma.staffMember.update({
    where: { id: member.id },
    data: { status: 'inactive' },
  });
  return NextResponse.json({ ok: true });
}
