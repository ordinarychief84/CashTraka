import Link from 'next/link';
import { Clock, AlertTriangle, CheckCircle2, Truck } from 'lucide-react';
import { leadTimeService, type LeadTimeAlert, type LeadTimeUrgency } from '@/lib/services/lead-time.service';
import { cn } from '@/lib/utils';

/**
 * "Order palm oil by Friday or production blocks Tuesday."
 *
 * Reads the per-material lead-time-aware view, then renders the top N
 * most urgent alerts with the actionable summary right at the front:
 *
 *   • urgency pill (Order today / This week / Soon / On schedule)
 *   • material + short qty
 *   • "Order by FRI 17 May to land before MON 20 May"
 *   • CTA into /materials/[id] or /purchase-orders/new
 *
 * Renders nothing when there are zero open shortages — caller can
 * decide whether to render an "All clear" sibling.
 */
export async function LeadTimeAlertsCard({
  userId,
  limit = 6,
  showAllLink = true,
  materialId,
}: {
  userId: string;
  limit?: number;
  showAllLink?: boolean;
  /** When set, only shows alerts for this material — used on /materials/[id]. */
  materialId?: string;
}) {
  const rows = await leadTimeService.forUser(userId, { limit, materialId });
  if (rows.length === 0) {
    return (
      <section className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-xs">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="section-title">Lead-time alerts</h2>
        </header>
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success-100 text-success-700">
            <CheckCircle2 size={14} />
          </span>
          <p className="text-xs text-slate-500">
            No open shortage alerts. Every active production run has its materials.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-xs">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="section-title">Lead-time alerts</h2>
        {showAllLink && (
          <Link
            href="/shortages"
            className="text-xs font-semibold text-brand-700 hover:underline"
          >
            View all
          </Link>
        )}
      </header>

      <ul className="space-y-3">
        {rows.slice(0, limit).map((r) => (
          <li key={r.alertId}>
            <LeadTimeRow row={r} />
          </li>
        ))}
      </ul>
    </section>
  );
}

const URGENCY_PILL: Record<LeadTimeUrgency, string> = {
  critical: 'bg-rose-100 text-rose-700',
  urgent: 'bg-rose-50 text-rose-700',
  soon: 'bg-owed-100 text-owed-800',
  upcoming: 'bg-brand-50 text-brand-700',
  calm: 'bg-success-100 text-success-700',
};

const URGENCY_ICON_BG: Record<LeadTimeUrgency, string> = {
  critical: 'bg-rose-50 text-rose-700',
  urgent: 'bg-rose-50 text-rose-700',
  soon: 'bg-owed-50 text-owed-700',
  upcoming: 'bg-brand-50 text-brand-700',
  calm: 'bg-success-100 text-success-700',
};

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function LeadTimeRow({ row }: { row: LeadTimeAlert }) {
  const pillLabel = leadTimeService.urgencyLabel(row.urgency);

  // "Order by Fri 17 May to land before Mon 20 May"
  const sentence =
    row.orderByDate && row.neededByDate
      ? `Order by ${fmtDate(row.orderByDate)} to land before ${fmtDate(row.neededByDate)}`
      : row.neededByDate
        ? `Needed by ${fmtDate(row.neededByDate)} — no lead time on file`
        : 'No planned start date on the production order';

  return (
    <article className="flex items-start gap-3">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          URGENCY_ICON_BG[row.urgency],
        )}
      >
        {row.urgency === 'critical' || row.urgency === 'urgent' ? (
          <AlertTriangle size={14} />
        ) : (
          <Clock size={14} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/materials/${row.materialId}`}
            className="truncate text-sm font-bold text-ink hover:underline"
          >
            {row.materialName}
          </Link>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              URGENCY_PILL[row.urgency],
            )}
          >
            {pillLabel}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
          Short {row.shortageQuantity} {row.unit} for{' '}
          <Link
            href={`/production/${row.productionOrderId}`}
            className="font-semibold text-slate-700 hover:underline"
          >
            {row.productionNumber}
          </Link>
          . {sentence}.
          {row.supplierName && (
            <>
              {' '}Preferred supplier: <span className="font-medium text-slate-700">{row.supplierName}</span>.
            </>
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Link
            href="/purchase-orders/new"
            className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700 hover:bg-brand-100"
          >
            <Truck size={10} />
            Draft PO
          </Link>
          <Link
            href={`/materials/${row.materialId}`}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
          >
            Material
          </Link>
        </div>
      </div>
    </article>
  );
}
