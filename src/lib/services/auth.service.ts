import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie } from '@/lib/auth';
import { signupSchema, loginSchema } from '@/lib/validators';
import { emailService } from './email.service';

/**
 * Auth business logic. Route handlers stay thin — they just parse JSON and
 * call these functions; all rules (suspended accounts, duplicate email, etc.)
 * live here.
 */

export const authService = {
  async signup(input: unknown) {
    const { name, email, password, businessType } = signupSchema.parse(input);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw Err.conflict('Email is already registered');

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

    // Fire-and-forget welcome email (non-blocking).
    emailService.sendWelcome({ to: user.email, name: user.name }).catch(() => null);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      businessType: user.businessType,
    };
  },

  async login(input: unknown) {
    const { email, password } = loginSchema.parse(input);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw Err.unauthorized('Invalid email or password');
    }
    if (user.isSuspended) {
      throw Err.forbidden('Your account is suspended. Contact support.');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await setSessionCookie(user.id);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      businessType: user.businessType,
    };
  },

  logout() {
    clearSessionCookie();
  },
};
