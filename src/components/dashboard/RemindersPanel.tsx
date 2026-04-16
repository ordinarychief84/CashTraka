import Link from 'next/link';
import { Plus, Bell, MessageCircle } from 'lucide-react';
import { formatDate, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

type ReminderRow = {
  id: string;
  debtId: string;
  customerName: string;
  remainingAmount: number;
  nextDueAt: Date;
  lastSentAt: Date | null;
  status: 'due' | 'overdue' | 'upcoming' | 'cleared';
};

type Props = {
  reminders: ReminderRow[];
  isPm: boolean;
};

const STATUS_STYLE: Record<string, string> = {
  due: 'bg-brand-50 text-brand-700',
  overdue: 'bg-owed-50 text-owed-700',
  upcoming: 'bg-slate-100 text-slate-600',
  cleared: 'bg-success-50 text-success-700',
};

const STATUS_LABEL: Record<string, string> = {
  due: 'Due today',
  overdue: 'Overdue',
  upcoming: 'Upcoming',
  cleared: 'Cleared',
};

/**
 * Mirrors the "Assignments" panel in the reference design — compact list of
 * reminders with status pills. Links through to the full /reminders page.
 */
export function RemindersPanel({ reminders, isPm }: Props) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-base font-bold text-ink">
          <Bell size={16} className="text-brand-600" />
          {isPm ? 'Rent reminders' : 'Reminders'}
        </h3>
        <Link
          href="/debts"
          aria-label="Create reminder"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-400 text-ink hover:bg-lime-300"
        >
          <Plus size={14} strokeWidth={3} />
        </Link>
      </div>

      {reminders.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
          No reminders scheduled.
          <Link href="/debts" className="mt-1 block font-semibold text-brand-600 hover:underline">
            Set one from a debt →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {reminders.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-brand-300"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <MessageCircle size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{r.customerName}</div>
                <div className="truncate text-[11px] text-slate-500">
                  {r.lastSentAt ? `Last sent ${timeAgo(r.lastSentAt)}` : `Next ${formatDate(r.nextDueAt)}`}
                </div>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                  STATUS_STYLE[r.status] ?? STATUS_STYLE.upcoming,
                )}
              >
                {STATUS_LABEL[r.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
