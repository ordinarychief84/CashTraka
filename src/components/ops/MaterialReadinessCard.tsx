import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { inventoryService } from '@/lib/services/inventory.service';
import { shortageService } from '@/lib/services/shortage.service';
import { cn } from '@/lib/utils';

const SEVERITY_PILL: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-owed-100 text-owed-800',
  HIGH: 'bg-owed-200 text-owed-900',
  CRITICAL: 'bg-rose-100 text-rose-700',
};

/**
 * Material Readiness · donut breaking down every active production
 * run into Ready / Shortage / Partial / Not Checked buckets, plus a
 * "Critical Shortages" list below the donut for fast action.
 */
export async function MaterialReadinessCard({ userId }: { userId: string }) {
  const [runs, alerts] = await Promise.all([
    prisma.productionOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'READY_TO_PRODUCE', 'IN_PRODUCTION'] },
      },
      select: { id: true, status: true },
    }),
    shortageService.listOpenForUser(userId, { limit: 200 }),
  ]);

  const total = runs.length;
  const shortageOrderIds = new Set(alerts.map((a) => a.productionOrderId));

  let shortage = 0;
  let partial = 0;
  let ready = 0;
  let notChecked = 0;

  for (const r of runs) {
    if (r.status === 'MATERIALS_NEEDED') {
      shortage += 1;
    } else if (r.status === 'READY_TO_PRODUCE') {
      ready += 1;
    } else if (r.status === 'IN_PRODUCTION') {
      // In production = materials were consumed; counts as ready.
      ready += 1;
    } else if (shortageOrderIds.has(r.id)) {
      partial += 1;
    } else if (r.status === 'PLANNED') {
      notChecked += 1;
    }
  }

  const rows = [
    { label: 'Ready', count: ready, color: 'bg-success-500', hex: '#8BD91E' },
    { label: 'Shortage', count: shortage, color: 'bg-rose-500', hex: '#EF4444' },
    { label: 'Partial', count: partial, color: 'bg-owed-500', hex: '#F59E0B' },
    { label: 'Not Checked', count: notChecked, color: 'bg-slate-400', hex: '#94A3B8' },
  ];

  const sum = rows.reduce((s, r) => s + r.count, 0);
  const conicStops = (() => {
    if (sum === 0) return 'conic-gradient(#E5E7EB 0% 100%)';
    let acc = 0;
    const parts: string[] = [];
    for (const r of rows) {
      const pct = (r.count / sum) * 100;
      parts.push(`${r.hex} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
      acc += pct;
    }
    return `conic-gradient(${parts.join(', ')})`;
  })();

  // Critical shortages — top 3 by severity (CRITICAL > HIGH > MEDIUM > LOW).
  const sevRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const critical = [...alerts]
    .sort((a, b) => (sevRank[b.severity] ?? 0) - (sevRank[a.severity] ?? 0))
    .slice(0, 4);

  return (
    <DashboardCard title="Material Readiness">
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: conicStops }}
          />
          <div className="absolute inset-[22%] rounded-full bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="num text-lg font-black leading-none text-ink">{total}</div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Orders
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5">
          {rows.map((r) => {
            const pct = sum > 0 ? Math.round((r.count / sum) * 100) : 0;
            return (
              <li
                key={r.label}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="flex items-center gap-2 text-slate-600">
                  <span className={`h-2 w-2 rounded-full ${r.color}`} />
                  {r.label}
                </span>
                <span className="num text-slate-700">
                  <span className="font-bold text-ink">{r.count}</span>
                  <span className="ml-1 text-slate-400">({pct}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Critical Shortages
          </span>
          {alerts.length > 0 && (
            <Link
              href="/shortages"
              className="text-[10px] font-semibold text-brand-700 hover:underline"
            >
              View all
            </Link>
          )}
        </div>
        {critical.length === 0 ? (
          <p className="text-xs text-success-700">
            No critical shortages right now.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {critical.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                    <AlertTriangle size={12} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-ink">
                      {a.material.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Short by {a.shortageQuantity} {a.material.unit}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                    SEVERITY_PILL[a.severity] ?? 'bg-slate-100 text-slate-700',
                  )}
                >
                  {a.severity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardCard>
  );
}
