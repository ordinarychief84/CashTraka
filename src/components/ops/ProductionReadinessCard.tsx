import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Factory } from 'lucide-react';
import { orderReadinessService } from '@/lib/services/order-readiness.service';
import { cn } from '@/lib/utils';

/**
 * Inline readiness gauge for an order. Renders a single coverage % +
 * the list of materials that limit the run + a deep-link into the
 * materials page so the owner can fix the bottleneck in one tap.
 *
 * Picks tone from the readiness value:
 *   100%  → green / "Ready to produce"
 *   1-99% → amber / "Materials short"
 *   0%    → rose  / "Cannot produce yet"
 */
export async function ProductionReadinessCard({
  userId,
  customerOrderId,
}: {
  userId: string;
  customerOrderId: string;
}) {
  const readiness = await orderReadinessService.forCustomerOrder(userId, customerOrderId);

  const tone =
    readiness.readinessPct >= 100
      ? 'success'
      : readiness.readinessPct > 0
        ? 'owed'
        : 'rose';

  const TONE_TEXT: Record<string, string> = {
    success: 'text-success-700',
    owed: 'text-owed-700',
    rose: 'text-rose-700',
  };
  const TONE_BG: Record<string, string> = {
    success: 'bg-success-500',
    owed: 'bg-owed-500',
    rose: 'bg-rose-500',
  };
  const TONE_BAR_BG: Record<string, string> = {
    success: 'bg-success-100',
    owed: 'bg-owed-100',
    rose: 'bg-rose-100',
  };

  const Icon = readiness.producible ? CheckCircle2 : AlertTriangle;
  const heading = readiness.producible
    ? 'Ready to produce'
    : readiness.readinessPct === 0
      ? 'Cannot produce yet'
      : 'Materials short';

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-xs">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="section-title">Production readiness</h2>
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
          <Icon size={11} />
          {heading}
        </span>
      </header>

      <div className="flex items-baseline gap-2">
        <span className={cn('num text-[28px] font-black tracking-tight', TONE_TEXT[tone])}>
          {readiness.readinessPct}%
        </span>
        <span className="text-xs text-slate-500">
          {readiness.producible ? 'of materials available' : 'coverage on weakest material'}
        </span>
      </div>

      {/* Coverage bar */}
      <div className={cn('mt-3 h-2 w-full overflow-hidden rounded-full', TONE_BAR_BG[tone])}>
        <div
          className={cn('h-full rounded-full transition-all', TONE_BG[tone])}
          style={{ width: `${Math.max(2, Math.min(100, readiness.readinessPct))}%` }}
        />
      </div>

      {readiness.shortMaterials.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Short by
          </div>
          <ul className="space-y-1.5">
            {readiness.shortMaterials.slice(0, 4).map((m) => (
              <li key={m.materialId}>
                <Link
                  href={`/materials/${m.materialId}`}
                  className="flex items-center justify-between gap-2 text-xs hover:opacity-90"
                >
                  <span className="truncate font-semibold text-ink">{m.materialName}</span>
                  <span className="num shrink-0 text-rose-700">
                    {m.shortBy} {m.unit}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/purchase-orders/new"
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-brand-700 hover:bg-brand-50"
          >
            <Factory size={12} />
            Order materials
          </Link>
        </div>
      )}

      {readiness.itemsWithoutRecipe.length > 0 && (
        <p className="mt-3 text-[11px] text-slate-500">
          {readiness.itemsWithoutRecipe.length} item(s) have no recipe — readiness could not be
          checked for them.
        </p>
      )}
    </section>
  );
}
