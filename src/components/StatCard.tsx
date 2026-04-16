import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string;
  tone?: 'brand' | 'danger' | 'neutral';
  sub?: string;
};

export function StatCard({ label, value, tone = 'neutral', sub }: Props) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div
        className={cn(
          'num mt-1.5 text-2xl',
          tone === 'brand' && 'text-brand-600',
          tone === 'danger' && 'text-owed-600',
          tone === 'neutral' && 'text-ink',
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
