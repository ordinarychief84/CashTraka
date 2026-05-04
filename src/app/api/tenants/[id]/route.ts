import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { nairaToKobo } from '@/lib/money';

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(7).optional(),
  unitLabel: z.string().trim().optional(),
  rentAmount: z.coerce.number().int().positive().optional(),
  rentDueDay: z.coerce.number().int().min(1).max(28).optional(),
  rentFrequency: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  leaseStart: z.string().optional(),
  leaseEnd: z.string().optional(),
  status: z.enum(['active', 'moved_out', 'evicted']).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenant = await prisma.tenant.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const d = parsed.data;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      ...(d.name !== undefined && { name: d.name }),
      ...(d.phone !== undefined && { phone: d.phone }),
      ...(d.unitLabel !== undefined && { unitLabel: d.unitLabel || null }),
      ...(d.rentAmount !== undefined && {
        rentAmount: d.rentAmount,
        rentAmountKobo: nairaToKobo(d.rentAmount),
      }),
      ...(d.rentDueDay !== undefined && { rentDueDay: d.rentDueDay }),
      ...(d.rentFrequency !== undefined && { rentFrequency: d.rentFrequency }),
      ...(d.leaseStart !== undefined && { leaseStart: d.leaseStart ? new Date(d.leaseStart) : null }),
      ...(d.leaseEnd !== undefined && { leaseEnd: d.leaseEnd ? new Date(d.leaseEnd) : null }),
      ...(d.status !== undefined && { status: d.status }),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenant = await prisma.tenant.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.tenant.delete({ where: { id: tenant.id } });
  return NextResponse.json({ ok: true });
}
