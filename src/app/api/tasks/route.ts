import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireFeature } from '@/lib/gate';

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional().or(z.literal('')),
  assignedToId: z.string().optional().or(z.literal('')),
  customerId: z.string().optional().or(z.literal('')),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueDate: z.string().optional().or(z.literal('')),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (\!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Plan feature gate — tasks are a Business+ feature.
  const feature = requireFeature(user, 'tasks');
  if (feature) return feature;

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (\!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const { title, description, assignedToId, customerId, priority, dueDate } = parsed.data;

  // IDOR guard: verify assignee + customer belong to this tenant before writing.
  if (assignedToId) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: assignedToId, userId: user.id },
    });
    if (\!staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
  }
  if (customerId) {
    const cust = await prisma.customer.findFirst({
      where: { id: customerId, userId: user.id },
    });
    if (\!cust) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: title.trim(),
      description: description || null,
      assignedToId: assignedToId || null,
      customerId: customerId || null,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  return NextResponse.json({ id: task.id });
}
