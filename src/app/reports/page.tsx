import {
  Download,
  TrendingUp,
  Users,
  Package,
  Receipt,
  Home,
  Users2,
  Building2,
} from 'lucide-react';
import { guardWithFeature } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { BarChart, ColumnChart } from '@/components/BarChart';
import { StatCard } from '@/components/StatCard';
import { formatKobo } from '@/lib/format';
import { isPropertyManager } from '@/lib/business-type';
import { ReportsTabNav } from '@/components/ReportsTabNav';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const user = await guardWithFeature('reports');
  const isPm = isPropertyManager(user.businessType);

  // Last 6 months (including this month).
  const now = new Date();
  const monthStarts: Date[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthStarts.push(d);
  }
  const earliest = monthStarts[0];
  const monthLabels = monthStarts.map((d) =>
    d.toLocaleDateString('en-NG', { month: 'short' }),
  );

  // Always-fetched: paid payments + expenses (drive revenue/profit charts for both ICPs).
  const [paidPayments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: {
        userId: user.id,
        status: 'PAID',
        createdAt: { gte: earliest },
      },
      select: { amountKobo: true, createdAt: true },
    }),
    prisma.expense.findMany({
      // Reports show the BUSINESS P&L only — personal spending is private
      // budgeting data and shouldn't roll into profit trends.
      where: { userId: user.id, kind: 'business', incurredOn: { gte: earliest } },
      select: { amountKobo: true, category: true, incurredOn: true },
    }),
  ]);

  // All bucketed values are kobo. Display layer formats via formatKobo.
  function bucket(items: { amount: number; date: Date }[]) {
    const out = new Array(monthStarts.length).fill(0) as number[];
    for (const it of items) {
      for (let i = monthStarts.length - 1; i >= 0; i--) {
        if (it.date >= monthStarts[i]) {
          out[i] += it.amount;
          break;
        }
      }
    }
    return out;
  }
  const revenueByMonth = bucket(
    paidPayments.map((p) => ({ amount: p.amountKobo, date: p.createdAt })),
  );
  const expenseByMonth = bucket(
    expenses.map((e) => ({ amount: e.amountKobo, date: e.incurredOn })),
  );
  const profitByMonth = revenueByMonth.map((r, i) => r - expenseByMonth[i]);

  const totalRevenue = revenueByMonth.reduce((s, v) => s + v, 0);
  const totalExpenses = expenseByMonth.reduce((s, v) => s + v, 0);
  const totalProfit = totalRevenue - totalExpenses;

  const expenseByCategory = new Map<string, number>();
  for (const e of expenses) {
    expenseByCategory.set(e.category, (expenseByCategory.get(e.category) ?? 0) + e.amountKobo);
  }
  const catEntries = [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1]);

  /* ───── ICP-specific data fetch ───── */
  // Seller gets "top customers" + "best-selling products".
  // PM gets "top tenants" (by totalPaid) + "collection by property" (this month).
  let topCustomersChart: { labels: string[]; values: number[] } | null = null;
  let topProductsChart: { labels: string[]; values: number[] } | null = null;
  let topTenantsChart: { labels: string[]; values: number[] } | null = null;
  let propertyCollectionChart: { labels: string[]; values: number[] } | null = null;
  let occupancyStat: { occupied: number; total: number } | null = null;
  let rentThisMonthStat: { expected: number; collected: number; rate: number } | null = null;

  // Landlord vertical removed — the !isPm branch is now the only path.
  // The PM-specific tenant/property charts and stats were dropped along
  // with the underlying tables.
  {
    const [topCustomers, topProducts] = await Promise.all([
      prisma.customer.findMany({
        where: { userId: user.id, totalPaidKobo: { gt: 0 } },
        orderBy: { totalPaidKobo: 'desc' },
        take: 5,
        select: { name: true, totalPaidKobo: true },
      }),
      prisma.paymentItem.groupBy({
        by: ['productId', 'description'],
        where: { payment: { userId: user.id } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);
    topCustomersChart = {
      labels: topCustomers.map((c) => c.name),
      values: topCustomers.map((c) => c.totalPaidKobo),
    };
    topProductsChart = {
      labels: topProducts.map((p) => p.description),
      values: topProducts.map((p) => p._sum.quantity ?? 0),
    };
  }

  const revenueLabel = 'Revenue (6mo)';
  const revenueChartTitle = 'Revenue by month';

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Reports"
        subtitle="Your business in numbers. Last 6 months."
      />
      <ReportsTabNav active="overview" />

      {/* ── Top stats ── */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label={revenueLabel} value={formatKobo(totalRevenue)} tone="brand" />
        <StatCard label="Expenses (6mo)" value={formatKobo(totalExpenses)} />
        <StatCard
          label="Net profit (6mo)"
          value={formatKobo(totalProfit)}
          tone={totalProfit >= 0 ? 'brand' : 'danger'}
        />
      </div>

      {/* ── Revenue / Rent trend ── */}
      <section className="card mb-5 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <TrendingUp size={16} className="text-brand-600" />
          {revenueChartTitle}
        </h2>
        <ColumnChart
          labels={monthLabels}
          values={revenueByMonth}
          formatValue={formatKobo}
          height={180}
        />
        <div className="mt-4 grid grid-cols-6 gap-2 border-t border-border pt-3">
          {monthLabels.map((m, i) => (
            <div key={m} className="text-center">
              <div className="text-[10px] font-semibold text-slate-500">{m}</div>
              <div className="num text-xs text-brand-700">
                {revenueByMonth[i] > 0 ? formatKobo(revenueByMonth[i]) : '—'}
              </div>
              <div
                className={
                  profitByMonth[i] >= 0
                    ? 'text-[10px] text-success-700'
                    : 'text-[10px] text-owed-600'
                }
              >
                {profitByMonth[i] >= 0 ? '+' : ''}
                {formatKobo(profitByMonth[i])}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Users size={16} className="text-brand-600" />
            Top customers by revenue
          </h2>
          {!topCustomersChart || topCustomersChart.labels.length === 0 ? (
            <p className="text-sm text-slate-500">No paid customers yet.</p>
          ) : (
            <BarChart
              labels={topCustomersChart.labels}
              values={topCustomersChart.values}
              formatValue={formatKobo}
            />
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Package size={16} className="text-brand-600" />
            Best-selling products
          </h2>
          {!topProductsChart || topProductsChart.labels.length === 0 ? (
            <p className="text-sm text-slate-500">
              No product line-items yet. Attach products to a payment to see what's selling.
            </p>
          ) : (
            <BarChart
              labels={topProductsChart.labels}
              values={topProductsChart.values}
              formatValue={(v) => `${v} sold`}
              barClassName="bg-success-500"
            />
          )}
        </section>

        {/* ── Expenses ── */}
        <section className="card p-5 md:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Receipt size={16} className="text-owed-600" />
            Expenses by category
          </h2>
          {catEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No expenses logged yet.</p>
          ) : (
            <BarChart
              labels={catEntries.map((e) => e[0])}
              values={catEntries.map((e) => e[1])}
              formatValue={formatKobo}
              barClassName="bg-owed-500"
            />
          )}
        </section>
      </div>

      {/* ── Operational reports ── */}
      <section className="card mt-5 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
          Operational reports
        </h2>
        <p className="mb-4 text-xs text-slate-600">
          Reports about your production loop. More to come.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/reports/margins"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
          >
            Margin per batch
          </a>
        </div>
      </section>

      {/* ── Exports (ICP-filtered) ── */}
      <section className="card mt-5 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
          <Download size={16} className="text-brand-600" />
          Export your data
        </h2>
        <p className="mb-4 text-xs text-slate-600">
          Download a CSV, open in Excel, Google Sheets, or hand to your bookkeeper.
        </p>
        <div className="flex flex-wrap gap-2">
          <ExportLink href="/api/export/payments" label="Payments CSV" />
          <ExportLink href="/api/export/debts" label="Debts CSV" />
          <ExportLink href="/api/export/expenses" label="Expenses CSV" />
          <ExportLink href="/api/export/customers" label="Customers CSV" />
        </div>
      </section>
    </AppShell>
  );
}

function ExportLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
    >
      <Download size={14} />
      {label}
    </a>
  );
}
