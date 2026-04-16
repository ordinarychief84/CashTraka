import Link from 'next/link';
import {
  Wallet,
  Clock3,
  Users,
  ArrowRight,
  MessageCircle,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ShieldAlert,
  FileText,
  Bell,
} from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { QuickActions } from '@/components/QuickActions';
import { OverdueBanner } from '@/components/OverdueBanner';
import { UnverifiedBanner } from '@/components/UnverifiedBanner';
import { NewActivityCards } from '@/components/dashboard/NewActivityCards';
import { WeeklyBarChart } from '@/components/dashboard/WeeklyBarChart';
import { UpgradeCard } from '@/components/dashboard/UpgradeCard';
import { MonthCalendar } from '@/components/dashboard/MonthCalendar';
import { PriorityList, type PriorityItem } from '@/components/dashboard/PriorityList';
import { DebtProgressCards } from '@/components/dashboard/DebtProgressCards';
import { RemindersPanel } from '@/components/dashboard/RemindersPanel';
import { formatNaira, timeAgo } from '@/lib/format';
import { displayPhone } from '@/lib/whatsapp';
import { parseRange, rangeStart, RANGE_LABELS } from '@/lib/range';
import { copyFor, isPropertyManager } from '@/lib/business-type';
import { InstallPrompt } from '@/components/InstallPrompt';

export const dynamic = 'force-dynamic';

