import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/services/email.service';

export const runtime = 'nodejs';

/**
 * POST /api/auth/forgot-password
 *   body: { email: string }
 *
 * Starts a password-reset flow. Always returns 200 with the same generic
 * message — we never reveal whether the email matched an account, so this
 * endpoint cannot be used for user-enumeration.
 *
 * Security notes:
 *   - The raw token goes ONLY into the emailed link. We store sha256(token)
 *     in the DB so a dump doesn't let an attacker take over accounts.
 *   - Token TTL is 30 minutes. After first successful use, the row is
 *     marked used and all other outstanding tokens for the user are
 *     invalidated in the reset endpoint.
 *   - Simple per-email rate limit (3 / hour) keeps a single account from
 *     being flooded with reset mail.
 */
const schema = z.object({
  email: z.string().email().max(200),
});

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_PER_WINDOW = 3;
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min

const GENERIC_RESPONSE = {
  ok: true,
  message:
    'If an account exists for that email, we have sent a link to reset the password.',
};

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function POST(req: Request) {
  let email: string;
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid email address.' },
        { status: 400 },
      );
    }
    email = parsed.data.email.trim().toLowerCase();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Silent no-op for unknown emails — same response shape as the happy path.
  if (!user || user.isSuspended) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  // Rate limit — count recent tokens issued for this user.
  const recentCount = await prisma.passwordResetToken.count({
    where: {
      userId: user.id,
      createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    },
  });
  if (recentCount >= RATE_LIMIT_PER_WINDOW) {
    // Still return generic 200 so we don't leak rate-limit info to enumerators.
    return NextResponse.json(GENERIC_RESPONSE);
  }

  // Mint token.
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  // Fire-and-forget email. We don't surface send-failures to the caller —
  // that would leak account existence. Log server-side instead.
  const appUrl = process.env.APP_URL || new URL(req.url).origin;
  const resetUrl = `${appUrl}/reset-password/${rawToken}`;

  try {
    const result = await emailService.sendPasswordReset({
      to: user.email,
      name: user.name,
      resetUrl,
    });
    if (!result.ok) {
      console.warn('[forgot-password] email failed:', result.error);
    }
  } catch (e) {
    console.warn('[forgot-password] email threw:', e);
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
