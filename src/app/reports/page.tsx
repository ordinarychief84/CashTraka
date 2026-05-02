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
import { formatNaira } from '@/lib/format';
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
      select: { amount: true, createdAt: true },
    }),
    prisma.expense.findMany({
      // Reports show the BUSINESS P&L only — personal spending is private
      // budgeting data and shouldn't roll into profit trends.
      where: { userId: user.id, kind: 'business', incurredOn: { gte: earliest } },
      select: { amount: true, category: true, incurredOn: true },
    }),
  ]);

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
    paidPayments.map((p) => ({ amount: p.amount, date: p.createdAt })),
  );
  const expenseByMonth = bucket(
    expenses.map((e) => ({ amount: e.amount, date: e.incurredOn })),
  );
  const profitByMonth = revenueByMonth.map((r, i) => r - expenseByMonth[i]);

  const totalRevenue = revenueByMonth.reduce((s, v) => s + v, 0);
  const totalExpenses = expenseByMonth.reduce((s, v) => s + v, 0);
  const totalProfit = totalRevenue - totalExpenses;

  const expenseByCategory = new Map<string, number>();
  for (const e of expenses) {
    expenseByCategory.set(e.category, (expenseByCategory.get(e.category) ?? 0) + e.amount);
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

  if (!isPm) {
    const [topCustomers, topProducts] = await Promise.all([
      prisma.customer.findMany({
        where: { userId: user.id, totalPaid: { gt: 0 } },
        orderBy: { totalPaid: 'desc' },
        take: 5,
        select: { name: true, totalPaid: true },
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
      values: topCustomers.map((c) => c.totalPaid),
    };
    topProductsChart = {
      labels: topProducts.map((p) => p.description),
      values: topProducts.map((p) => p._sum.quantity ?? 0),
    };
  } else {
    // Property-manager specific analytics.
    const [topTenants, properties, tenants] = await Promise.all([
      // Tenants ranked by total rent paid (via RentPayment PAID records).
      prisma.tenant.findMany({
        where: { userId: user.id },
        take: 100,
        include: {
          rentPayments: {
            where: { status: 'PAID' },
            select: { amount: true },
          },
        },
      }),
      // Collection by property this month.
      prisma.property.findMany({
        where: { userId: user.id },
        include: {
          tenants: {
            where: { status: 'active' },
            include: {
              rentPayments: {
                where: { period: new Date().toISOString().slice(0, 7), status: 'PAID' },
                select: { amount: true },
              },
            },
          },
        },
      }),
      prisma.tenant.findMany({
        where: { userId: user.id },
        include: {
          rentPayments: {
            where: { period: new Date().toISOString().slice(0, 7), status: 'PAID' },
            select: { amount: true },
          },
        },
      }),
    ]);

    // Top tenants — rank by lifetime PAID rent.
    const tenantRanked = topTenants
      .map((t) => ({
        name: `${t.name}${t.unitLabel ? ` · ${t.unitLabel}` : ''}`,
        total: t.rentPayments.reduce((s, p) => s + p.amount, 0),
      }))
      .filter((t) => t.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    topTenantsChart = {
      labels: tenantRanked.map((t) => t.name),
      values: tenantRanked.map((t) => t.total),
    };

    // Collection by property this month.
    const propCollection = properties
      .map((p) => {
        const collected = p.tenants.reduce(
          (s, t) => s + t.rentPayments.reduce((ss, rp) => ss + rp.amount, 0),
          0,
        );
        return { name: p.name, collected };
      })
      .sort((a, b) => b.collected - a.collected)
      .slice(0, 5);
    propertyCollectionChart = {
      labels: propCollection.map((p) => p.name),
      values: propCollection.map((p) => p.collected),
    };

    // Occupancy summary — unit count vs active tenant count (approx).
    const totalUnits = properties.reduce((s, p) => s + (p.unitCount || 0), 0);
    const occupiedUnits = properties.reduce((s, p) => s + p.tenants.length, 0);
    occupancyStat = { occupied: occupiedUnits, total: totalUnits };

    // Expected vs collected this month.
    const expected = tenants
      .filter((t) => t.status === 'active')
      .reduce((s, t) => s + t.rentAmount, 0);
    const collected = tenants.reduce(
      (s, t) => s + t.rentPayments.reduce((ss, rp) => ss + rp.amount, 0),
      0,
    );
    const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
    rentThisMonthStat = { expected, collected, rate };
  }

  const revenueLabel = isPm ? 'Rent collected (6mo)' : 'Revenue (6mo)';
  const revenueChartTitle = isPm ? 'Rent collected by month' : 'Revenue by month';

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Reports"
        subtitle={
          isPm
            ? 'Your rental portfolio in numbers. Last 6 months.'
            : 'Your business in numbers. Last 6 months.'
        }
      />
      <ReportsTabNav active="overview" />

      {/* ── Top stats: ICP-specific ── */}
      {isPm && rentThisMonthStat ? (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Expected this month"
            value={formatNaira(rentThisMonthStat.expected)}
            sub="From active tenants"
          />
          <StatCard
            label="Collected this month"
            value={formatNaira(rentThisMonthStat.collected)}
            tone="brand"
          />
          <StatCard
            label="Collection rate"
            value={`${rentThisMonthStat.rate}%`}
            tone={rentThisMonthStat.rate >= 80 ? 'brand' : 'danger'}
          />
          <StatCard
            label="Occupancy"
            value={
              occupancyStat && occupancyStat.total > 0
                ? `${occupancyStat.occupied}/${occupancyStat.total}`
                : String(occupancyStat?.occupied ?? 0)
            }
            sub={
              occupancyStat && occupancyStat.total > 0
                ? `${Math.round((occupancyStat.occupied / occupancyStat.total) * 100)}% full`
                : 'Units occupied'
            }
          />
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard label={revenueLabel} value={formatNaira(totalRevenue)} tone="brand" />
          <StatCard label="Expenses (6mo)" value={formatNaira(totalExpenses)} />
          <StatCard
            label="Net profit (6mo)"
            value={formatNaira(totalProfit)}
            tone={totalProfit >= 0 ? 'brand' : 'danger'}
          />
        </div>
      )}

      {/* ── Revenue / Rent trend ── */}
      <section className="card mb-5 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <TrendingUp size={16} className="text-brand-600" />
          {revenueChartTitle}
        </h2>
        <ColumnChart
          labels={monthLabels}
          values={revenueByMonth}
          formatValue={formatNaira}
          height={180}
        />
        <div className="mt-4 grid grid-cols-6 gap-2 border-t border-border pt-3">
          {monthLabels.map((m, i) => (
            <div key={m} className="text-center">
              <div className="text-[10px] font-semibold text-slate-500">{m}</div>
              <div className="num text-xs text-brand-700">
                {revenueByMonth[i] > 0 ? formatNaira(revenueByMonth[i]) : '—'}
              </div>
              <div
                className={
                  profitByMonth[i] >= 0
                    ? 'text-[10px] text-success-700'
                    : 'text-[10px] text-owed-600'
                }
              >
                {profitByMonth[i] >= 0 ? '+' : ''}
                {formatNaira(profitByMonth[i])}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Seller view: Top customers + Products ── */}
        {!isPm && (
          <>
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
                  formatValue={formatNaira}
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
          </>
        )}

        {/* ── PM view: Top tenants + Collection by property ── */}
        {isPm && (
          <>
            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <Users2 size={16} className="text-brand-600" />
                Top tenants by total rent paid
              </h2>
              {!topTenantsChart || topTenantsChart.labels.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No rent payments yet. Record one to see rankings here.
                </p>
              ) : (
                <BarChart
                  labels={topTenantsChart.labels}
                  values={topTenantsChart.values}
                  formatValue={formatNaira}
                />
              )}
            </section>

            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <Building2 size={16} className="text-brand-600" />
                Collection by property this month
              </h2>
              {!propertyCollectionChart || propertyCollectionChart.labels.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Add properties and tenants to see per-property collection.
                </p>
              ) : (
                <BarChart
                  labels={propertyCollectionChart.labels}
                  values={propertyCollectionChart.values}
                  formatValue={formatNaira}
                  barClassName="bg-success-500"
                />
              )}
            </section>
          </>
        )}

        {/* ── Expenses (both) ── */}
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
              formatValue={formatNaira}
              barClassName="bg-owed-500"
            />
          )}
        </section>
      </div>

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
          <ExportLink href="/api/export/payments" label={isPm ? 'Rent payments CSV' : 'Payments CSV'} />
          <ExportLink href="/api/export/debts" label={isPm ? 'Unpaid rent CSV' : 'Debts CSV'} />
          <ExportLink href="/api/export/expenses" label="Expenses CSV" />
          {isPm ? (
            <>
              <ExportLink href="/api/export/tenants" label="Tenants CSV" />
              <ExportLink href="/api/export/properties" label="Properties CSV" />
            </>
          ) : (
            <ExportLink href="/api/export/customers" label="Customers CSV" />
          )}
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
