import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { checkPasswordComplexity, isWeakPassword } from '@/lib/password-policy';

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** POST /api/staff/accept-invite — set password and activate staff account */
export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const complexityErr = checkPasswordComplexity(password);
    if (complexityErr) {
      return NextResponse.json({ error: complexityErr }, { status: 400 });
    }
    if (isWeakPassword(password)) {
      return NextResponse.json(
        { error: 'Please choose a stronger password — that one appears on common-password lists.' },
        { status: 400 },
      );
    }

    const tokenHash = hashToken(token);
    const staff = await prisma.adminStaff.findUnique({
      where: { inviteToken: tokenHash },
    });

    if (!staff) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation link' },
        { status: 404 },
      );
    }

    if (staff.status !== 'invited') {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 },
      );
    }

    if (staff.inviteExpiresAt && staff.inviteExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired. Please ask your admin to resend it.' },
        { status: 410 },
      );
    }

    const passwordHash = await hash(password, 12);

    await prisma.adminStaff.update({
      where: { id: staff.id },
      data: {
        passwordHash,
        status: 'active',
        inviteToken: null,
        inviteExpiresAt: null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Account activated. You can now log in.',
    });
  } catch (err) {
    console.error('POST /api/staff/accept-invite error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** GET /api/staff/accept-invite?token=xxx — validate token */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const staff = await prisma.adminStaff.findUnique({
    where: { inviteToken: tokenHash },
    select: { name: true, email: true, adminRole: true, status: true, inviteExpiresAt: true },
  });

  if (!staff || staff.status !== 'invited') {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
  }

  if (staff.inviteExpiresAt && staff.inviteExpiresAt < new Date()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 410 });
  }

  return NextResponse.json({ staff });
}
