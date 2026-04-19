import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const checklist = await prisma.checklist.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!checklist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
  if (parsed.data.description !== undefined) data.description = parsed.data.description || null;

  await prisma.checklist.update({ where: { id: checklist.id }, data });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const checklist = await prisma.checklist.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!checklist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.checklist.delete({ where: { id: checklist.id } });
  return NextResponse.json({ ok: true });
}
