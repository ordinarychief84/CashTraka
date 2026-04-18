import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { formatNaira } from '@/lib/format';

type Props = {
  count: number;
  total: number;
};

export function OverdueBanner({ count, total }: Props) {
  if (count === 0) return null;
  return (
    <Link
      href="/debts?filter=overdue"
      className="group block rounded-xl border border-owed-500/40 bg-owed-50 px-4 py-3 transition hover:bg-owed-100"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-owed-500 text-white">
          <AlertTriangle size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-owed-700">
            {count} {count === 1 ? 'debt is' : 'debts are'} overdue
          </div>
          <div className="text-xs text-owed-700/80">
            <span className="num">{formatNaira(total)}</span> waiting — send reminders now.
          </div>
        </div>
        <ArrowRight
          size={18}
          className="shrink-0 text-owed-700 transition group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
