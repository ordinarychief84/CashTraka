import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKobo } from '@/lib/format';
import { getCashflowForecast } from '@/lib/services/cashflow.service';

/**
 * Cash flow forecast card. Server component that pulls straight from the
 * service so we avoid a client round-trip on the dashboard. The matching
 * /api/dashboard/cashflow endpoint exists for any non-server consumers.
 */
export async function CashFlowForecastCard({ userId }: { userId: string }) {
  const forecast = await getCashflowForecast(userId).catch(() => null);

  if (!forecast) {
    return null;
  }

  const {
    expectedInflow,
    recurringInflow,
    expectedOutflow,
    recentRevenueTrend30d,
    projectedNet,
  } = forecast;

  // Empty-state: no inflow signal AND no outflow signal means there is
  // nothing meaningful to show yet. Avoids dropping a "₦0" hero number on
  // brand-new accounts.
  const isEmpty =
    expectedInflow === 0 && recurringInflow === 0 && expectedOutflow === 0;

  if (isEmpty) {
    return (
      <div className="card relative overflow-hidden p-4">
        <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-brand-500" />
        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Wallet size={13} />
          </span>
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Cash flow, next 30 days
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Record some invoices and expenses to see your forecast.
        </p>
      </div>
    );
  }

  const netPositive = projectedNet >= 0;

  let trendNode: React.ReactNode = null;
  if (recentRevenueTrend30d !== null) {
    const trendUp = recentRevenueTrend30d >= 0;
    const TrendIcon = trendUp ? TrendingUp : TrendingDown;
    trendNode = (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
          trendUp ? 'bg-success-100 text-success-700' : 'bg-red-50 text-red-700',
        )}
      >
        <TrendIcon size={10} />
        {trendUp ? '+' : ''}
        {recentRevenueTrend30d}% vs last 30 days
      </span>
    );
  }

  return (
    <div className="card relative flex h-full flex-col overflow-hidden p-4">
      <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-brand-500" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Wallet size={13} />
          </span>
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Cash flow, next 30 days
          </div>
        </div>
        {trendNode}
      </div>

      <div
        className={cn(
          'num mt-3 text-2xl font-black leading-none tracking-tight',
          netPositive ? 'text-success-700' : 'text-amber-600',
        )}
      >
        {netPositive ? '' : '-'}
        {formatKobo(Math.abs(projectedNet))}
      </div>
      <div className="mt-1 text-[11px] text-slate-500">Projected net</div>

      <dl className="mt-3 space-y-1.5 border-t border-border pt-2 text-[12px]">
        <div className="flex items-center justify-between">
          <dt className="text-slate-600">Expected in</dt>
          <dd className="num font-semibold text-ink">{formatKobo(expectedInflow)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-600">Recurring in</dt>
          <dd className="num font-semibold text-ink">{formatKobo(recurringInflow)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-600">Expected out</dt>
          <dd className="num font-semibold text-ink">{formatKobo(expectedOutflow)}</dd>
        </div>
      </dl>
    </div>
  );
}
