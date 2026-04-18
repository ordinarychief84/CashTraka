import Link from 'next/link';
import { Suspense } from 'react';
import { Plus, Receipt, Briefcase, User as UserIcon, AlertTriangle } from 'lucide-react';
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

/**
 * Expenses page with the new business vs personal split,
 * plus search and category filter.
 */
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

  const kindFilter =
    kind === 'all' ? {} : { kind };

  // Build search/category where clause
  const searchWhere: Record<string, unknown> = {};
  if (searchQ) {
    searchWhere.OR = [
      { category: { contains: searchQ, mode: 'insensitive' } },
      { note: { contains: searchQ, mode: 'insensitive' } },
    ];
  }
  if (categoryFilter) {
    searchWhere.category = categoryFilter;
  }

  const [expenses, rangeAgg, businessAgg, personalAgg, receivedAgg, personalWeekAgg, personalMonthAgg] =
    await Promise.all([
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
          ...(start ? { incurredOn: { gte: start } } : {}),
          ...kindFilter,
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId: user.id,
          kind: 'business',
          ...(start ? { incurredOn: { gte: start } } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId: user.id,
          kind: 'personal',
          ...(start ? { incurredOn: { gte: start } } : {}),
        },
        _sum: { amount: true },
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
    ]);

  const totalRange = rangeAgg._sum.amount ?? 0;
  const businessRange = businessAgg._sum.amount ?? 0;
  const personalRange = personalAgg._sum.amount ?? 0;
  const received = receivedAgg._sum.amount ?? 0;
  const profit = received - businessRange;

  const personalWeek = personalWeekAgg._sum.amount ?? 0;
  const personalMonth = personalMonthAgg._sum.amount ?? 0;
  const weeklyBudget = user.personalBudgetWeekly ?? null;
  const monthlyBudget = user.personalBudgetMonthly ?? null;
  const overWeek = weeklyBudget !== null && personalWeek > weeklyBudget;
  const overMonth = monthlyBudget !== null && personalMonth > monthlyBudget;

  // Group by category within the current tab.
  const byCategory = new Map<string, number>();
  for (const e of expenses)
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Expenses"
        subtitle="Track what you spend — business OR personal — so you know where your money goes."
        action={
          <Link href="/expenses/new" className="btn-primary">
            <Plus size={18} />
            Add
          </Link>
        }
      />

      {/* ── Personal budget alerts ── */}
      {(overWeek || overMonth) && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <div className="text-sm">
            <div className="font-bold text-red-800">Personal budget crossed</div>
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
              Adjust thresholds below
            </a>
          </div>
        </div>
      )}

      {/* ── Kind tabs ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <KindTab
          label="All"
          active={kind === 'all'}
          href={`/expenses${range !== 'all' ? '?range=' + range : ''}`}
        />
        <KindTab
          label="Business"
          icon={<Briefcase size={12} />}
          active={kind === 'business'}
          href={`/expenses?kind=business${range !== 'all' ? '&range=' + range : ''}`}
        />
        <KindTab
          label="Personal"
          icon={<UserIcon size={12} />}
          active={kind === 'personal'}
          href={`/expenses?kind=personal${range !== 'all' ? '&range=' + range : ''}`}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <TimeRange value={range} basePath="/expenses" />
      </div>

      {/* ── Search + category filter ── */}
      <Suspense>
        <ExpenseSearchBar />
      </Suspense>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={`Business (${RANGE_LABELS[range]})`}
          value={formatNaira(businessRange)}
          tone="neutral"
          sub="Affects P&L"
        />
        <StatCard
          label={`Personal (${RANGE_LABELS[range]})`}
          value={formatNaira(personalRange)}
          tone={overWeek || overMonth ? 'danger' : 'neutral'}
          sub="Out-of-pocket"
        />
        <StatCard
          label={`Revenue (${RANGE_LABELS[range]})`}
          value={formatNaira(received)}
          tone="brand"
        />
        <StatCard
          label={`Net profit (${RANGE_LABELS[range]})`}
          value={formatNaira(profit)}
          tone={profit >= 0 ? 'brand' : 'danger'}
          sub={profit < 0 ? 'Spending > revenue' : 'Revenue − business spend'}
        />
      </div>

      {byCategory.size > 0 && (
        <div className="card mb-4 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            By category ({RANGE_LABELS[range]})
          </div>
          <div className="flex flex-wrap gap-2">
            {[...byCategory.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs"
                >
                  <span className="font-semibold text-ink">{cat}</span>
                  <span className="num text-slate-600">{formatNaira(total)}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
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
              : 'Log what you spend so you see real profit, not just revenue. Tag it Personal to track your out-of-pocket.'
          }
          actionHref="/expenses/new"
          actionLabel="Add expense"
        />
      ) : (
        <>
        <ul className="card divide-y divide-border">
          {expenses.map((e) => (
            <li key={e.id} className="flex items-center gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-medium text-ink">{e.category}</span>
                  <KindBadge kind={(e.kind as 'business' | 'personal') ?? 'business'} />
                  {e.note && (
                    <span className="truncate text-xs text-slate-600">· {e.note}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">{formatDate(e.incurredOn)}</div>
              </div>
              <div className="num text-owed-600">-{formatNaira(e.amount)}</div>
              <ExpenseRowActions id={e.id} />
            </li>
          ))}
        </ul>
        </>
      )}

      {/* ── Personal budget thresholds ── */}
      <div className="mt-6">
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
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-border bg-white text-slate-600 hover:bg-slate-50',
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function KindBadge({ kind }: { kind: 'business' | 'personal' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase',
        kind === 'personal'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-600',
      )}
    >
      {kind === 'personal' ? <UserIcon size={8} /> : <Briefcase size={8} />}
      {kind}
    </span>
  );
}
