import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * DELETE /api/user/account
 *
 * Deactivates the authenticated user. Tax-relevant records (invoices,
 * receipts, payments, expenses, VAT returns, audit logs) are retained for
 * the 6-year Nigerian FIRS retention window. The email is archived so the
 * owner can re-sign up with the same address.
 *
 * Requires { confirm: "DELETE" } in the request body as a safety check.
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
      { error: 'You must send { "confirm": "DELETE" } to close your account.' },
      { status: 400 },
    );
  }

  try {
    // Soft delete: keep tax-relevant rows around, free the email, and force
    // isSuspended so the user cannot log back in.
    const archivedEmail = `${user.email}.deleted-${Date.now()}@cashtraka.deleted`;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        isSuspended: true,
        email: archivedEmail,
      },
    });

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

    return NextResponse.json({
      ok: true,
      message: 'Account deactivated. Records retained for 6 years per Nigerian tax rules.',
    });
  } catch (err) {
    console.error('[DELETE /api/user/account] Failed to deactivate user:', err);
    return NextResponse.json(
      { error: 'Could not close account. Please try again or contact support.' },
      { status: 500 },
    );
  }
}
