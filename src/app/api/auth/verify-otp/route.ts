import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    // Rate limit: 5 attempts per user per 15 min (tightened from 10)
    const ip = clientIp(req);
    const limited = await rateLimit('verify-otp', `${user.id}-${ip}`, {
      max: 5,
      windowMs: 15 * 60_000,
    });
    if (!limited.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a few minutes.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const code = String(body.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Enter a valid 6-digit code' }, { status: 400 });
    }

    // Find the latest unused verification for this user
    const verification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: 3 },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return NextResponse.json(
        { error: 'No valid code found. Please request a new one.' },
        { status: 400 },
      );
    }

    const codeHash = sha256(code);
    if (codeHash !== verification.codeHash) {
      // Increment attempts
      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = 2 - verification.attempts;
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Wrong code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left.`
              : 'Too many wrong attempts. Please request a new code.',
        },
        { status: 400 },
      );
    }

    // Success — mark verification used and user verified
    await prisma.$transaction([
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('VERIFY_OTP_ERROR:', e instanceof Error ? e.message : 'unknown');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
