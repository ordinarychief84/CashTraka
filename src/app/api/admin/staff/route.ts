import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { ASSIGNABLE_ADMIN_ROLES } from '@/lib/admin-rbac';
import type { AdminRole } from '@/lib/admin-rbac';
import { randomBytes } from 'crypto';

/** GET /api/admin/staff — list all admin staff */
export async function GET() {
  await requireAdmin();
  const staff = await prisma.adminStaff.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true, email: true } } },
  });
  return NextResponse.json({ staff });
}

/** POST /api/admin/staff — invite new staff member */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  try {
    const body = await req.json();
    const { name, email, adminRole } = body;

    if (!name?.trim() || !email?.trim() || !adminRole) {
      return NextResponse.json(
        { error: 'Name, email, and role are required' },
        { status: 400 },
      );
    }

    if (!ASSIGNABLE_ADMIN_ROLES.includes(adminRole as AdminRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Cannot assign SUPER_ADMIN.' },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existing = await prisma.adminStaff.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A staff member with this email already exists' },
        { status: 409 },
      );
    }

    // Generate invite token
    const inviteToken = randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const staffMember = await prisma.adminStaff.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        adminRole,
        inviteToken,
        inviteExpiresAt,
        createdById: admin.id,
        status: 'invited',
      },
    });

    // Send invite email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/staff/accept-invite/${inviteToken}`;

    const { emailService } = await import('@/lib/services/email.service');
    await emailService.sendStaffInvite({
      to: staffMember.email,
      name: staffMember.name,
      role: staffMember.adminRole,
      inviteUrl,
      invitedBy: admin.name,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'staff.invite',
        targetId: staffMember.id,
        details: JSON.stringify({ name, email: staffMember.email, role: adminRole }),
      },
    });

    return NextResponse.json({ staff: staffMember }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/staff error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
