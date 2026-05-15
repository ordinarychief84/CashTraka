import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

/**
 * Plan-summary card pinned to the bottom of the sidebar. Shows the
 * current plan with an Active pill, team-member usage, storage usage
 * bar, and an Upgrade Plan CTA. Static numbers for now — wire to
 * billing + member counts when the data plumbing is ready.
 */
export function SidebarBusinessPlan({
  planLabel = 'Business Plan',
  isActive = true,
  teamUsed = 8,
  teamMax = 20,
  storagePct = 65,
}: {
  planLabel?: string;
  isActive?: boolean;
  teamUsed?: number;
  teamMax?: number;
  storagePct?: number;
}) {
  return (
    <div className="m-3 rounded-2xl border border-border bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold text-ink">{planLabel}</span>
        {isActive && (
          <span className="inline-flex rounded-full bg-success-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-800">
            Active
          </span>
        )}
      </div>

      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="text-slate-500">Team members</span>
        <span className="num font-semibold text-ink">
          {teamUsed} / {teamMax}
        </span>
      </div>

      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-slate-500">Storage</span>
        <span className="num font-semibold text-ink">{storagePct}% Used</span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${storagePct}%` }}
        />
      </div>

      <Link
        href="/pricing"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-ink hover:bg-slate-50"
      >
        <ArrowUpRight size={12} />
        Upgrade Plan
      </Link>
    </div>
  );
}
