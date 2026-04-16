import Link from 'next/link';
import { ArrowRight, Clock3, User as UserIcon } from 'lucide-react';
import { formatNaira } from '@/lib/format';

type DebtItem = {
  id: string;
  customerNameSnapshot: string;
  phoneSnapshot: string;
  amountOwed: number;
  amountPaid: number;
  dueDate: Date | null;
};

type Props = {
  debts: DebtItem[];
  businessType: string;
};

/**
 * "Course You're Taking" equivalent — open debts with partial payments.
 * Shows a circular progress ring per debt so the seller can see at-a-glance
 * which collections are closest to done.
 */
export function DebtProgressCards({ debts, businessType }: Props) {
  const isPm = businessType === 'property_manager';
  const title = isPm ? 'Rent you are collecting' : 'Debts you are collecting';
  if (debts.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <Link
          href="/debts"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {debts.map((d) => {
          const paid = d.amountPaid ?? 0;
          const remaining = Math.max(d.amountOwed - paid, 0);
          const pct = Math.round((paid / d.amountOwed) * 100);
          return (
            <Link
              key={d.id}
              href={`/debts?q=${encodeURIComponent(d.customerNameSnapshot)}`}
              className="card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-owed-50 text-owed-600">
                <UserIcon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-ink">{d.customerNameSnapshot}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock3 size={10} />
                  Remaining
                </div>
                <div className="num text-sm font-bold text-owed-600">{formatNaira(remaining)}</div>
              </div>
              <ProgressRing pct={pct} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  // 40×40 ring, 18px radius, 3px stroke
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
      <svg width={40} height={40} viewBox="0 0 40 40">
        <circle cx={20} cy={20} r={r} stroke="#E5E7EB" strokeWidth={3} fill="none" />
        <circle
          cx={20}
          cy={20}
          r={r}
          stroke="#2ECC71"
          strokeWidth={3}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
        />
      </svg>
      <div className="absolute text-[10px] font-bold text-success-700">{pct}%</div>
    </div>
  );
}
