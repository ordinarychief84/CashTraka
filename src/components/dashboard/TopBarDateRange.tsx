import { Calendar, ChevronDown } from 'lucide-react';

/**
 * Date-range pill rendered on the right of the top bar. Static for now —
 * shows the current 7-day window. Click handler is a no-op until the
 * date-picker UX is built; the visual matches the approved comp.
 */
export function TopBarDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
    });
  const year = end.getFullYear();
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      aria-label="Change date range"
    >
      <Calendar size={13} className="text-slate-500" />
      <span>
        {fmt(start)} – {fmt(end)}, {year}
      </span>
      <ChevronDown size={12} className="text-slate-400" />
    </button>
  );
}
