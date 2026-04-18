import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { templateSchema } from '@/lib/validators';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (\!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const template = await prisma.messageTemplate.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (\!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = templateSchema.partial().safeParse(body);
  if (\!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  await prisma.messageTemplate.update({
    where: { id: template.id },
    data: {
      name: parsed.data.name ?? template.name,
      body: parsed.data.body ?? template.body,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (\!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const template = await prisma.messageTemplate.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (\!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.messageTemplate.delete({ where: { id: template.id } });
  return NextResponse.json({ ok: true });
}
