import Link from 'next/link';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { formatNaira } from '@/lib/format';

type Props = {
  count: number;
  total: number;
};

/**
 * Dashboard banner: surfaces payments that have been recorded as "paid" but
 * never verified against a bank alert. These are the fraud risk, if a seller
 * ships against an unverified payment, that's where scams happen.
 */
export function UnverifiedBanner({ count, total }: Props) {
  if (count === 0) return null;
  return (
    <Link
      href="/payments?verification=unverified"
      className="group block rounded-xl border border-owed-500/40 bg-owed-50 px-4 py-3 transition hover:bg-owed-100"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-owed-500 text-white">
          <ShieldAlert size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-owed-700">
            {count} unverified payment{count === 1 ? '' : 's'}, don&rsquo;t ship yet
          </div>
          <div className="text-xs text-owed-700/80">
            <span className="num">{formatNaira(total)}</span> pending confirmation.
            Paste your bank alert to auto-verify.
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
