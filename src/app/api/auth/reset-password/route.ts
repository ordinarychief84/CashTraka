import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isWeakPassword } from '@/lib/password-policy';

export const runtime = 'nodejs';

/**
 * POST /api/auth/reset-password
 *   body: { token: string, password: string }
 *
 * Consumes a password-reset token issued via /api/auth/forgot-password and
 * sets a new password on the matching user. All other outstanding tokens
 * for the user are invalidated so a stolen older link can't be reused.
 */
const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function POST(req: Request) {
  let token: string;
  let password: string;
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || 'Invalid input.' },
        { status: 400 },
      );
    }
    token = parsed.data.token;
    password = parsed.data.password;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 400 },
    );
  }

  if (isWeakPassword(password)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Please choose a stronger password — that one appears on common-password lists.',
      },
      { status: 400 },
    );
  }

  const tokenHash = hashToken(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!row) {
    return NextResponse.json(
      { ok: false, error: 'This reset link is invalid.' },
      { status: 400 },
    );
  }
  if (row.usedAt) {
    return NextResponse.json(
      { ok: false, error: 'This reset link has already been used. Request a new one.' },
      { status: 400 },
    );
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { ok: false, error: 'This reset link has expired. Request a new one.' },
      { status: 400 },
    );
  }
  if (!row.user || row.user.isSuspended) {
    return NextResponse.json(
      { ok: false, error: 'Account unavailable.' },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    // Update user password.
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    // Mark this token used.
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate every OTHER outstanding token for this user — prevents
    // replay of a stolen older link.
    prisma.passwordResetToken.updateMany({
      where: {
        userId: row.userId,
        id: { not: row.id },
        usedAt: null,
      },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
