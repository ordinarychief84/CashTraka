import Link from 'next/link';
import { Plus, Receipt, Pencil, Trash2 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatCard } from '@/components/StatCard';
import { TimeRange } from '@/components/TimeRange';
import { ExpenseRowActions } from '@/components/ExpenseRowActions';
import { formatNaira, formatDate } from '@/lib/format';
import { parseRange, rangeStart, RANGE_LABELS } from '@/lib/range';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const user = await guard();
  const range = parseRange(searchParams.range);
  const start = rangeStart(range);

  const [expenses, rangeAgg, allTimeAgg, receivedAgg] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId: user.id,
        ...(start ? { incurredOn: { gte: start } } : {}),
      },
      orderBy: { incurredOn: 'desc' },
      take: 200,
    }),
    prisma.expense.aggregate({
      where: {
        userId: user.id,
        ...(start ? { incurredOn: { gte: start } } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { userId: user.id },
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
  ]);

  const totalRange = rangeAgg._sum.amount ?? 0;
  const totalAll = allTimeAgg._sum.amount ?? 0;
  const received = receivedAgg._sum.amount ?? 0;
  const profit = received - totalRange;

  // Group totals by category for a tiny breakdown.
  const byCategory = new Map<string, number>();
  for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType}>
      <PageHeader
        title="Expenses"
        subtitle="Track what you spend — so you know what you actually make."
        action={
          <Link href="/expenses/new" className="btn-primary">
            <Plus size={18} />
            Add
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <TimeRange value={range} basePath="/expenses" />
        <div className="text-xs text-slate-500">All time: {formatNaira(totalAll)}</div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label={`Spent (${RANGE_LABELS[range]})`} value={formatNaira(totalRange)} tone="neutral" />
        <StatCard label={`Received (${RANGE_LABELS[range]})`} value={formatNaira(received)} tone="brand" />
        <StatCard
          label={`Net profit (${RANGE_LABELS[range]})`}
          value={formatNaira(profit)}
          tone={profit >= 0 ? 'brand' : 'danger'}
          sub={profit < 0 ? 'Spending is higher than revenue' : undefined}
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
          title="No expenses yet"
          description="Log what you spend — stock, delivery, packaging — to see real profit, not just revenue."
          actionHref="/expenses/new"
          actionLabel="Add expense"
        />
      ) : (
        <ul className="card divide-y divide-border">
          {expenses.map((e) => (
            <li key={e.id} className="flex items-center gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink">
                  {e.category}
                  {e.note && <span className="ml-2 font-normal text-slate-600">· {e.note}</span>}
                </div>
                <div className="text-xs text-slate-500">{formatDate(e.incurredOn)}</div>
              </div>
              <div className="num text-owed-600">-{formatNaira(e.amount)}</div>
              <ExpenseRowActions id={e.id} />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
