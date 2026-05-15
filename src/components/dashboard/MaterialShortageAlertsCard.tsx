import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { shortageService } from '@/lib/services/shortage.service';
import { cn } from '@/lib/utils';

const SEVERITY_TONE: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-owed-100 text-owed-800',
  HIGH: 'bg-owed-200 text-owed-900',
  CRITICAL: 'bg-rose-100 text-rose-700',
};

const ICON_TONE: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-owed-50 text-owed-700',
  HIGH: 'bg-owed-100 text-owed-800',
  CRITICAL: 'bg-rose-50 text-rose-700',
};

/**
 * Open material shortage alerts, sorted by severity. Empty state
 * shows a healthy-stock message. Five rows max — link to /shortages
 * for the full list.
 */
export async function MaterialShortageAlertsCard({
  userId,
}: {
  userId: string;
}) {
  const alerts = await shortageService.listOpenForUser(userId, { limit: 5 });

  return (
    <DashboardCard title="Material Shortage Alerts" viewAllHref="/shortages">
      {alerts.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-success-100 bg-success-50/30 p-4 text-xs text-success-800">
          All materials are stocked for active production.
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    ICON_TONE[a.severity] ?? 'bg-slate-100 text-slate-600',
                  )}
                >
                  <AlertTriangle size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {a.material.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Short by {a.shortageQuantity} {a.material.unit}
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  SEVERITY_TONE[a.severity] ?? 'bg-slate-100 text-slate-700',
                )}
              >
                {a.severity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
