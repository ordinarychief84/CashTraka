import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const patchSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  assignedToId: z.string().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  dueDate: z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const task = await prisma.task.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  const { title, description, assignedToId, priority, status, dueDate } = parsed.data;

  if (title !== undefined) data.title = title.trim();
  if (description !== undefined) data.description = description || null;
  if (assignedToId !== undefined) data.assignedToId = assignedToId || null;
  if (priority !== undefined) data.priority = priority;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

  if (status !== undefined) {
    data.status = status;
    if (status === 'done') {
      data.completedAt = new Date();
    } else if (task.status === 'done') {
      data.completedAt = null;
    }
  }

  await prisma.task.update({
    where: { id: task.id },
    data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const task = await prisma.task.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.task.delete({ where: { id: task.id } });
  return NextResponse.json({ ok: true });
}
