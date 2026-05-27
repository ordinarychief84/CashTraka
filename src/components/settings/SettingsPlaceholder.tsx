import { Construction } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  /** Optional rich content shown below the empty state (e.g. links to existing pages) */
  children?: ReactNode;
}

/**
 * Shared empty-state for settings stub pages that don't have a DB
 * model yet. Keeps the visual language consistent across all the
 * "coming soon" surfaces under /settings/* so the sidebar reads as a
 * single product instead of a graveyard of half-built pages.
 */
export function SettingsPlaceholder({ title, subtitle, children }: Props) {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Construction size={20} />
        </div>
        <p className="text-[14px] font-semibold text-slate-700">Coming soon</p>
        <p className="mx-auto mt-1 max-w-sm text-[12px] text-slate-500">
          This area is on the CashTraka roadmap. Reach out if you need it
          prioritised for your business.
        </p>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  );
}
