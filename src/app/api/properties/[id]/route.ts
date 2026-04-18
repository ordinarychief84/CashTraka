import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  address: z.string().trim().optional(),
  unitCount: z.coerce.number().int().min(0).optional(),
  note: z.string().trim().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const property = await prisma.property.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  await prisma.property.update({
    where: { id: property.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.address !== undefined && { address: parsed.data.address || null }),
      ...(parsed.data.unitCount !== undefined && { unitCount: parsed.data.unitCount }),
      ...(parsed.data.note !== undefined && { note: parsed.data.note || null }),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const property = await prisma.property.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.property.delete({ where: { id: property.id } });
  return NextResponse.json({ ok: true });
}
