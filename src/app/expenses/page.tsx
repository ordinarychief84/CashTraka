import Link from 'next/link';
import { Suspense } from 'react';
import {
  Plus,
  ReceiptText,
  Briefcase,
  User as UserIcon,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Smartphone,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatCard } from '@/components/StatCard';
import { TimeRange } from '@/components/TimeRange';
import { ExpenseRowActions } from '@/components/ExpenseRowActions';
import { ExpenseSearchBar } from '@/components/ExpenseSearchBar';
import { PersonalBudgetCard } from '@/components/PersonalBudgetCard';
import { formatNaira, formatDate } from '@/lib/format';
import { parseRange, rangeStart, RANGE_LABELS } from '@/lib/range';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Kind = 'business' | 'personal' | 'all';
type SP = { range?: string; kind?: string; q?: string; category?: string };

function parseKind(k: string | undefined): Kind {
  if (k === 'business' || k === 'personal') return k;
  return 'all';
}

const PAY_METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote size={10} />,
  transfer: <Smartphone size={10} />,
  card: <CreditCard size={10} />,
  pos: <ReceiptText size={10} />,
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const user = await guard();
  const range = parseRange(searchParams.range);
  const start = rangeStart(range);
  const kind = parseKind(searchParams.kind);
  const searchQ = searchParams.q?.trim() || '';
  const categoryFilter = searchParams.category || '';

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Previous month for trend comparison
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const kindFilter = kind === 'all' ? {} : { kind };

  const searchWhere: Record<string, unknown> = {};
  if (searchQ) {
    searchWhere.OR = [
      { category: { contains: searchQ, mode: 'insensitive' } },
      { note: { contains: searchQ, mode: 'insensitive' } },
      { vendor: { contains: searchQ, mode: 'insensitive' } },
    ];
  }
  if (categoryFilter) {
    searchWhere.category = categoryFilter;
  }

  const [
    expenses,
    businessAgg,
    personalAgg,
    receivedAgg,
    personalWeekAgg,
    personalMonthAgg,
    prevMonthBusinessAgg,
    prevMonthPersonalAgg,
    recurringCount,
    taxDeductibleAgg,
  ] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId: user.id,
        ...(start ? { incurredOn: { gte: start } } : {}),
        ...kindFilter,
        ...searchWhere,
      },
      orderBy: { incurredOn: 'desc' },
      take: 200,
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        kind: 'business',
        ...(start ? { incurredOn: { gte: start } } : {}),
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        kind: 'personal',
        ...(start ? { incurredOn: { gte: start } } : {}),
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: {
        userId: user.id,
        status: 'PAID',
        ...(start ? { createdAt: { gte: start } } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        kind: 'personal',
        incurredOn: { gte: weekStart },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        kind: 'personal',
        incurredOn: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        kind: 'business',
        incurredOn: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        kind: 'personal',
        incurredOn: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.expense.count({
      where: { userId: user.id, isRecurring: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        kind: 'business',
        taxDeductible: true,
        ...(start ? { incurredOn: { gte: start } } : {}),
      },
      _sum: { amount: true },
    }),
  ]);

  const businessTotal = businessAgg._sum.amount ?? 0;
  const personalTotal = personalAgg._sum.amount ?? 0;
  const received = receivedAgg._sum.amount ?? 0;
  const profit = received - businessTotal;
  const prevBusiness = prevMonthBusinessAgg._sum.amount ?? 0;
  const prevPersonal = prevMonthPersonalAgg._sum.amount ?? 0;
  const taxDeductibleTotal = taxDeductibleAgg._sum?.amount ?? 0;

  const personalWeek = personalWeekAgg._sum.amount ?? 0;
  const personalMonth = personalMonthAgg._sum.amount ?? 0;
  const weeklyBudget = user.personalBudgetWeekly ?? null;
  const monthlyBudget = user.personalBudgetMonthly ?? null;
  const overWeek = weeklyBudget !== null && personalWeek > weeklyBudget;
  const overMonth = monthlyBudget !== null && personalMonth > monthlyBudget;

  // Category breakdown
  const byCategory = new Map<string, number>();
  for (const e of expenses)
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);

  // Payment method breakdown
  const byPayMethod = new Map<string, number>();
  for (const e of expenses) {
    const m = (e as Record<string, unknown>).paymentMethod as string | null;
    if (m) byPayMethod.set(m, (byPayMethod.get(m) ?? 0) + e.amount);
  }

  // Trend calculation
  const businessTrend =
    prevBusiness > 0
      ? Math.round(((businessTotal - prevBusiness) / prevBusiness) * 100)
      : null;
  const personalTrend =
    prevPersonal > 0
      ? Math.round(((personalTotal - prevPersonal) / prevPersonal) * 100)
      : null;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Expense Management"
        subtitle="Track business costs and personal spending separately, know exactly where every naira goes."
        action={
          <Link href="/expenses/new" className="btn-primary">
            <Plus size={18} />
            Log Expense
          </Link>
        }
      />

      {/* ── Personal budget alerts ── */}
      {(overWeek || overMonth) && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <div className="text-sm">
            <div className="font-bold text-red-800">
              Personal spending alert
            </div>
            <ul className="mt-1 space-y-0.5 text-red-700">
              {overWeek && (
                <li>
                  This week: {formatNaira(personalWeek)} spent vs{' '}
                  {formatNaira(weeklyBudget!)} budget ·{' '}
                  <strong>
                    {formatNaira(personalWeek - weeklyBudget!)} over
                  </strong>
                </li>
              )}
              {overMonth && (
                <li>
                  This month: {formatNaira(personalMonth)} spent vs{' '}
                  {formatNaira(monthlyBudget!)} budget ·{' '}
                  <strong>
                    {formatNaira(personalMonth - monthlyBudget!)} over
                  </strong>
                </li>
              )}
            </ul>
            <a
              href="#personal-budget"
              className="mt-2 inline-block text-xs font-semibold text-red-800 underline hover:text-red-900"
            >
              Adjust thresholds
            </a>
          </div>
        </div>
      )}

      {/* ── Kind tabs ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <KindTab
          label="All Expenses"
          active={kind === 'all'}
          href={`/expenses${range !== 'all' ? '?range=' + range : ''}`}
        />
        <KindTab
          label="Business"
          icon={<Briefcase size={12} />}
          active={kind === 'business'}
          href={`/expenses?kind=business${range !== 'all' ? '&range=' + range : ''}`}
          count={businessAgg._count}
        />
        <KindTab
          label="Personal"
          icon={<UserIcon size={12} />}
          active={kind === 'personal'}
          href={`/expenses?kind=personal${range !== 'all' ? '&range=' + range : ''}`}
          count={personalAgg._count}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <TimeRange value={range} basePath="/expenses" />
      </div>

      {/* ── Search + category filter ── */}
      <Suspense>
        <ExpenseSearchBar />
      </Suspense>

      {/* ── Stats grid, context-aware ── */}
      {kind === 'business' || kind === 'all' ? (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label={`Business costs`}
            value={formatNaira(businessTotal)}
            tone="neutral"
            sub={
              businessTrend !== null
                ? `${businessTrend > 0 ? '↑' : '↓'} ${Math.abs(businessTrend)}% vs last month`
                : 'Affects your P&L'
            }
          />
          {kind === 'all' && (
            <StatCard
              label="Personal spending"
              value={formatNaira(personalTotal)}
              tone={overWeek || overMonth ? 'danger' : 'neutral'}
              sub={
                personalTrend !== null
                  ? `${personalTrend > 0 ? '↑' : '↓'} ${Math.abs(personalTrend)}% vs last month`
                  : 'Tracked separately'
              }
            />
          )}
          <StatCard
            label="Revenue"
            value={formatNaira(received)}
            tone="brand"
          />
          <StatCard
            label="Net profit"
            value={formatNaira(profit)}
            tone={profit >= 0 ? 'brand' : 'danger'}
            sub={
              profit < 0
                ? 'Costs exceed revenue'
                : 'Revenue minus business costs'
            }
          />
          {kind === 'business' && taxDeductibleTotal > 0 && (
            <StatCard
              label="Tax deductible"
              value={formatNaira(taxDeductibleTotal)}
              tone="neutral"
              sub="Potential tax savings"
            />
          )}
        </div>
      ) : (
        /* Personal-only view, show personal-relevant stats */
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard
            label="This week"
            value={formatNaira(personalWeek)}
            tone={overWeek ? 'danger' : 'neutral'}
            sub={
              weeklyBudget
                ? `Budget: ${formatNaira(weeklyBudget)}`
                : 'No weekly budget set'
            }
          />
          <StatCard
            label="This month"
            value={formatNaira(personalMonth)}
            tone={overMonth ? 'danger' : 'neutral'}
            sub={
              monthlyBudget
                ? `Budget: ${formatNaira(monthlyBudget)}`
                : 'No monthly budget set'
            }
          />
          <StatCard
            label="Total personal"
            value={formatNaira(personalTotal)}
            tone="neutral"
            sub={
              personalTrend !== null
                ? `${personalTrend > 0 ? '↑' : '↓'} ${Math.abs(personalTrend)}% vs last month`
                : `${RANGE_LABELS[range]}`
            }
          />
        </div>
      )}

      {/* ── Insights row ── */}
      {(recurringCount > 0 || byPayMethod.size > 0) && (
        <div className="mb-4 flex flex-wrap gap-3">
          {recurringCount > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs">
              <RotateCcw size={10} className="text-brand-600" />
              <span className="text-slate-600">
                {recurringCount} recurring{' '}
                {recurringCount === 1 ? 'expense' : 'expenses'}
              </span>
            </div>
          )}
          {[...byPayMethod.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([method, total]) => (
              <span
                key={method}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs"
              >
                {PAY_METHOD_ICONS[method] ?? null}
                <span className="capitalize text-slate-600">{method}</span>
                <span className="num font-semibold text-ink">
                  {formatNaira(total)}
                </span>
              </span>
            ))}
        </div>
      )}

      {/* ── Category breakdown ── */}
      {byCategory.size > 0 && (
        <div className="card mb-4 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Spending by category ({RANGE_LABELS[range]})
          </div>
          <div className="flex flex-wrap gap-2">
            {[...byCategory.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => {
                const pct =
                  kind === 'business'
                    ? businessTotal > 0
                      ? Math.round((total / businessTotal) * 100)
                      : 0
                    : kind === 'personal'
                      ? personalTotal > 0
                        ? Math.round((total / personalTotal) * 100)
                        : 0
                      : (businessTotal + personalTotal) > 0
                        ? Math.round(
                            (total / (businessTotal + personalTotal)) * 100,
                          )
                        : 0;
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs"
                  >
                    <span className="font-semibold text-ink">{cat}</span>
                    <span className="num text-slate-600">
                      {formatNaira(total)}
                    </span>
                    <span className="text-slate-400">{pct}%</span>
                  </span>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Expense list ── */}
      {expenses.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={
            searchQ
              ? `No expenses match "${searchQ}"`
              : categoryFilter
                ? `No ${categoryFilter} expenses`
                : kind === 'personal'
                  ? 'No personal expenses yet'
                  : kind === 'business'
                    ? 'No business expenses yet'
                    : 'No expenses yet'
          }
          description={
            searchQ || categoryFilter
              ? 'Try adjusting your search or filter.'
              : kind === 'personal'
                ? 'Track your personal spending to set budgets and avoid overspending.'
                : 'Log your business costs to see real profit, not just revenue.'
          }
          actionHref="/expenses/new"
          actionLabel="Log expense"
        />
      ) : (
        <ul className="card divide-y divide-border">
          {expenses.map((e) => {
            const exp = e as Record<string, unknown>;
            return (
              <li key={e.id} className="flex items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-medium text-ink">{e.category}</span>
                    <KindBadge
                      kind={
                        (e.kind as 'business' | 'personal') ?? 'business'
                      }
                    />
                    {Boolean(exp.isRecurring) && (
                      <RotateCcw
                        size={10}
                        className="shrink-0 text-brand-500"
                        aria-label="Recurring"
                      />
                    )}
                    {Boolean(exp.taxDeductible) && (
                      <ShieldCheck
                        size={10}
                        className="shrink-0 text-success-500"
                        aria-label="Tax deductible"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span>{formatDate(e.incurredOn)}</span>
                    {Boolean(exp.vendor) && (
                      <>
                        <span>·</span>
                        <span className="truncate">
                          {exp.vendor as string}
                        </span>
                      </>
                    )}
                    {Boolean(exp.paymentMethod) && (
                      <>
                        <span>·</span>
                        <span className="capitalize">
                          {exp.paymentMethod as string}
                        </span>
                      </>
                    )}
                    {e.note && (
                      <>
                        <span>·</span>
                        <span className="truncate">{e.note}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="num text-owed-600 whitespace-nowrap">
                  -{formatNaira(e.amount)}
                </div>
                <ExpenseRowActions id={e.id} />
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Personal budget thresholds ── */}
      <div className="mt-6" id="personal-budget">
        <PersonalBudgetCard
          initial={{
            weekly: user.personalBudgetWeekly ?? null,
            monthly: user.personalBudgetMonthly ?? null,
          }}
        />
      </div>
    </AppShell>
  );
}

function KindTab({
  label,
  icon,
  active,
  href,
  count,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  href: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-border bg-white text-slate-600 hover:bg-slate-50',
      )}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            'ml-0.5 rounded-full px-1.5 text-[10px] font-bold',
            active
              ? 'bg-brand-200 text-brand-800'
              : 'bg-slate-100 text-slate-500',
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function KindBadge({ kind }: { kind: 'business' | 'personal' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase',
        kind === 'personal'
          ? 'bg-owed-100 text-owed-700'
          : 'bg-brand-50 text-brand-600',
      )}
    >
      {kind === 'personal' ? (
        <UserIcon size={8} />
      ) : (
        <Briefcase size={8} />
      )}
      {kind}
    </span>
  );
}