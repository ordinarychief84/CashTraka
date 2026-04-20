import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** PATCH /api/user/profile — update the logged-in user's name */
export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name } = body;

    if (!name || name.trim().length < 1) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { name: name.trim() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/user/profile error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
