import { prisma } from '@/lib/prisma';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { signupSchema } from '@/lib/validators';
import { ok, fail, validationFail } from '@/lib/api-response';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { isWeakPassword } from '@/lib/password-policy';
import { emailService } from '@/lib/services/email.service';

export async function POST(req: Request) {
  try {
    // Rate limit — 5 new accounts per IP per hour blocks trial-abuse scripts
    // (a common vector: rotate emails, claim 14-day trial, cancel before charge).
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

    const { name, email, password, businessType } = parsed.data;

    // Password policy — 8-char minimum was already enforced by Zod; block
    // the top-1000 common passwords so no one ships a 12345678 account.
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
      },
    });

    await setSessionCookie(user.id);

    // Fire-and-forget welcome email
    emailService
      .sendWelcome({ to: user.email, name: user.name, businessType: user.businessType })
      .catch(() => null);

    return ok({
      id: user.id,
      email: user.email,
      role: user.role,
      businessType: user.businessType,
    });
  } catch (e) {
    console.error('SIGNUP_ERROR:', e instanceof Error ? e.message : e, e instanceof Error ? e.stack : '');
    return fail('Server error', 500);
  }
}
