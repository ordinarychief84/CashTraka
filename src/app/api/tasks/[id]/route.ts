import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContext, getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/rbac';

const patchSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  assignedToId: z.string().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  dueDate: z.string().optional().nullable(),
  /** Optional short note when completing — appears on the owner's view. */
  completionNote: z.string().trim().max(300).optional(),
});

/**
 * PATCH /api/tasks/[id]
 *
 * Dual-principal handler:
 *   - OWNER    can edit every field on tasks they own.
 *   - STAFF    can only patch status / completionNote AND only on tasks
 *              assigned to them. Everything else comes back 403.
 *
 * When `status` flips to "done", we record `completedAt` + who completed
 * it (completedByKind + completedById) so the owner sees attribution.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isStaff = !ctx.isOwner;
  const myStaffId = ctx.staff?.id ?? null;

  const task = await prisma.task.findFirst({
    where: {
      id: params.id,
      userId: ctx.owner.id,
      // Staff can only see/touch tasks explicitly assigned to them.
      ...(isStaff ? { assignedToId: myStaffId ?? '__none__' } : {}),
    },
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

  const { title, description, assignedToId, priority, status, dueDate, completionNote } = parsed.data;

  // Staff are restricted to status + completionNote only. Reject any
  // attempt to edit anything else rather than silently dropping the fields.
  if (isStaff) {
    const hasRestrictedEdit =
      title !== undefined ||
      description !== undefined ||
      assignedToId !== undefined ||
      priority !== undefined ||
      dueDate !== undefined;
    if (hasRestrictedEdit) {
      return NextResponse.json(
        { error: 'You can only update the status of tasks assigned to you.' },
        { status: 403 },
      );
    }
    // Also require tasks.write permission (Manager/Cashier have it, Viewer doesn't).
    if (!can(ctx.accessRole, 'tasks.write')) {
      return NextResponse.json(
        { error: 'Your role does not allow changing task status.' },
        { status: 403 },
      );
    }
  }

  const data: Record<string, unknown> = {};

  if (title !== undefined) data.title = title.trim();
  if (description !== undefined) data.description = description || null;
  if (assignedToId !== undefined) {
    if (assignedToId) {
      const staff = await prisma.staffMember.findFirst({
        where: { id: assignedToId, userId: ctx.owner.id },
        select: { id: true },
      });
      if (!staff) {
        return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
      }
    }
    data.assignedToId = assignedToId || null;
  }
  if (priority !== undefined) data.priority = priority;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

  if (status !== undefined) {
    data.status = status;
    if (status === 'done') {
      data.completedAt = new Date();
      data.completedByKind = isStaff ? 'staff' : 'owner';
      data.completedById = isStaff ? myStaffId : ctx.owner.id;
      if (completionNote !== undefined) {
        data.completionNote = completionNote || null;
      }
    } else if (task.status === 'done') {
      // Reopened — clear completion attribution.
      data.completedAt = null;
      data.completedByKind = null;
      data.completedById = null;
      data.completionNote = null;
    }
  } else if (completionNote !== undefined && task.status === 'done') {
    // Allow amending the note on an already-done task.
    data.completionNote = completionNote || null;
  }

  await prisma.task.update({
    where: { id: task.id },
    data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  // Only the owner can delete tasks — not the assigned staff.
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const task = await prisma.task.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.task.delete({ where: { id: task.id } });
  return NextResponse.json({ ok: true });
}
