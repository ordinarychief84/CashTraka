import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { securityLog } from '@/lib/security-log';
import { emailService } from '@/lib/services/email.service';

export const runtime = 'nodejs';

/**
 * DELETE /api/user/account
 *
 * NDPR right-to-erasure. Soft-deletes the authenticated user. Tax-relevant
 * records (Invoices, Receipts, Payments, Expenses, VatReturns, AuditLogs,
 * Refunds, RentPayments, StaffPayments, CreditNotes) are retained for the
 * 6-year Nigerian FIRS retention window — that's why every related FK has
 * `onDelete: Restrict` in `prisma/schema.prisma`. The email is archived so
 * the same address can re-sign up; `isSuspended=true` blocks any login
 * before the soft-deleted row is finally purged.
 *
 * Hardening (Phase 0.1 of the GTM plan):
 *  - Requires `{ confirm: "DELETE" }` in the body.
 *  - Rate limited to 3 attempts per IP per hour. Even with a stolen session,
 *    a brute-force loop is bounded.
 *  - Sends a confirmation email so the (now logged-out) user can verify the
 *    action, and so a hijacker can't silently destroy the account.
 *  - Writes a security audit-log entry (NDPR_ACCOUNT_DELETION) so
 *    operations can trace mass deletions during incident response.
 */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = clientIp(req);
  const limited = await rateLimit(`account-delete:${user.id}`, ip, {
    max: 3,
    windowMs: 60 * 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      {
        error: `Too many deletion attempts. Try again in ${Math.ceil(limited.retryAfter / 60)} min.`,
      },
      { status: 429 },
    );
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

  // Capture the original email BEFORE we archive it — we need it to send
  // the confirmation message.
  const originalEmail = user.email;
  const originalName = user.name || 'there';

  try {
    const archivedEmail = `${originalEmail}.deleted-${Date.now()}@cashtraka.deleted`;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        isSuspended: true,
        email: archivedEmail,
      },
    });

    // Clear the session cookie so the browser is logged out immediately.
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

    // Audit log. The actorId/targetId pair lets ops correlate deletions to
    // the IP that triggered them during incident response.
    securityLog({
      event: 'NDPR_ACCOUNT_DELETION',
      actorId: user.id,
      targetId: user.id,
      ip,
      meta: { archivedEmail, taxRetentionYears: 6 },
    });

    // Confirmation email — best-effort, never block the deletion on email
    // failure. Sent to the ORIGINAL address (we just archived it on the
    // user row, but the SMTP target is whatever string we pass to Resend).
    emailService
      .raw({
        to: originalEmail,
        subject: 'Your CashTraka account has been closed',
        html: `
          <div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;color:#1A1A1A">
            <h2 style="margin:0 0 12px;font-size:22px">Account closed</h2>
            <p style="margin:0 0 16px;color:#475569;line-height:1.55">
              Hi ${originalName.replace(/[<>]/g, '')},
            </p>
            <p style="margin:0 0 16px;color:#475569;line-height:1.55">
              We're confirming that your CashTraka account was closed on
              ${new Date().toLocaleString('en-NG', {
                dateStyle: 'long',
                timeStyle: 'short',
                timeZone: 'Africa/Lagos',
              })}.
              You've been logged out everywhere and your dashboard is no
              longer accessible.
            </p>
            <p style="margin:0 0 16px;color:#475569;line-height:1.55">
              <strong>What we keep:</strong> records that Nigerian tax law
              requires us to retain (invoices, receipts, payments,
              expenses, VAT returns) are kept for 6 years per FIRS rules.
              These are not used for any product purpose — they're held
              only to meet the legal retention window. After 6 years they
              are permanently purged.
            </p>
            <p style="margin:0 0 16px;color:#475569;line-height:1.55">
              <strong>What was deleted:</strong> your login, profile, team
              access, and the ability to use the platform under your
              previous email. The email is now free to be re-used for a
              new signup.
            </p>
            <p style="margin:0 0 16px;color:#475569;line-height:1.55">
              <strong>Didn't ask for this?</strong> If you didn't initiate
              this deletion, reply to this email immediately so we can
              restore the account from the soft-delete state. You have 30
              days before any action becomes irreversible.
            </p>
            <p style="margin:24px 0 0;color:#94A3B8;font-size:13px">
              CashTraka · NDPR-compliant data controller<br>
              Lagos, Nigeria
            </p>
          </div>
        `,
      })
      .catch((e) => {
        console.warn(
          `[NDPR_ACCOUNT_DELETION] confirmation email failed for user ${user.id}`,
          e,
        );
        return null;
      });

    return NextResponse.json({
      ok: true,
      message:
        'Account deactivated. We sent a confirmation email. Records retained for 6 years per Nigerian tax rules.',
    });
  } catch (err) {
    console.error('[DELETE /api/user/account] Failed to deactivate user:', err);
    return NextResponse.json(
      { error: 'Could not close account. Please try again or contact support.' },
      { status: 500 },
    );
  }
}
