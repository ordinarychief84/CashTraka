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

// Vercel Cron sends this header; reject everything else.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
    const toSend: string[] = [];

    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0 && !alreadySent.has('30_day_warning')) {
      toSend.push('30_day_warning');
    }
    if (daysUntilExpiry <= 0 && !alreadySent.has('expiry_day')) {
      toSend.push('expiry_day');
    }
    if (daysUntilExpiry <= -3 && !alreadySent.has('post_expiry')) {
      toSend.push('post_expiry');
    }
    if (daysUntilExpiry <= -7 && !alreadySent.has('notice_to_quit')) {
      toSend.push('notice_to_quit');
    }

    for (const kind of toSend) {
      // Send branded email to landlord
      const emailResult = await emailService.sendRentReminder({
        to: tenant.user.email,
        landlordName: tenant.user.businessName || tenant.user.name,
        tenantName: tenant.name,
        propertyName: tenant.property.name,
        unitLabel: tenant.unitLabel || '',
        kind: kind as '30_day_warning' | 'expiry_day' | 'post_expiry' | 'notice_to_quit',
        leaseEnd: tenant.leaseEnd!,
        rentAmount: tenant.rentAmount,
      });

      // Record that this reminder was sent (upsert to avoid duplicates)
      await prisma.leaseReminder.upsert({
        where: {
          tenantId_kind: { tenantId: tenant.id, kind },
        },
        create: {
          userId: tenant.user.id,
          tenantId: tenant.id,
          kind,
          channel: 'email',
        },
        update: {
          sentAt: new Date(),
          channel: 'email',
        },
      });

      results.push({
        tenant: tenant.name,
        kind,
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
