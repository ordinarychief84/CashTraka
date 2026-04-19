import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string;
  tone?: 'brand' | 'danger' | 'neutral';
  sub?: string;
};

const ACCENT: Record<string, string> = {
  brand: 'bg-brand-500',
  danger: 'bg-red-500',
  neutral: 'bg-slate-300',
};

export function StatCard({ label, value, tone = 'neutral', sub }: Props) {
  return (
    <div className="card relative overflow-hidden p-4 transition hover:shadow-md">
      {/* Accent strip */}
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-0.5', ACCENT[tone])}
      />
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div
        className={cn(
          'num mt-2 text-2xl font-black leading-none tracking-tight',
          tone === 'brand' && 'text-brand-600',
          tone === 'danger' && 'text-owed-600',
          tone === 'neutral' && 'text-ink',
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}
