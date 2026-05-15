import { Coins, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { orderMarginService } from '@/lib/services/order-margin.service';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Inline margin gauge for a CustomerOrder. Surfaces the four numbers
 * that answer "is this order worth doing?":
 *
 *   • Revenue (what the customer will pay)
 *   • Material cost (estimated from recipes)
 *   • Profit (revenue − cost)
 *   • Margin % (profit / revenue)
 *
 * Tone-coded by margin:
 *   ≥ 30%   → success
 *   10–30%  → owed-amber
 *   < 10%   → rose (warning)
 *   negative → rose (loss)
 *
 * Shows a "based on N of M items" footnote whenever some items have no
 * recipe, so the owner never assumes the cost is exact when it isn't.
 */
export async function OrderMarginCard({
  userId,
  customerOrderId,
}: {
  userId: string;
  customerOrderId: string;
}) {
  const margin = await orderMarginService.forCustomerOrder(userId, customerOrderId);

  // Nothing to show on an empty order.
  if (margin.revenueKobo === 0 && margin.itemsWithRecipe === 0 && margin.itemsWithoutRecipe === 0) {
    return null;
  }

  const isLoss = margin.profitKobo < 0;
  const tone: 'success' | 'owed' | 'rose' =
    isLoss
      ? 'rose'
      : margin.marginPct == null
        ? 'success'
        : margin.marginPct >= 30
          ? 'success'
          : margin.marginPct >= 10
            ? 'owed'
            : 'rose';

  const TONE_TEXT: Record<string, string> = {
    success: 'text-success-700',
    owed: 'text-owed-700',
    rose: 'text-rose-700',
  };
  const TONE_BAR_BG: Record<string, string> = {
    success: 'bg-success-100',
    owed: 'bg-owed-100',
    rose: 'bg-rose-100',
  };
  const TONE_BAR_FG: Record<string, string> = {
    success: 'bg-success-500',
    owed: 'bg-owed-500',
    rose: 'bg-rose-500',
  };

  const TrendIcon = isLoss ? TrendingDown : TrendingUp;
  const heading = isLoss
    ? 'Losing money'
    : margin.marginPct == null
      ? 'Free of cost'
      : margin.marginPct >= 30
        ? 'Healthy margin'
        : margin.marginPct >= 10
          ? 'Thin margin'
          : 'Very thin margin';

  // Bar value capped 0..100 so a 150%-margin order doesn't blow past the
  // gauge and a loss-making order doesn't fly under it.
  const barPct =
    margin.marginPct == null
      ? 100
      : Math.max(0, Math.min(100, margin.marginPct));

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-xs">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="section-title">Margin estimate</h2>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            tone === 'success'
              ? 'bg-success-100 text-success-700'
              : tone === 'owed'
                ? 'bg-owed-100 text-owed-800'
                : 'bg-rose-100 text-rose-700',
          )}
        >
          <TrendIcon size={11} />
          {heading}
        </span>
      </header>

      <div className="flex items-baseline gap-2">
        <span className={cn('num text-[28px] font-black tracking-tight', TONE_TEXT[tone])}>
          {margin.marginPct == null ? '—' : `${margin.marginPct.toFixed(1)}%`}
        </span>
        <span className="text-xs text-slate-500">net margin</span>
      </div>

      {margin.marginPct !== null && !isLoss && (
        <div className={cn('mt-3 h-2 w-full overflow-hidden rounded-full', TONE_BAR_BG[tone])}>
          <div
            className={cn('h-full rounded-full transition-all', TONE_BAR_FG[tone])}
            style={{ width: `${Math.max(2, barPct)}%` }}
          />
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Stat
          Icon={Coins}
          label="Revenue"
          value={formatKobo(margin.revenueKobo)}
          tone="brand"
        />
        <Stat
          Icon={TrendingDown}
          label="Material cost"
          value={formatKobo(margin.materialCostKobo)}
          tone="rose"
        />
        <Stat
          Icon={TrendingUp}
          label="Estimated profit"
          value={formatKobo(margin.profitKobo)}
          tone={isLoss ? 'rose' : 'success'}
          colSpan
        />
      </dl>

      {margin.incomplete && (
        <p className="mt-3 inline-flex items-start gap-1.5 text-[11px] text-slate-500">
          <AlertTriangle size={11} className="mt-0.5 shrink-0 text-owed-600" />
          Based on {margin.itemsWithRecipe} of {margin.itemsWithRecipe + margin.itemsWithoutRecipe} items —{' '}
          {margin.itemsWithoutRecipe} {margin.itemsWithoutRecipe === 1 ? 'has' : 'have'} no recipe so its cost couldn't be estimated.
        </p>
      )}
    </section>
  );
}

function Stat({
  Icon,
  label,
  value,
  tone,
  colSpan,
}: {
  Icon: typeof Coins;
  label: string;
  value: string;
  tone: 'success' | 'rose' | 'brand' | 'slate';
  colSpan?: boolean;
}) {
  const TONE_TEXT: Record<string, string> = {
    success: 'text-success-700',
    rose: 'text-rose-700',
    brand: 'text-brand-700',
    slate: 'text-slate-700',
  };
  const TONE_BG: Record<string, string> = {
    success: 'bg-success-100 text-success-700',
    rose: 'bg-rose-50 text-rose-700',
    brand: 'bg-brand-50 text-brand-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className={cn('flex items-start gap-2', colSpan && 'col-span-2')}>
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', TONE_BG[tone])}>
        <Icon size={12} />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className={cn('num truncate text-sm font-bold', TONE_TEXT[tone])}>{value}</dd>
      </div>
    </div>
  );
}
