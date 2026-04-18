import { requireAdmin, verifyPassword, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/** PATCH /api/admin/password — Change admin's own password */
export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { success: false, error: 'currentPassword is required' },
        { status: 400 },
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { success: false, error: 'newPassword is required' },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'newPassword must be at least 8 characters' },
        { status: 400 },
      );
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 },
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user's password
    const updatedAdmin = await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: hashedPassword },
    });

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'password.change',
        targetId: admin.id,
      },
    });

    return NextResponse.json(
      { success: true, data: { id: updatedAdmin.id, email: updatedAdmin.email } },
      { status: 200 },
    );
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.code === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: e.message ?? 'Forbidden' }, { status: 403 });
    }
    console.error('Error in PATCH /api/admin/password:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
