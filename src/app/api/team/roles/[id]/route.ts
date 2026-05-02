import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';

const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  description: z.string().trim().max(200).optional(),
  baseRole: z.enum(['MANAGER', 'CASHIER', 'VIEWER']).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

/** PATCH /api/team/roles/:id, update a custom role */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const role = await prisma.customRole.findFirst({
      where: { id, userId: user.id },
    });
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      );
    }

    const { name, description, baseRole, color } = parsed.data;

    // Check for duplicate name if changing it
    if (name && name !== role.name) {
      const dup = await prisma.customRole.findUnique({
        where: { userId_name: { userId: user.id, name } },
      });
      if (dup) return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description || null;
    if (baseRole !== undefined) {
      data.baseRole = baseRole;
      // Also update all staff members' accessRole to match the new base
      await prisma.staffMember.updateMany({
        where: { customRoleId: id, userId: user.id, accessRole: { not: 'NONE' } },
        data: { accessRole: baseRole },
      });
    }
    if (color !== undefined) data.color = color;

    const updated = await prisma.customRole.update({
      where: { id },
      data,
      include: { _count: { select: { staffMembers: true } } },
    });

    return NextResponse.json({ data: updated });
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('UPDATE_ROLE_ERROR:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** DELETE /api/team/roles/:id, delete a custom role (unassign staff, don't delete them) */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const role = await prisma.customRole.findFirst({
      where: { id, userId: user.id },
      include: { _count: { select: { staffMembers: true } } },
    });
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    // Unassign staff from this role (don't delete staff, just clear their customRoleId)
    await prisma.staffMember.updateMany({
      where: { customRoleId: id, userId: user.id },
      data: { customRoleId: null },
    });

    await prisma.customRole.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('DELETE_ROLE_ERROR:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
