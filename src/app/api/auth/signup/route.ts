import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { signupSchema } from '@/lib/validators';
import { ok, fail, validationFail } from '@/lib/api-response';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { isWeakPassword } from '@/lib/password-policy';
import { emailService } from '@/lib/services/email.service';

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function generateOtp(): string {
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE(0) % 900000;
  return String(num + 100000);
}

export async function POST(req: Request) {
  try {
    // Rate limit — 5 new accounts per IP per hour
    const ip = clientIp(req);
    const limited = rateLimit('signup', ip, { max: 5, windowMs: 60 * 60_000 });
    if (!limited.allowed) {
      return fail(
        `Too many sign-ups from this network. Try again in ${Math.ceil(limited.retryAfter / 60)} min.`,
        429,
      );
    }

    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const { name, email, password, businessType, termsAccepted } = parsed.data;

    // Terms & Privacy must be accepted
    if (!termsAccepted) {
      return fail('You must accept the Terms of Service and Privacy Policy.', 422);
    }

    // Password policy
    if (isWeakPassword(password)) {
      return fail(
        'Please choose a stronger password — that one appears on common-password lists.',
        422,
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return fail('Email is already registered', 409);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        businessType: businessType ?? 'seller',
        lastLoginAt: new Date(),
        termsAcceptedAt: new Date(),
        emailVerified: false,
      },
    });

    await setSessionCookie(user.id);

    // Generate OTP and store hash
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

    // Send verification OTP email (fire-and-forget)
    // Welcome email is sent later, after onboarding is completed
    emailService
      .sendVerificationOtp({ to: user.email, name: user.name, code: otp })
      .catch(() => null);

    return ok({
      id: user.id,
      email: user.email,
      role: user.role,
      businessType: user.businessType,
      requiresVerification: true,
    });
  } catch (e) {
    console.error('SIGNUP_ERROR:', e instanceof Error ? e.message : e, e instanceof Error ? e.stack : '');
    return fail('Server error', 500);
  }
}
