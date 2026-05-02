import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { signupSchema } from '@/lib/validators';
import { ok, fail, validationFail } from '@/lib/api-response';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { isWeakPassword, checkPasswordComplexity } from '@/lib/password-policy';
import { emailService } from '@/lib/services/email.service';
import { securityLog } from '@/lib/security-log';

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function generateOtp(): string {
  // Use rejection sampling for uniform distribution across 000000-999999
  let num: number;
  do {
    const buf = crypto.randomBytes(4);
    num = buf.readUInt32BE(0);
  } while (num >= 4294000000); // reject to avoid modulo bias
  return String(num % 1000000).padStart(6, '0');
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

    // Password complexity check
    const complexityErr = checkPasswordComplexity(password);
    if (complexityErr) return fail(complexityErr, 422);

    // Common password check
    if (isWeakPassword(password)) {
      return fail(
        'Please choose a stronger password, that one appears on common-password lists.',
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

    // Send verification OTP email
    // Welcome email is sent later, after onboarding is completed
    const emailResult = await emailService
      .sendVerificationOtp({ to: user.email, name: user.name, code: otp })
      .catch((e: unknown) => ({ ok: false, error: e instanceof Error ? e.message : 'Send failed' }));

    if (!emailResult.ok) {
      console.error('OTP_EMAIL_FAILED:', emailResult.error, '| user:', user.email);
    }

    securityLog({ event: 'SIGNUP', actorId: user.id, ip, meta: { email: user.email } });

    return ok({
      id: user.id,
      email: user.email,
      role: user.role,
      businessType: user.businessType,
      requiresVerification: true,
      emailSent: emailResult.ok,
    });
  } catch (e) {
    console.error('SIGNUP_ERROR:', e instanceof Error ? e.message : 'unknown');
    return fail('Server error', 500);
  }
}
