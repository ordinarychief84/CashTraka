'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  'Stock',
  'Delivery',
  'Packaging',
  'Data',
  'Wages',
  'Rent',
  'Transport',
  'Other',
] as const;

export function ExpenseSearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQ = sp.get('q') ?? '';
  const currentCat = sp.get('category') ?? '';

  function push(params: Record<string, string>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.push(`/expenses?${next.toString()}`));
  }

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      {/* Search input */}
      <div className="relative flex-1">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search expenses…"
          defaultValue={currentQ}
          className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-8 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              push({ q: (e.target as HTMLInputElement).value });
            }
          }}
        />
        {currentQ && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = '';
              push({ q: '' });
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <Chip
          label="All"
          active={\!currentCat}
          onClick={() => push({ category: '' })}
        />
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            active={currentCat === cat}
            onClick={() => push({ category: currentCat === cat ? '' : cat })}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-border bg-white text-slate-500 hover:bg-slate-50',
      )}
    >
      {label}
    </button>
  );
}
