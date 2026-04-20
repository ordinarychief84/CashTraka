import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { ASSIGNABLE_ADMIN_ROLES } from '@/lib/admin-rbac';
import type { AdminRole } from '@/lib/admin-rbac';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/staff/[id] */
export async function GET(_req: Request, ctx: Ctx) {
  await requireAdmin();
  const { id } = await ctx.params;
  const staff = await prisma.adminStaff.findUnique({ where: { id } });
  if (!staff) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ staff });
}

/** PATCH /api/admin/staff/[id] — change role or status */
export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const { adminRole, status } = body;

    const existing = await prisma.adminStaff.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data: Record<string, unknown> = {};

    if (adminRole !== undefined) {
      if (!ASSIGNABLE_ADMIN_ROLES.includes(adminRole as AdminRole)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      data.adminRole = adminRole;
    }

    if (status !== undefined) {
      if (!['active', 'suspended', 'revoked'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      data.status = status;
    }

    const updated = await prisma.adminStaff.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'staff.update',
        targetId: id,
        details: JSON.stringify({ changes: data }),
      },
    });

    return NextResponse.json({ staff: updated });
  } catch (err) {
    console.error('PATCH /api/admin/staff/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** DELETE /api/admin/staff/[id] — revoke access */
export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  try {
    const existing = await prisma.adminStaff.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.adminStaff.update({
      where: { id },
      data: { status: 'revoked', inviteToken: null },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'staff.revoke',
        targetId: id,
        details: JSON.stringify({ email: existing.email, role: existing.adminRole }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/staff/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
