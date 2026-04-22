import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * DELETE /api/user/account
 *
 * Permanently deletes the authenticated user and all associated data.
 * Requires { confirm: "DELETE" } in the request body as a safety check.
 *
 * Prisma's onDelete: Cascade handles removing all child records
 * (customers, payments, debts, sales, products, expenses, etc.).
 */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Safety: require explicit confirmation
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body
  }

  if (body.confirm !== 'DELETE') {
    return NextResponse.json(
      { error: 'You must send { "confirm": "DELETE" } to delete your account.' },
      { status: 400 },
    );
  }

  try {
    // Delete the user — Prisma cascades take care of all related records
    await prisma.user.delete({ where: { id: user.id } });

    // Clear the session cookie so the browser is logged out
    const SESSION_COOKIE = 'cashtraka_session';
    cookies().set({
      name: SESSION_COOKIE,
      value: '',
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 0,
    });

    return NextResponse.json({ ok: true, message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('[DELETE /api/user/account] Failed to delete user:', err);
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again or contact support.' },
      { status: 500 },
    );
  }
}
