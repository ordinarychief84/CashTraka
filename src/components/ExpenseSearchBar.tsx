'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BUSINESS_EXPENSE_CATEGORIES,
  PERSONAL_EXPENSE_CATEGORIES,
} from '@/lib/validators';

export function ExpenseSearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQ = sp.get('q') ?? '';
  const currentCat = sp.get('category') ?? '';
  const currentKind = sp.get('kind') ?? '';

  // Show relevant categories based on the active kind tab
  const categories =
    currentKind === 'personal'
      ? PERSONAL_EXPENSE_CATEGORIES
      : currentKind === 'business'
        ? BUSINESS_EXPENSE_CATEGORIES
        : [...new Set([...BUSINESS_EXPENSE_CATEGORIES, ...PERSONAL_EXPENSE_CATEGORIES])];

  function push(params: Record<string, string>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.push(`/expenses?${next.toString()}`));
  }

  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      <Chip
        label="All"
        active={!currentCat}
        onClick={() => push({ category: '' })}
      />
      {categories.map((cat) => (
        <Chip
          key={cat}
          label={cat}
          active={currentCat === cat}
          onClick={() => push({ category: currentCat === cat ? '' : cat })}
        />
      ))}
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
