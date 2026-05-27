import { prisma } from '@/lib/prisma';

/**
 * Write + read access to the EmailLog table.
 *
 * The producer-side helper `record()` is called by the email send
 * code when an outbound is enqueued — Resend returns a UUID we use
 * as the natural primary key on the log row. Subsequent webhook
 * events (delivered, bounced, complained, opened) update the same
 * row in place via `upsertEvent()`.
 *
 * Both calls are best-effort and never throw — losing a log row is
 * preferable to crashing an invoice send.
 */

export type EmailLogStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'failed';

/**
 * Record a fresh send. Called from email.service when Resend
 * returns its email_id but before we know whether it landed.
 */
export async function recordEmailSend(input: {
  userId: string;
  resendId: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  category?: string | null;
}) {
  try {
    await prisma.emailLog.create({
      data: {
        userId: input.userId,
        resendId: input.resendId,
        toEmail: input.toEmail,
        fromEmail: input.fromEmail,
        subject: input.subject,
        category: input.category ?? null,
        status: 'sent',
      },
    });
  } catch {
    // Swallow — log writes must never break a user-facing send.
  }
}

/**
 * Apply a Resend webhook event to an existing log row. If we never
 * recorded the original send (e.g. early adopter rows), the upsert
 * creates a partial row so the inbox never goes empty.
 */
export async function upsertEmailEvent(input: {
  resendId: string;
  status: EmailLogStatus;
  errorReason?: string | null;
  // Fallback values used only if the row doesn't already exist.
  fallback?: {
    userId: string;
    toEmail: string;
    fromEmail: string;
    subject: string;
  };
}) {
  try {
    const existing = await prisma.emailLog.findUnique({
      where: { resendId: input.resendId },
    });
    if (existing) {
      // Status order: failed > bounced > complained > delivered > opened > clicked > sent > queued
      // Don't downgrade a "bounced" row to "opened" if events arrive out of order.
      const ORDER: Record<EmailLogStatus, number> = {
        queued: 0,
        sent: 1,
        delivered: 2,
        opened: 3,
        clicked: 4,
        complained: 5,
        bounced: 6,
        failed: 7,
      };
      if (ORDER[input.status] <= ORDER[existing.status as EmailLogStatus]) {
        // The incoming event is "less terminal" than what we already
        // have. Update errorReason only.
        if (input.errorReason) {
          await prisma.emailLog.update({
            where: { id: existing.id },
            data: { errorReason: input.errorReason },
          });
        }
        return;
      }
      await prisma.emailLog.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          errorReason: input.errorReason ?? existing.errorReason,
        },
      });
    } else if (input.fallback) {
      await prisma.emailLog.create({
        data: {
          userId: input.fallback.userId,
          resendId: input.resendId,
          toEmail: input.fallback.toEmail,
          fromEmail: input.fallback.fromEmail,
          subject: input.fallback.subject,
          status: input.status,
          errorReason: input.errorReason ?? null,
        },
      });
    }
  } catch {
    // Swallow — webhook handlers must be idempotent and never crash.
  }
}

export async function listEmailLogsForUser(
  userId: string,
  opts?: { take?: number; status?: EmailLogStatus; q?: string },
) {
  const take = Math.min(opts?.take ?? 100, 500);
  const where: any = { userId };
  if (opts?.status) where.status = opts.status;
  if (opts?.q && opts.q.trim()) {
    where.OR = [
      { toEmail: { contains: opts.q.trim(), mode: 'insensitive' as const } },
      { subject: { contains: opts.q.trim(), mode: 'insensitive' as const } },
    ];
  }
  return prisma.emailLog.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take,
  });
}
