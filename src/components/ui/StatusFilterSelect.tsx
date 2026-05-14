'use client';

import { ChevronDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusFilterOption = {
  value: string;
  label: string;
};

/**
 * Single-select status filter dropdown. Drop-in replacement for the
 * pill-button rows that previously sat on top of list pages
 * (/orders, /production, work history, etc.).
 *
 * Use empty-string for the "All" option so callers can decide what the
 * "show everything" label is.
 */
export function StatusFilterSelect({
  value,
  onChange,
  options,
  label = 'Status',
  className,
  size = 'md',
}: {
  value: string;
  onChange: (next: string) => void;
  options: StatusFilterOption[];
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border bg-white',
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm',
        className,
      )}
    >
      <Filter
        size={size === 'sm' ? 11 : 13}
        className="shrink-0 text-slate-400"
      />
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'cursor-pointer appearance-none bg-transparent pl-0 pr-5 font-semibold text-ink focus:outline-none',
          size === 'sm' ? 'text-xs' : 'text-sm',
        )}
        style={{
          // Native arrow is hidden; we draw our own.
          backgroundImage: 'none',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={size === 'sm' ? 11 : 13}
        className="-ml-4 pointer-events-none shrink-0 text-slate-400"
      />
    </label>
  );
}
