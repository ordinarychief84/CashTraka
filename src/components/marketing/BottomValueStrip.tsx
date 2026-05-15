import type { LucideIcon } from 'lucide-react';
import { Package, CalendarDays, TrendingUp, Smartphone } from 'lucide-react';

type Item = {
  Icon: LucideIcon;
  iconTone: 'brand' | 'success' | 'owed' | 'slate';
  title: string;
  subtitle: string;
};

const ITEMS: Item[] = [
  {
    Icon: Package,
    iconTone: 'brand',
    title: 'Avoid stockouts',
    subtitle: "Know what you're short of",
  },
  {
    Icon: CalendarDays,
    iconTone: 'success',
    title: 'Plan production',
    subtitle: 'Stay ahead of customer demand',
  },
  {
    Icon: TrendingUp,
    iconTone: 'owed',
    title: 'Increase profits',
    subtitle: 'Reduce waste and overspending',
  },
  {
    Icon: Smartphone,
    iconTone: 'brand',
    title: 'Run your business',
    subtitle: 'From anywhere, on any device',
  },
];

const ICON_BG: Record<Item['iconTone'], string> = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-50 text-success-700',
  owed: 'bg-owed-50 text-owed-700',
  slate: 'bg-slate-100 text-slate-700',
};

/**
 * Bottom value-prop strip — 4 columns under the hero. Each card is the
 * "what you actually get" condensed promise. Lives inside its own
 * card-style container with a subtle shadow so it feels like a single
 * stripe rather than four loose cards.
 */
export function BottomValueStrip() {
  return (
    <section className="rounded-3xl border border-border bg-white/80 px-4 py-6 shadow-sm md:px-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((item) => (
          <div key={item.title} className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ICON_BG[item.iconTone]}`}
            >
              <item.Icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink">{item.title}</div>
              <div className="text-xs text-slate-500">{item.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
