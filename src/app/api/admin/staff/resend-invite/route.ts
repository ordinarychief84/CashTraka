import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { randomBytes, createHash } from 'crypto';

/** POST /api/admin/staff/resend-invite — resend invitation email */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  try {
    const { staffId } = await req.json();
    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 });
    }

    const staff = await prisma.adminStaff.findUnique({ where: { id: staffId } });
    if (!staff) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (staff.status !== 'invited') {
      return NextResponse.json(
        { error: 'Can only resend to pending invites' },
        { status: 400 },
      );
    }

    // Generate new token — store hash, share raw
    const rawToken = randomBytes(32).toString('hex');
    const inviteToken = createHash('sha256').update(rawToken).digest('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.adminStaff.update({
      where: { id: staffId },
      data: { inviteToken, inviteExpiresAt },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/staff/accept-invite/${rawToken}`;

    const { emailService } = await import('@/lib/services/email.service');
    await emailService.sendStaffInvite({
      to: staff.email,
      name: staff.name,
      role: staff.adminRole,
      inviteUrl,
      invitedBy: admin.name,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admin/staff/resend-invite error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
