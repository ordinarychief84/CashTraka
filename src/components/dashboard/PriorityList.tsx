import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PriorityItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href: string;
  iconTone?: 'brand' | 'owed' | 'success' | 'slate';
};

type Props = {
  title: string;
  items: PriorityItem[];
  emptyMessage?: string;
};

const TONE: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-600',
  owed: 'bg-owed-50 text-owed-600',
  success: 'bg-success-50 text-success-700',
  slate: 'bg-slate-100 text-slate-600',
};

/**
 * "Today's Priorities" — mirror of the reference's Daily Schedule panel.
 * 4–5 action rows with icon, title, subtitle, chevron link.
 */
export function PriorityList({ title, items, emptyMessage = 'Nothing to do — nice!' }: Props) {
  return (
    <div className="card p-5">
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {items.map((it) => {
            const Icon = it.icon;
            const tone = TONE[it.iconTone ?? 'brand'];
            return (
              <li key={it.id}>
                <Link
                  href={it.href}
                  className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50"
                >
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{it.title}</div>
                    <div className="truncate text-xs text-slate-500">{it.subtitle}</div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
