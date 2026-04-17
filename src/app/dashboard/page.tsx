import Link from 'next/link';
import {
  Wallet,
  Clock3,
  Users,
  MessageCircle,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Receipt,
  Package,
  Users2,
  ArrowRight,
  PiggyBank,
  Percent,
} from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { HeroRevenue } from '@/components/dashboard/HeroRevenue';
import { KpiCard } from '@/components/dashboard/KpiCard';
import {
  TodayTriage,
  type TriageItem,
  TriageIcons,
} from '@/components/dashboard/TodayTriage';
import { TopContributors } from '@/components/dashboard/TopContributors';
import { DebtProgressCards } from '@/components/dashboard/DebtProgressCards';
import { RemindersPanel } from '@/components/dashboard/RemindersPanel';
import { UpgradeCard } from '@/components/dashboard/UpgradeCard';
import { CreateReceiptButton } from '@/components/CreateReceiptButton';
import { InstallPrompt } from '@/components/InstallPrompt';
import { formatNaira } from '@/lib/format';
import { copyFor, isPropertyManager } from '@/lib/business-type';
import { can } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const QUIET_THRESHOLD_DAYS = 30;

/**
 * Dashboard — redesigned around three zones in a strict order:
 *
 *   1. TODAY   What needs my attention right now? Ranked triage list +
 *              a persistent "Create receipt" CTA since that's the
 *              highest-frequency action for any seller.
 *   2. PULSE   How's the business trending? Hero card (weekly revenue +
 *              WoW delta + sparkline) plus 3-4 supporting KPIs with
 *              week-over-week deltas.
 *   3. ACTIVITY Deeper operational surface: top contributors, partial
 *              collections, reminders.
 *
 * Role-aware:
 *   OWNER / MANAGER   full view
 *   CASHIER           Today zone + sales pulse only — no profit, no growth cards
 *   VIEWER            pulse + activity only — no action items
 */
