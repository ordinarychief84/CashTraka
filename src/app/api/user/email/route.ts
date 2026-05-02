import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** PATCH /api/user/email, change the logged-in user's email */
export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const normalised = email.toLowerCase().trim();

    // Check if already taken
    if (normalised !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: normalised } });
      if (existing) {
        return NextResponse.json({ error: 'This email is already in use' }, { status: 409 });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { email: normalised },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/user/email error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