const QUIET_THRESHOLD_DAYS = 30;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const user = await guard();
  const range = parseRange(searchParams.range);
  const start = rangeStart(range);
  const now = new Date();
  const copy = copyFor(user.businessType);
  const isPm = isPropertyManager(user.businessType);

  // Anchor for "this week" queries — last 7 days ending today.
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  // Last week (for +3% trend)
  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setMilliseconds(lastWeekEnd.getMilliseconds() - 1);
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekStart.getDate() - 6);

  // Month anchor for calendar marks
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    paidAgg,
    pendingAgg,
    expensesAgg,
    openDebtAgg,
    customerCountAll,
    overdueAgg,
    topDebtors,
    quietCustomers,
    paymentsThisWeek,
    paymentsLastWeek,
    latestPayment,
    latestDebt,
    latestInvoice,
    unverifiedAgg,
    partialDebts,
    remindersDue,
    paymentsThisMonth,
    debtsDueThisMonth,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        userId: user.id,
        status: 'PAID',
        ...(start ? { createdAt: { gte: start } } : {}),
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { userId: user.id, status: 'PENDING' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        ...(start ? { incurredOn: { gte: start } } : {}),
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.debt.aggregate({
      where: { userId: user.id, status: 'OPEN' },
      _sum: { amountOwed: true, amountPaid: true },
    }),
    prisma.customer.count({ where: { userId: user.id } }),
    prisma.debt.aggregate({
      where: {
        userId: user.id,
        status: 'OPEN',
        dueDate: { lt: now, not: null },
      },
      _sum: { amountOwed: true, amountPaid: true },
      _count: true,
    }),
    prisma.customer.findMany({
      where: { userId: user.id, totalOwed: { gt: 0 } },
      orderBy: { totalOwed: 'desc' },
      take: 3,
    }),
    prisma.customer.findMany({
      where: {
        userId: user.id,
        lastActivityAt: {
          lt: new Date(Date.now() - QUIET_THRESHOLD_DAYS * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { lastActivityAt: 'asc' },
      take: 3,
    }),
    // This week's paid payments (for the bar chart)
    prisma.payment.findMany({
      where: {
        userId: user.id,
        status: 'PAID',
        createdAt: { gte: weekStart },
      },
      select: { amount: true, createdAt: true },
    }),
    // Last week total (for delta)
    prisma.payment.aggregate({
      where: {
        userId: user.id,
        status: 'PAID',
        createdAt: { gte: lastWeekStart, lte: lastWeekEnd },
      },
      _sum: { amount: true },
    }),
    prisma.payment.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.debt.findFirst({
      where: { userId: user.id, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.aggregate({
      where: { userId: user.id, status: 'PAID', verified: false },
      _sum: { amount: true },
      _count: true,
    }),
    // Open debts with partial payments (for progress ring cards)
    prisma.debt.findMany({
      where: {
        userId: user.id,
        status: 'OPEN',
        amountPaid: { gt: 0 },
      },
      orderBy: { updatedAt: 'desc' },
      take: 4,
    }),
    // Reminder schedules for the Assignments panel
    prisma.reminderSchedule.findMany({
      where: { userId: user.id, enabled: true },
      include: { debt: true },
      orderBy: { nextDueAt: 'asc' },
      take: 5,
    }),
    // Payments this month (for calendar dots)
    prisma.payment.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      select: { createdAt: true },
    }),
    // Debts with a due date falling in this month (for amber dots)
    prisma.debt.findMany({
      where: {
        userId: user.id,
        dueDate: { gte: monthStart, lte: monthEnd },
      },
      select: { dueDate: true },
    }),
  ]);

  const totalReceived = paidAgg._sum.amount ?? 0;
  const totalPending = pendingAgg._sum.amount ?? 0;
  const totalExpenses = expensesAgg._sum.amount ?? 0;
  const netProfit = totalReceived - totalExpenses;
  const totalOwed = Math.max(
    (openDebtAgg._sum.amountOwed ?? 0) - (openDebtAgg._sum.amountPaid ?? 0),
    0,
  );
  const overdueTotal = Math.max(
    (overdueAgg._sum.amountOwed ?? 0) - (overdueAgg._sum.amountPaid ?? 0),
    0,
  );
  const overdueCount = overdueAgg._count;
  const unverifiedCount = unverifiedAgg._count;
  const unverifiedTotal = unverifiedAgg._sum.amount ?? 0;
  const firstName = user.name.split(' ')[0];

  // Compute this-week's daily totals for the bar chart (Sun..Sat ending today).
  const weekBuckets = Array<number>(7).fill(0);
  for (const p of paymentsThisWeek) {
    const diff = Math.floor(
      (now.getTime() - new Date(p.createdAt).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diff < 0 || diff >= 7) continue;
    weekBuckets[6 - diff] += p.amount;
  }
  const weekTotal = weekBuckets.reduce((s, v) => s + v, 0);
  const lastWeekTotal = paymentsLastWeek._sum.amount ?? 0;
  const deltaPct = lastWeekTotal > 0
    ? Math.round(((weekTotal - lastWeekTotal) / lastWeekTotal) * 100)
    : null;

  // Calendar activity maps
  const calendarActivity: Record<string, boolean> = {};
  for (const p of paymentsThisMonth) {
    calendarActivity[new Date(p.createdAt).toISOString().slice(0, 10)] = true;
  }
  const calendarDue: Record<string, boolean> = {};
  for (const d of debtsDueThisMonth) {
    if (d.dueDate) calendarDue[new Date(d.dueDate).toISOString().slice(0, 10)] = true;
  }

  // Build reminders display rows
  const reminderRows = remindersDue.map((s) => {
    const remaining = Math.max(s.debt.amountOwed - s.debt.amountPaid, 0);
    const paid = s.debt.status === 'PAID';
    const now2 = now.getTime();
    let status: 'due' | 'overdue' | 'upcoming' | 'cleared';
    if (paid) status = 'cleared';
    else if (s.nextDueAt.getTime() <= now2 - 24 * 60 * 60 * 1000) status = 'overdue';
    else if (s.nextDueAt.getTime() <= now2 + 24 * 60 * 60 * 1000) status = 'due';
    else status = 'upcoming';
    return {
      id: s.id,
      debtId: s.debtId,
      customerName: s.debt.customerNameSnapshot,
      remainingAmount: remaining,
      nextDueAt: s.nextDueAt,
      lastSentAt: s.lastSentAt,
      status,
    };
  });

  // Today's priority list — stitched from highest-impact actions
  const priorities: PriorityItem[] = [];
  if (unverifiedCount > 0) {
    priorities.push({
      id: 'unverified',
      icon: ShieldAlert,
      title: `${unverifiedCount} ${unverifiedCount === 1 ? 'payment' : 'payments'} to verify`,
      subtitle: `${formatNaira(unverifiedTotal)} pending bank confirmation`,
      href: '/payments?verification=unverified',
      iconTone: 'owed',
    });
  }
  if (overdueCount > 0) {
    priorities.push({
      id: 'overdue',
      icon: AlertTriangle,
      title: `${overdueCount} overdue ${isPm ? 'rent' : 'debt'}${overdueCount === 1 ? '' : 's'}`,
      subtitle: `${formatNaira(overdueTotal)} still not paid`,
      href: '/debts?filter=overdue',
      iconTone: 'owed',
    });
  }
  for (const d of topDebtors.slice(0, 2)) {
    priorities.push({
      id: `debtor-${d.id}`,
      icon: MessageCircle,
      title: `Follow up with ${d.name}`,
      subtitle: `${formatNaira(d.totalOwed)} outstanding`,
      href: `/follow-up?customerId=${d.id}`,
      iconTone: 'brand',
    });
  }
  if (quietCustomers.length > 0 && priorities.length < 5) {
    const q = quietCustomers[0];
    priorities.push({
      id: `quiet-${q.id}`,
      icon: Sparkles,
      title: `Bring back ${q.name}`,
      subtitle: `No activity for ${Math.floor((Date.now() - q.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))} days`,
      href: `/follow-up?customerId=${q.id}`,
      iconTone: 'slate',
    });
  }

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      {/* ───────── Welcome row ───────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink md:text-3xl">
          Welcome back {firstName} <span className="inline-block">👋</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {copy.greetingSub}
        </p>
      </div>

      {/* ───────── Banners (unchanged) ───────── */}
      <div className="mb-4 space-y-3">
        {unverifiedCount > 0 && (
          <UnverifiedBanner count={unverifiedCount} total={unverifiedTotal} />
        )}
        {overdueCount > 0 && (
          <OverdueBanner count={overdueCount} total={overdueTotal} />
        )}
      </div>

      {/* ───────── New Activity cards ───────── */}
      <NewActivityCards
        latestPayment={latestPayment}
        latestDebt={latestDebt}
        latestInvoice={latestInvoice}
        businessType={user.businessType}
      />

      {/* ───────── Main grid: Chart + Schedule on left, Upgrade + Calendar on right ───────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <WeeklyBarChart
            values={weekBuckets}
            title={isPm ? 'Rent collected this week' : 'Revenue this week'}
            deltaPct={deltaPct ?? undefined}
          />
        </div>
        <div className="lg:col-span-4">
          <PriorityList
            title="Today's priorities"
            items={priorities}
            emptyMessage="Nothing urgent — enjoy the quiet."
          />
        </div>
        <div className="lg:col-span-3 space-y-4">
          <UpgradeCard plan={user.plan} businessType={user.businessType} />
          <MonthCalendar activity={calendarActivity} dueDates={calendarDue} />
        </div>
      </div>

      {/* ───────── Money stats row ───────── */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={isPm ? 'Rent collected' : 'Revenue'}
          value={formatNaira(totalReceived)}
          tone="brand"
          sub={`${paidAgg._count} ${paidAgg._count === 1 ? 'payment' : 'payments'}`}
        />
        <StatCard
          label="Expenses"
          value={formatNaira(totalExpenses)}
          sub={expensesAgg._count > 0 ? `${expensesAgg._count} logged` : 'Nothing logged'}
        />
        <StatCard
          label="Net profit"
          value={formatNaira(netProfit)}
          tone={netProfit >= 0 ? 'brand' : 'danger'}
          sub={
            totalReceived > 0
              ? `${Math.round((netProfit / totalReceived) * 100)}% margin`
              : undefined
          }
        />
        <StatCard
          label={isPm ? 'Unpaid rent' : 'Money owed'}
          value={formatNaira(totalOwed)}
          tone="danger"
          sub={
            overdueCount
              ? `${overdueCount} overdue`
              : totalOwed > 0
              ? 'All within due dates'
              : undefined
          }
        />
      </div>

      <div className="mt-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Quick actions</h2>
        <QuickActions />
      </div>

      {/* ───────── Debt progress + Reminders panel ───────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {partialDebts.length > 0 ? (
            <DebtProgressCards debts={partialDebts} businessType={user.businessType} />
          ) : (
            <section className="card p-6 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-success-50 text-success-700">
                <TrendingUp size={20} />
              </div>
              <h3 className="text-sm font-bold text-ink">No partial collections in progress</h3>
              <p className="mt-1 text-xs text-slate-500">
                When a customer pays part of a debt, the progress will show up here.
              </p>
            </section>
          )}
        </div>
        <RemindersPanel reminders={reminderRows} isPm={isPm} />
      </div>

      {/* ───────── Pending + Customers + Reports tile (keep for parity) ───────── */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          label="Pending payments"
          value={formatNaira(totalPending)}
          sub={
            pendingAgg._count > 0
              ? `${pendingAgg._count} waiting`
              : 'Nothing waiting'
          }
        />
        <StatCard
          label={copy.customerLabelPlural}
          value={String(customerCountAll)}
          sub="All time"
        />
        <Link
          href="/reports"
          className="card flex items-center gap-3 p-4 hover:border-brand-500"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <BarChart3 size={20} />
          </span>
          <span>
            <span className="block text-xs font-medium text-slate-500">Reports</span>
            <span className="block text-sm font-semibold text-ink">Trends & exports</span>
          </span>
        </Link>
      </div>

      {/* Floating PWA install prompt (renders conditionally, dismissible). */}
      <InstallPrompt />
    </AppShell>
  );
}
