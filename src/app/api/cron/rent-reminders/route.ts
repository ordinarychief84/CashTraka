/**
 * Vercel Cron — Rent Lease Lifecycle Reminders
 *
 * Runs daily at 8 AM WAT (07:00 UTC). Checks all active tenants with
 * lease end dates and sends reminders at 4 stages:
 *
 *   1. 30_day_warning  — 30 days before leaseEnd
 *   2. expiry_day      — on the exact leaseEnd date
 *   3. post_expiry     — 3 days after leaseEnd (if rent still not paid)
 *   4. notice_to_quit  — 7 days after leaseEnd (final notice)
 *
 * Each (tenant × kind) combo is sent only once, tracked via LeaseReminder.
 * The route is protected by CRON_SECRET so only Vercel Cron can call it.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/services/email.service';
import { formatNaira } from '@/lib/format';

// Vercel Cron sends this header; reject everything else.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const today = startOfDay(now);

  // Fetch all active tenants that have a leaseEnd date set.
  const tenants = await prisma.tenant.findMany({
    where: {
      status: 'active',
      leaseEnd: { not: null },
    },
    include: {
      user: { select: { id: true, email: true, businessName: true, name: true, whatsappNumber: true } },
      property: { select: { name: true } },
      leaseReminders: true,
    },
  });

  const results: Array<{ tenant: string; kind: string; result: string }> = [];

  for (const tenant of tenants) {
    const leaseEnd = startOfDay(tenant.leaseEnd!);
    const daysUntilExpiry = diffDays(leaseEnd, today);
    const alreadySent = new Set(tenant.leaseReminders.map((r) => r.kind));

    // Determine which reminders are due
    const toSend: Array<{ kind: string; subject: string; html: string }> = [];

    // 1. 30-day warning (fires when ≤ 30 days remain, and > 0 days remain)
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0 && !alreadySent.has('30_day_warning')) {
      toSend.push({
        kind: '30_day_warning',
        ...buildEmail('30_day_warning', tenant, daysUntilExpiry),
      });
    }

    // 2. Expiry day (fires on the exact day or past, if not already sent)
    if (daysUntilExpiry <= 0 && !alreadySent.has('expiry_day')) {
      toSend.push({
        kind: 'expiry_day',
        ...buildEmail('expiry_day', tenant, daysUntilExpiry),
      });
    }

    // 3. Post-expiry (3+ days past expiry)
    if (daysUntilExpiry <= -3 && !alreadySent.has('post_expiry')) {
      toSend.push({
        kind: 'post_expiry',
        ...buildEmail('post_expiry', tenant, daysUntilExpiry),
      });
    }

    // 4. Notice to quit (7+ days past expiry)
    if (daysUntilExpiry <= -7 && !alreadySent.has('notice_to_quit')) {
      toSend.push({
        kind: 'notice_to_quit',
        ...buildEmail('notice_to_quit', tenant, daysUntilExpiry),
      });
    }

    for (const item of toSend) {
      // Send email to landlord
      const emailResult = await emailService.raw({
        to: tenant.user.email,
        subject: item.subject,
        html: item.html,
      });

      // Record that this reminder was sent (upsert to avoid duplicates)
      await prisma.leaseReminder.upsert({
        where: {
          tenantId_kind: { tenantId: tenant.id, kind: item.kind },
        },
        create: {
          userId: tenant.user.id,
          tenantId: tenant.id,
          kind: item.kind,
          channel: 'email',
        },
        update: {
          sentAt: new Date(),
          channel: 'email',
        },
      });

      results.push({
        tenant: tenant.name,
        kind: item.kind,
        result: emailResult.ok ? 'sent' : emailResult.error || 'failed',
      });
    }
  }

  // Also auto-mark overdue rent payments
  await autoMarkOverdue();

  return NextResponse.json({
    ok: true,
    processed: tenants.length,
    remindersSent: results.length,
    details: results,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}

type TenantWithRelations = {
  name: string;
  phone: string;
  rentAmount: number;
  leaseEnd: Date | null;
  unitLabel: string | null;
  user: { businessName: string | null; name: string };
  property: { name: string };
};

function buildEmail(
  kind: string,
  tenant: TenantWithRelations,
  daysUntilExpiry: number,
): { subject: string; html: string } {
  const landlord = tenant.user.businessName || tenant.user.name;
  const prop = tenant.property.name;
  const unit = tenant.unitLabel ? ` (${tenant.unitLabel})` : '';
  const rent = formatNaira(tenant.rentAmount);
  const expiry = fmtDate(tenant.leaseEnd!);
  const appUrl = process.env.APP_URL || '';

  switch (kind) {
    case '30_day_warning':
      return {
        subject: `Lease expiring in ${daysUntilExpiry} days — ${tenant.name} at ${prop}`,
        html: emailWrapper(`
          <div style="font-size:20px;font-weight:800;color:#F59E0B;">Lease Expiring Soon</div>
          <p style="color:#475569;font-size:14px;margin:16px 0;">
            Hi ${esc(landlord)}, this is a reminder that <strong>${esc(tenant.name)}</strong>'s
            lease at <strong>${esc(prop)}${esc(unit)}</strong> expires on
            <strong>${expiry}</strong> — that's <strong>${daysUntilExpiry} days</strong> from now.
          </p>
          <div style="margin:16px 0;padding:16px;background:#FEF3C7;border-radius:12px;border:1px solid #FDE68A;">
            <div style="font-size:12px;color:#92400E;">Monthly Rent</div>
            <div style="font-size:18px;font-weight:700;color:#1A1A1A;">${rent}</div>
            <div style="font-size:12px;color:#92400E;margin-top:8px;">Lease Ends</div>
            <div style="font-size:18px;font-weight:700;color:#1A1A1A;">${expiry}</div>
          </div>
          <p style="color:#475569;font-size:14px;">
            Consider reaching out to ${esc(tenant.name)} to discuss lease renewal
            or next steps before the expiry date.
          </p>
          <p><a href="${esc(appUrl)}/rent" style="display:inline-block;padding:12px 20px;background:#8BD91E;color:#1A1A1A;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Rent Dashboard</a></p>
        `),
      };

    case 'expiry_day':
      return {
        subject: `Lease EXPIRED today — ${tenant.name} at ${prop}`,
        html: emailWrapper(`
          <div style="font-size:20px;font-weight:800;color:#DC2626;">Lease Expired</div>
          <p style="color:#475569;font-size:14px;margin:16px 0;">
            Hi ${esc(landlord)}, <strong>${esc(tenant.name)}</strong>'s lease at
            <strong>${esc(prop)}${esc(unit)}</strong> has <strong>expired today</strong>
            (${expiry}).
          </p>
          <div style="margin:16px 0;padding:16px;background:#FEE2E2;border-radius:12px;border:1px solid #FECACA;">
            <div style="font-size:14px;font-weight:600;color:#991B1B;">Action required</div>
            <p style="font-size:13px;color:#7F1D1D;margin:8px 0 0;">
              Contact ${esc(tenant.name)} to confirm whether they are renewing
              their lease or vacating the unit. If renewing, update the lease dates
              in CashTraka.
            </p>
          </div>
          <p><a href="${esc(appUrl)}/rent" style="display:inline-block;padding:12px 20px;background:#8BD91E;color:#1A1A1A;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Rent Dashboard</a></p>
        `),
      };

    case 'post_expiry':
      return {
        subject: `URGENT: ${tenant.name}'s lease expired ${Math.abs(daysUntilExpiry)} days ago — ${prop}`,
        html: emailWrapper(`
          <div style="font-size:20px;font-weight:800;color:#DC2626;">Lease Overdue — Follow Up</div>
          <p style="color:#475569;font-size:14px;margin:16px 0;">
            Hi ${esc(landlord)}, <strong>${esc(tenant.name)}</strong>'s lease at
            <strong>${esc(prop)}${esc(unit)}</strong> expired on ${expiry}
            — <strong>${Math.abs(daysUntilExpiry)} days ago</strong> — and no renewal has been recorded.
          </p>
          <div style="margin:16px 0;padding:16px;background:#FEE2E2;border-radius:12px;border:1px solid #FECACA;">
            <div style="font-size:14px;font-weight:600;color:#991B1B;">Recommended next steps</div>
            <p style="font-size:13px;color:#7F1D1D;margin:8px 0 0;">
              1. Contact ${esc(tenant.name)} immediately to demand payment or confirm vacating.<br>
              2. If the tenant intends to stay, record their new lease dates.<br>
              3. If unresponsive, prepare a formal Notice to Quit.
            </p>
          </div>
          <p><a href="${esc(appUrl)}/rent" style="display:inline-block;padding:12px 20px;background:#8BD91E;color:#1A1A1A;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Rent Dashboard</a></p>
        `),
      };

    case 'notice_to_quit': {
      const quitDate = new Date(tenant.leaseEnd!);
      quitDate.setDate(quitDate.getDate() + 30); // Give 30 days from lease expiry
      return {
        subject: `NOTICE TO QUIT — ${tenant.name} at ${prop}`,
        html: emailWrapper(`
          <div style="font-size:20px;font-weight:800;color:#7F1D1D;">Notice to Quit — Action Required</div>
          <p style="color:#475569;font-size:14px;margin:16px 0;">
            Hi ${esc(landlord)}, it has been <strong>${Math.abs(daysUntilExpiry)} days</strong>
            since <strong>${esc(tenant.name)}</strong>'s lease expired at
            <strong>${esc(prop)}${esc(unit)}</strong>, and no renewal has been recorded.
          </p>
          <div style="margin:16px 0;padding:16px;background:#FEF2F2;border:2px solid #DC2626;border-radius:12px;">
            <div style="font-size:16px;font-weight:800;color:#7F1D1D;text-transform:uppercase;">Notice to Quit</div>
            <p style="font-size:13px;color:#1A1A1A;margin:8px 0;">
              <strong>Tenant:</strong> ${esc(tenant.name)}<br>
              <strong>Property:</strong> ${esc(prop)}${esc(unit)}<br>
              <strong>Lease expired:</strong> ${expiry}<br>
              <strong>Monthly rent:</strong> ${rent}<br>
              <strong>Suggested quit deadline:</strong> ${fmtDate(quitDate)}
            </p>
            <p style="font-size:13px;color:#7F1D1D;margin:8px 0 0;">
              You may proceed with a formal notice to quit. This email serves as
              a record. We recommend consulting a legal professional for the
              formal eviction process in your jurisdiction.
            </p>
          </div>
          <p style="color:#475569;font-size:14px;margin:16px 0;">
            If the tenant has already renewed or vacated, update their status in CashTraka
            to stop further reminders.
          </p>
          <p><a href="${esc(appUrl)}/rent" style="display:inline-block;padding:12px 20px;background:#8BD91E;color:#1A1A1A;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Manage Tenants</a></p>
        `),
      };
    }

    default:
      return { subject: '', html: '' };
  }
}

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function emailWrapper(body: string): string {
  return `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,sans-serif;margin:0;padding:24px;background:#F7F9F8;color:#1A1A1A;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #E5E7EB;border-radius:16px;padding:24px;">
    ${body}
    <p style="color:#64748B;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:16px;">
      Sent by <a href="${esc(process.env.APP_URL || '')}" style="color:#00B8E8;text-decoration:none;font-weight:600;">CashTraka</a> — Rent Lifecycle Automation
    </p>
  </div>
</body></html>`;
}

/**
 * Auto-mark PENDING rent payments as OVERDUE when the due day has passed.
 * This runs as part of the daily cron so the landlord always sees accurate status.
 */
async function autoMarkOverdue() {
  const now = new Date();
  const currentPeriod = now.toISOString().slice(0, 7); // "2026-04"
  const dayOfMonth = now.getDate();

  // Find all PENDING payments for the current period where the tenant's
  // rentDueDay has already passed.
  const overduePayments = await prisma.rentPayment.findMany({
    where: {
      period: currentPeriod,
      status: 'PENDING',
      tenant: {
        rentDueDay: { lt: dayOfMonth },
        status: 'active',
      },
    },
    select: { id: true },
  });

  if (overduePayments.length > 0) {
    await prisma.rentPayment.updateMany({
      where: { id: { in: overduePayments.map((p) => p.id) } },
      data: { status: 'OVERDUE' },
    });
  }

  return overduePayments.length;
}
