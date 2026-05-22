import Link from 'next/link';
import { Suspense } from 'react';
import {
  Plus,
  ReceiptText,
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
import { formatKobo, formatDate } from '@/lib/format';
import { parseRange, rangeStart, RANGE_LABELS } from '@/lib/range';

export const dynamic = 'force-dynamic';

type SP = { range?: string; q?: string; category?: string };

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
  const searchQ = searchParams.q?.trim() || '';
  const categoryFilter = searchParams.category || '';

  const now = new Date();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

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
    receivedAgg,
    prevMonthBusinessAgg,
    recurringCount,
    taxDeductibleAgg,
  ] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId: user.id,
        ...(start ? { incurredOn: { gte: start } } : {}),
        ...searchWhere,
      },
      orderBy: { incurredOn: 'desc' },
      take: 200,
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        ...(start ? { incurredOn: { gte: start } } : {}),
      },
      _sum: { amountKobo: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: {
        userId: user.id,
        status: 'PAID',
        ...(start ? { createdAt: { gte: start } } : {}),
      },
      _sum: { amountKobo: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        incurredOn: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { amountKobo: true },
    }),
    prisma.expense.count({
      where: { userId: user.id, isRecurring: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        taxDeductible: true,
        ...(start ? { incurredOn: { gte: start } } : {}),
      },
      _sum: { amountKobo: true },
    }),
  ]);

  const businessTotal = businessAgg._sum.amountKobo ?? 0;
  const received = receivedAgg._sum.amountKobo ?? 0;
  const profit = received - businessTotal;
  const prevBusiness = prevMonthBusinessAgg._sum.amountKobo ?? 0;
  const taxDeductibleTotal = taxDeductibleAgg._sum?.amountKobo ?? 0;

  const businessTrend =
    prevBusiness > 0
      ? Math.round(((businessTotal - prevBusiness) / prevBusiness) * 100)
      : null;

  // Category breakdown
  const byCategory = new Map<string, number>();
  for (const e of expenses)
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amountKobo);

  // Payment method breakdown
  const byPayMethod = new Map<string, number>();
  for (const e of expenses) {
    const m = (e as Record<string, unknown>).paymentMethod as string | null;
    if (m) byPayMethod.set(m, (byPayMethod.get(m) ?? 0) + e.amountKobo);
  }

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
        subtitle="Track production costs, overheads, and operational spend to know your real profit margin."
        action={
          <Link href="/expenses/new" className="btn-primary">
            <Plus size={18} />
            Log Expense
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <TimeRange value={range} basePath="/expenses" />
      </div>

      {/* ── Search + category filter ── */}
      <Suspense>
        <ExpenseSearchBar />
      </Suspense>

      {/* ── Stats grid ── */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total expenses"
          value={formatKobo(businessTotal)}
          tone="neutral"
          sub={
            businessTrend !== null
              ? `${businessTrend > 0 ? '↑' : '↓'} ${Math.abs(businessTrend)}% vs last month`
              : `${RANGE_LABELS[range]}`
          }
        />
        <StatCard
          label="Revenue"
          value={formatKobo(received)}
          tone="brand"
        />
        <StatCard
          label="Net profit"
          value={formatKobo(profit)}
          tone={profit >= 0 ? 'brand' : 'danger'}
          sub={profit < 0 ? 'Costs exceed revenue' : 'Revenue minus costs'}
        />
        {taxDeductibleTotal > 0 && (
          <StatCard
            label="Tax deductible"
            value={formatKobo(taxDeductibleTotal)}
            tone="neutral"
            sub="Potential tax savings"
          />
        )}
      </div>

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
                  {formatKobo(total)}
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
                  businessTotal > 0
                    ? Math.round((total / businessTotal) * 100)
                    : 0;
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs"
                  >
                    <span className="font-semibold text-ink">{cat}</span>
                    <span className="num text-slate-600">
                      {formatKobo(total)}
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
                : 'No expenses yet'
          }
          description={
            searchQ || categoryFilter
              ? 'Try adjusting your search or filter.'
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
                  -{formatKobo(e.amountKobo)}
                </div>
                <ExpenseRowActions id={e.id} />
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
