import { prisma } from '@/lib/prisma';
import { setSessionCookie, verifyPassword } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import { ok, fail, unauthorized, forbidden, validationFail } from '@/lib/api-response';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return unauthorized('Invalid email or password');
    }

    // Enforce suspension at the entry point.
    if (user.isSuspended) {
      return forbidden('Your account is suspended. Contact support.');
    }

    // Audit trail: record the login timestamp.
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await setSessionCookie(user.id);
    return ok({
      id: user.id,
      email: user.email,
      role: user.role,
      businessType: user.businessType,
    });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error(e);
    return fail('Server error', 500);
  }
}
