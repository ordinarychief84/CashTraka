import { TrendingUp } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { analyticsService } from '@/lib/services/analytics.service';
import { ColumnChart } from '@/components/BarChart';
import { formatNaira } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const admin = await requireAdmin();
  const data = await analyticsService.monthlyTrends(6);

  // Labels are YYYY-MM — turn into short month names.
  const monthLabels = data.labels.map((l) => {
    const [y, m] = l.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('en-NG', { month: 'short' });
  });

  return (
    <AdminShell adminName={admin.name} activePath="/admin/analytics">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Last 6 months of growth.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
            <TrendingUp size={16} className="text-brand-600" />
            Signups per month
          </h2>
          <ColumnChart labels={monthLabels} values={data.signups} height={200} />
          <div className="mt-3 grid grid-cols-6 gap-1 text-center">
            {monthLabels.map((m, i) => (
              <div key={m} className="text-[10px] font-semibold text-slate-500">
                {m}
                <div className="num text-xs text-brand-700">{data.signups[i]}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
            <TrendingUp size={16} className="text-success-600" />
            Revenue per month (all users)
          </h2>
          <ColumnChart
            labels={monthLabels}
            values={data.revenue}
            formatValue={formatNaira}
            height={200}
          />
          <div className="mt-3 grid grid-cols-6 gap-1 text-center">
            {monthLabels.map((m, i) => (
              <div key={m} className="text-[10px] font-semibold text-slate-500">
                {m}
                <div className="num text-xs text-brand-700">
                  {data.revenue[i] > 0 ? formatNaira(data.revenue[i]) : '—'}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
