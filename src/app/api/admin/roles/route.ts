import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ROLES } from '@/lib/constants/roles';

/** GET /api/admin/roles, Return all users with role ADMIN */
export async function GET() {
  try {
    await requireAdmin();

    const admins = await prisma.user.findMany({
      where: { role: ROLES.ADMIN },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return NextResponse.json({ success: true, data: admins }, { status: 200 });
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (e?.code === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: e.message ?? 'Forbidden' }, { status: 403 });
    }
    console.error('Error in GET /api/admin/roles:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}

/** POST /api/admin/roles, Promote a user to admin */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();

    const body = await req.json();
    const { userId, reason } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userId is required and must be a string' },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role === ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'User is already an admin' },
        { status: 400 },
      );
    }

    // Update user role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: ROLES.ADMIN },
    });

    // Create AdminNote
    await prisma.adminNote.create({
      data: {
        adminUserId: admin.id,
        targetUserId: userId,
        note: `Promoted to admin. Reason: ${reason || 'No reason provided'}`,
      },
    });

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'user.promote',
        targetId: userId,
        details: JSON.stringify({ reason: reason || null }),
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
    console.error('Error in POST /api/admin/roles:', e);
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 });
  }
}
