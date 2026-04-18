import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { emailService } from '@/lib/services/email.service';

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function generateOtp(): string {
  // Cryptographically random 6-digit code (100000–999999)
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE(0) % 900000;
  return String(num + 100000);
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

    // Rate limit: 3 resends per user per 10 min
    const ip = clientIp(req);
    const limited = rateLimit('resend-otp', `${user.id}-${ip}`, {
      max: 3,
      windowMs: 10 * 60_000,
    });
    if (!limited.allowed) {
      return NextResponse.json(
        { error: `Please wait ${Math.ceil(limited.retryAfter / 60)} min before requesting again.` },
        { status: 429 },
      );
    }

    // Invalidate old codes
    await prisma.emailVerification.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { expiresAt: new Date() },
    });

    // Generate new OTP
    const otp = generateOtp();
    const codeHash = sha256(otp);
    const expiresAt = new Date(Date.now() + 10 * 60_000); // 10 minutes

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt,
      },
    });

    // Send email
    await emailService.sendVerificationOtp({
      to: user.email,
      name: user.name,
      code: otp,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('RESEND_OTP_ERROR:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