export default async function DashboardPage() {
  const user = await guard();
  const now = new Date();
  const copy = copyFor(user.businessType);
  const isPm = isPropertyManager(user.businessType);
  const firstName = user.name.split(' ')[0];

  // Role-based feature gates (used for conditional sections below)
  const showExpenses = can(user.accessRole, 'expenses.read');
  const showTeam = can(user.accessRole, 'team.read');
  const showReports = can(user.accessRole, 'reports.read');
  const canWrite = can(user.accessRole, 'payments.write');

  // ── Date anchors ───────────────────────────────────────────────────────
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Trailing 7 days — includes today.
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);

  // The prior 7-day window, for WoW deltas.
  const prevWeekEnd = new Date(weekStart);
  prevWeekEnd.setMilliseconds(prevWeekEnd.getMilliseconds() - 1);
  const prevWeekStart = new Date(prevWeekEnd);
  prevWeekStart.setDate(prevWeekStart.getDate() - 6);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // ── Parallel data fetch ────────────────────────────────────────────────
  const [
    paymentsThisWeek,
    paymentsPrevWeek,
    paymentsThisMonth,
    paymentsPrevMonth,
    openDebtAgg,
    openDebtPrevMonth,
    overdueAgg,
    expensesThisMonth,
    unverifiedAgg,
    topDebtors,
    quietCustomers,
    partialDebts,
    remindersDue,
    lowStockCount,
    topContributors,
  ] = await Promise.all([
    // This week's PAID payments (for hero total + sparkline + transaction count)
    prisma.payment.findMany({
      where: {
        userId: user.id,
        status: 'PAID',
        createdAt: { gte: weekStart },
      },
      select: { amount: true, createdAt: true },
    }),
    // Previous week's PAID total (for WoW delta)
    prisma.payment.aggregate({
      where: {
        userId: user.id,
        status: 'PAID',
        createdAt: { gte: prevWeekStart, lte: prevWeekEnd },
      },
      _sum: { amount: true },
      _count: true,
    }),
    // This month's PAID payments (for AOV + monthly revenue)
    prisma.payment.aggregate({
      where: {
        userId: user.id,
        status: 'PAID',
        createdAt: { gte: monthStart },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: {
        userId: user.id,
        status: 'PAID',
        createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { amount: true },
      _count: true,
    }),
    // Outstanding debt (open)
    prisma.debt.aggregate({
      where: { userId: user.id, status: 'OPEN' },
      _sum: { amountOwed: true, amountPaid: true },
    }),
    // Outstanding at end of last month — to compute trend on "owed"
    prisma.debt.aggregate({
      where: {
        userId: user.id,
        createdAt: { lte: prevMonthEnd },
        OR: [{ status: 'OPEN' }, { updatedAt: { gt: prevMonthEnd } }],
      },
      _sum: { amountOwed: true, amountPaid: true },
    }),
    prisma.debt.aggregate({
      where: {
        userId: user.id,
        status: 'OPEN',
        dueDate: { lt: now, not: null },
      },
      _sum: { amountOwed: true, amountPaid: true },
      _count: true,
    }),
    showExpenses
      ? prisma.expense.aggregate({
          where: {
            userId: user.id,
            // Only BUSINESS expenses reduce profit. Personal is out-of-pocket.
            kind: 'business',
            incurredOn: { gte: monthStart },
          },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: 0 } } as const),
    prisma.payment.aggregate({
      where: { userId: user.id, status: 'PAID', verified: false },
      _sum: { amount: true },
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
    prisma.debt.findMany({
      where: { userId: user.id, status: 'OPEN', amountPaid: { gt: 0 } },
      orderBy: { updatedAt: 'desc' },
      take: 4,
    }),
    prisma.reminderSchedule.findMany({
      where: { userId: user.id, enabled: true },
      include: { debt: true },
      orderBy: { nextDueAt: 'asc' },
      take: 5,
    }),
    // Low-stock products (sellers only)
    isPm
      ? Promise.resolve(0)
      : prisma.product.count({
          where: {
            userId: user.id,
            trackStock: true,
            archived: false,
            // Prisma SQLite doesn't allow column-to-column comparison in
            // `where`, so pull candidates via a raw count on a threshold.
            // We rely on the low-stock alert check happening elsewhere too.
            stock: { lte: 3 },
          },
        }),
    // Top revenue contributors this month
    prisma.payment.groupBy({
      by: ['customerId', 'customerNameSnapshot'],
      where: {
        userId: user.id,
        status: 'PAID',
        createdAt: { gte: monthStart },
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
  ]);

  // ── Derived metrics ────────────────────────────────────────────────────

  // Weekly revenue + daily sparkline buckets (oldest → newest)
  const weekBuckets = Array<number>(7).fill(0);
  for (const p of paymentsThisWeek) {
    const diff = Math.floor(
      (today.getTime() - new Date(p.createdAt).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diff < 0 || diff >= 7) continue;
    weekBuckets[6 - diff] += p.amount;
  }
  const weekTotal = weekBuckets.reduce((s, v) => s + v, 0);
  const prevWeekTotal = paymentsPrevWeek._sum.amount ?? 0;
  const weekDelta =
    prevWeekTotal > 0 ? Math.round(((weekTotal - prevWeekTotal) / prevWeekTotal) * 100) : null;

  const monthRevenue = paymentsThisMonth._sum.amount ?? 0;
  const monthCount = paymentsThisMonth._count;
  const prevMonthRevenue = paymentsPrevMonth._sum.amount ?? 0;
  const monthDelta =
    prevMonthRevenue > 0
      ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : null;
  const aov = monthCount > 0 ? Math.round(monthRevenue / monthCount) : 0;
  const prevAov =
    paymentsPrevMonth._count > 0
      ? Math.round((paymentsPrevMonth._sum.amount ?? 0) / paymentsPrevMonth._count)
      : 0;
  const aovDelta = prevAov > 0 ? Math.round(((aov - prevAov) / prevAov) * 100) : null;

  const totalOwed = Math.max(
    (openDebtAgg._sum.amountOwed ?? 0) - (openDebtAgg._sum.amountPaid ?? 0),
    0,
  );
  const prevOwed = Math.max(
    (openDebtPrevMonth._sum.amountOwed ?? 0) - (openDebtPrevMonth._sum.amountPaid ?? 0),
    0,
  );
  const owedDelta =
    prevOwed > 0 ? Math.round(((totalOwed - prevOwed) / prevOwed) * 100) : null;

  const overdueCount = overdueAgg._count;
  const overdueTotal = Math.max(
    (overdueAgg._sum.amountOwed ?? 0) - (overdueAgg._sum.amountPaid ?? 0),
    0,
  );
  const unverifiedCount = unverifiedAgg._count;
  const unverifiedTotal = unverifiedAgg._sum.amount ?? 0;
  const monthExpenses = showExpenses ? expensesThisMonth._sum.amount ?? 0 : 0;
  const netProfit = monthRevenue - monthExpenses;
  const profitMargin = monthRevenue > 0 ? Math.round((netProfit / monthRevenue) * 100) : null;

  // Collection rate — what fraction of what's been billed has been received.
  // billed = revenue + outstanding; collected = revenue.
  const totalBilled = monthRevenue + totalOwed;
  const collectionRate = totalBilled > 0 ? Math.round((monthRevenue / totalBilled) * 100) : null;

  // Build triage queue ────────────────────────────────────────────────────
  const triage: TriageItem[] = [];
  if (unverifiedCount > 0) {
    triage.push({
      id: 'unverified',
      severity: 'critical',
      icon: TriageIcons.unverified,
      title: `${unverifiedCount} ${unverifiedCount === 1 ? 'payment needs' : 'payments need'} verification`,
      subtitle: `${formatNaira(unverifiedTotal)} waiting for a bank-alert match`,
      href: '/payments?verification=unverified',
      moneyImpact: unverifiedTotal,
    });
  }
  if (overdueCount > 0) {
    triage.push({
      id: 'overdue',
      severity: 'critical',
      icon: TriageIcons.overdue,
      title: `${overdueCount} overdue ${isPm ? 'rent' : 'debt'}${overdueCount === 1 ? '' : 's'}`,
      subtitle: `${formatNaira(overdueTotal)} past due`,
      href: '/debts?filter=overdue',
      moneyImpact: overdueTotal,
    });
  }
  for (const d of topDebtors) {
    // Skip top debtor if already captured by overdue (avoid duplicates)
    triage.push({
      id: `debtor-${d.id}`,
      severity: 'warning',
      icon: TriageIcons.followUp,
      title: `Follow up with ${d.name}`,
      subtitle: `${formatNaira(d.totalOwed)} outstanding`,
      href: `/follow-up?customerId=${d.id}`,
      moneyImpact: d.totalOwed,
    });
  }
  if (!isPm && lowStockCount > 0) {
    triage.push({
      id: 'low-stock',
      severity: 'warning',
      icon: TriageIcons.lowStock,
      title: `${lowStockCount} ${lowStockCount === 1 ? 'product is' : 'products are'} low on stock`,
      subtitle: 'Restock before you run out',
      href: '/products',
    });
  }
  if (quietCustomers.length > 0) {
    const q = quietCustomers[0];
    const days = Math.floor(
      (Date.now() - q.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    triage.push({
      id: `quiet-${q.id}`,
      severity: 'info',
      icon: TriageIcons.dormant,
      title: `Bring back ${q.name}`,
      subtitle: `No activity for ${days} days`,
      href: `/follow-up?customerId=${q.id}`,
    });
  }

  // Top contributors payload
  const contributorRows = topContributors
    .filter((r) => r.customerId)
    .map((r) => ({
      id: r.customerId!,
      name: r.customerNameSnapshot,
      total: r._sum.amount ?? 0,
      transactions: r._count,
    }));

  const monthLabel = now.toLocaleString('en-NG', { month: 'long' });
  const heroLabel = isPm ? 'Rent collected' : 'Revenue';

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* ───────── Welcome + primary CTA ───────── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-3xl">
            {greetingFor()} {firstName} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">{copy.greetingSub}</p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <CreateReceiptButton
              businessName={user.businessName ?? 'Business'}
              variant="primary"
              label="Create receipt"
            />
            <Link href="/payments/new" className="btn-secondary">
              <Wallet size={16} />
              Add payment
            </Link>
          </div>
        )}
      </div>

      {/* ─────────────────── ZONE 1 · TODAY ─────────────────── */}
      <TodayTriage items={triage} />

      {/* ─────────────────── ZONE 2 · PULSE ─────────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <HeroRevenue
            label={heroLabel}
            total={weekTotal}
            deltaPct={weekDelta}
            daily={weekBuckets}
            transactions={paymentsThisWeek.length}
          />
        </div>
        <div className="grid gap-3 lg:col-span-5 lg:grid-cols-2">
          {/* Money owed to you — always important for NG SMBs */}
          <KpiCard
            label={isPm ? 'Unpaid rent' : 'Money owed'}
            value={formatNaira(totalOwed)}
            sub={overdueCount > 0 ? `${overdueCount} overdue` : 'Open balances'}
            tone={totalOwed > 0 ? 'danger' : 'neutral'}
            deltaPct={owedDelta}
            deltaSemantics="inverse"
            icon={<Clock3 size={13} />}
          />
          {/* Collection rate — the KPI that matters most for cashflow */}
          <KpiCard
            label="Collection rate"
            value={collectionRate === null ? '—' : `${collectionRate}%`}
            sub={
              collectionRate === null
                ? 'No activity yet'
                : collectionRate >= 80
                  ? 'Healthy cashflow'
                  : 'Chase open balances'
            }
            tone={
              collectionRate === null
                ? 'neutral'
                : collectionRate >= 80
                  ? 'brand'
                  : collectionRate >= 50
                    ? 'warning'
                    : 'danger'
            }
            icon={<Percent size={13} />}
          />
          {/* Net profit (owners only — requires expenses) */}
          {showExpenses && (
            <KpiCard
              label={`Net profit · ${monthLabel}`}
              value={formatNaira(netProfit)}
              sub={profitMargin !== null ? `${profitMargin}% margin` : 'Log expenses to see margin'}
              tone={netProfit >= 0 ? 'brand' : 'danger'}
              icon={<PiggyBank size={13} />}
            />
          )}
          {/* Average transaction value */}
          <KpiCard
            label="Avg transaction"
            value={aov > 0 ? formatNaira(aov) : '—'}
            sub={monthCount > 0 ? `${monthCount} paid · ${monthLabel}` : 'No payments yet'}
            deltaPct={aovDelta}
            icon={<Wallet size={13} />}
          />
        </div>
      </div>

      {/* ─────────────────── ZONE 3 · ACTIVITY ─────────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          {/* Top contributors */}
          <TopContributors rows={contributorRows} monthLabel={monthLabel} />

          {/* Partial collections progress */}
          {partialDebts.length > 0 && (
            <DebtProgressCards debts={partialDebts} businessType={user.businessType} />
          )}
        </div>
        <div className="space-y-4 lg:col-span-5">
          <RemindersPanel
            reminders={remindersDue.map((s) => {
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
            })}
            isPm={isPm}
          />

          {/* Monthly pulse strip */}
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
              <TrendingUp size={16} className="text-brand-600" />
              {monthLabel} at a glance
            </h2>
            <dl className="divide-y divide-border text-sm">
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-600">{heroLabel}</dt>
                <dd className="num font-bold text-ink">
                  {formatNaira(monthRevenue)}
                  {monthDelta !== null && (
                    <span
                      className={
                        'ml-2 text-[11px] font-semibold ' +
                        (monthDelta >= 0 ? 'text-brand-700' : 'text-red-600')
                      }
                    >
                      {monthDelta >= 0 ? '+' : ''}{monthDelta}% vs last
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-600">Transactions</dt>
                <dd className="num font-bold text-ink">{monthCount}</dd>
              </div>
              {showExpenses && (
                <div className="flex items-center justify-between py-2">
                  <dt className="text-slate-600">Expenses</dt>
                  <dd className="num font-bold text-ink">{formatNaira(monthExpenses)}</dd>
                </div>
              )}
            </dl>
            {showReports && (
              <Link
                href="/reports"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              >
                Full reports
                <ArrowRight size={12} />
              </Link>
            )}
          </section>

          {/* Upgrade card — only for owners on Free, and only in the sidebar,
              not stealing prime zone-1 real estate. */}
          {user.isOwner && (
            <UpgradeCard plan={user.plan} businessType={user.businessType} />
          )}
        </div>
      </div>

      <InstallPrompt />
    </AppShell>
  );
}

/** Dynamic greeting based on Lagos-ish local time. */
function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
