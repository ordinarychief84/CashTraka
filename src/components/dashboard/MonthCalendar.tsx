import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  /** Map of YYYY-MM-DD → event marker. Any truthy entry draws a dot. */
  activity: Record<string, boolean>;
  dueDates?: Record<string, boolean>;
};

const DOW_HEAD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Month calendar, today highlighted, days with activity get a small dot,
 * days with due reminders or overdue debts get an amber dot.
 *
 * Intentionally read-only; prev/next arrows are decorative, clicking them
 * would require a client component and the data is server-side for now.
 */
export function MonthCalendar({ activity, dueDates = {} }: Props) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  const monthLabel = today.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  // Build a 6×7 matrix including prev-month padding
  const cells: { date: Date; inMonth: boolean }[] = [];
  // Previous month fill
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(y, m, 1 - (startWeekday - i));
    cells.push({ date: d, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(y, m, d), inMonth: true });
  // Next month fill up to 42
  let nextD = 1;
  while (cells.length < 42) {
    cells.push({ date: new Date(y, m + 1, nextD++), inMonth: false });
  }

  function iso(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Previous month"
          disabled
        >
          <ChevronLeft size={14} />
        </button>
        <div className="text-sm font-bold text-ink">{monthLabel}</div>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Next month"
          disabled
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-0.5 text-center">
        {DOW_HEAD.map((h, i) => (
          <div key={i} className="py-1 text-[10px] font-semibold uppercase text-slate-400">
            {h}
          </div>
        ))}
        {cells.map(({ date, inMonth }, i) => {
          const key = iso(date);
          const isToday =
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
          const hasActivity = activity[key];
          const isDue = dueDates[key];
          return (
            <div
              key={i}
              className={cn(
                'relative flex h-8 items-center justify-center text-[11px]',
                !inMonth && 'text-slate-300',
                inMonth && !isToday && 'text-slate-700',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full transition',
                  isToday && 'bg-brand-500 font-bold text-white',
                )}
              >
                {date.getDate()}
              </span>
              {(hasActivity || isDue) && !isToday && (
                <span
                  className={cn(
                    'absolute bottom-0.5 h-1 w-1 rounded-full',
                    isDue ? 'bg-owed-500' : 'bg-brand-500',
                  )}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
