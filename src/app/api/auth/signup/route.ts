import { prisma } from '@/lib/prisma';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { signupSchema } from '@/lib/validators';
import { ok, fail, validationFail } from '@/lib/api-response';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const { name, email, password, businessType } = parsed.data;

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
