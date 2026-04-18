import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/services/email.service';

/**
 * Weekly summary email — runs every Monday at 7 AM WAT (06:00 UTC).
 * Sends each active user a digest of their past-week activity.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Build a human-readable week label like "Apr 7 – Apr 13"
  const weekLabel = `${weekAgo.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`;

  // Find active users who've logged in within the last 60 days
  const cutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    where: {
      role: 'USER',
      isSuspended: false,
      emailVerified: true,
      lastLoginAt: { gte: cutoff },
    },
    select: { id: true, email: true, name: true, businessType: true },
  });

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const [payments, newCustomers, openDebt] = await Promise.all([
        prisma.payment.aggregate({
          where: { userId: user.id, status: 'PAID', createdAt: { gte: weekAgo } },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.customer.count({
          where: { userId: user.id, createdAt: { gte: weekAgo } },
        }),
        prisma.debt.aggregate({
          where: { userId: user.id, status: 'OPEN' },
          _sum: { amountOwed: true, amountPaid: true },
        }),
      ]);

      const revenue = payments._sum.amount ?? 0;
      const txCount = payments._count;
      const outstanding = Math.max(
        (openDebt._sum.amountOwed ?? 0) - (openDebt._sum.amountPaid ?? 0),
        0,
      );

      // Skip users with zero activity
      if (revenue === 0 && newCustomers === 0) continue;

      const result = await emailService.sendWeeklySummary({
        to: user.email,
        name: user.name,
        totalRevenue: revenue,
        paymentsCount: txCount,
        newCustomers,
        outstandingDebt: outstanding,
        weekLabel,
      });

      if (result.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: users.length });
}
