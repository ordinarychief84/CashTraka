import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

/** DELETE /api/user/account — permanently delete the user's account */
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (body.confirm !== 'DELETE') {
      return NextResponse.json({ error: 'Confirmation required: type DELETE' }, { status: 400 });
    }

    // Delete user and all cascaded data
    await prisma.user.delete({ where: { id: user.id } });

    // Clear session cookie
    const cookieStore = await cookies();
    cookieStore.delete('cashtraka_session');

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/user/account error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
