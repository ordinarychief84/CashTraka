import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ROLES } from '@/lib/constants/roles';

/** DELETE /api/admin/roles/[id] — Demote an admin back to USER */
export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const targetUserId = ctx.params.id;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 },
      );
    }

    // Cannot demote yourself
    if (admin.id === targetUserId) {
      return NextResponse.json(
        { success: false, error: 'You cannot demote yourself' },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role !== ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'User is not an admin' },
        { status: 400 },
      );
    }

    // Update user role to USER
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: ROLES.USER },
    });

    // Create AdminNote
    await prisma.adminNote.create({
      data: {
        adminUserId: admin.id,
        targetUserId: targetUserId,
        note: 'Demoted from admin to user',
      },
    });

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'user.demote',
        targetId: targetUserId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      },
      { status: 200 },
    );
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.code === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: e.message ?? 'Forbidden' }, { status: 403 });
    }
    console.error('Error in DELETE /api/admin/roles/[id]:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
