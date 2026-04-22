'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect, useTransition } from 'react';
import { ChevronDown, Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BUSINESS_EXPENSE_CATEGORIES,
  PERSONAL_EXPENSE_CATEGORIES,
} from '@/lib/validators';

export function ExpenseSearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentCat = sp.get('category') ?? '';
  const currentKind = sp.get('kind') ?? '';

  const businessCats = BUSINESS_EXPENSE_CATEGORIES as readonly string[];
  const personalCats = PERSONAL_EXPENSE_CATEGORIES as readonly string[];

  // Determine which categories to show based on the kind filter
  const showBusiness = currentKind !== 'personal';
  const showPersonal = currentKind !== 'business';

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus the search input when dropdown opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function push(params: Record<string, string>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete('q');
    startTransition(() => router.push(`/expenses?${next.toString()}`));
  }

  function select(cat: string) {
    push({ category: cat === currentCat ? '' : cat });
    setOpen(false);
    setQuery('');
  }

  function clear() {
    push({ category: '' });
    setOpen(false);
    setQuery('');
  }

  const q = query.toLowerCase();
  const filteredBusiness = showBusiness
    ? businessCats.filter((c) => c.toLowerCase().includes(q))
    : [];
  const filteredPersonal = showPersonal
    ? personalCats.filter((c) => c.toLowerCase().includes(q))
    : [];
  const hasResults = filteredBusiness.length > 0 || filteredPersonal.length > 0;

  return (
    <div ref={ref} className="relative mb-4">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition',
          currentCat
            ? 'border-brand-500 bg-brand-50 text-brand-700'
            : 'border-border bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
        )}
      >
        <Filter size={14} className={currentCat ? 'text-brand-500' : 'text-slate-400'} />
        {currentCat || 'All Categories'}
        <ChevronDown
          size={14}
          className={cn(
            'transition-transform duration-150',
            open ? 'rotate-180' : '',
            currentCat ? 'text-brand-500' : 'text-slate-400',
          )}
        />
      </button>

      {/* Clear button when a category is selected */}
      {currentCat && (
        <button
          onClick={clear}
          className="ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
        >
          <X size={12} />
          Clear
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="border-b border-slate-100 px-3 py-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories..."
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-1 focus:ring-brand-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {/* All Categories option */}
            {!query && (
              <button
                onClick={clear}
                className={cn(
                  'flex w-full items-center px-3.5 py-2 text-sm transition-colors',
                  !currentCat
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                All Categories
              </button>
            )}

            {/* Business categories */}
            {filteredBusiness.length > 0 && (
              <>
                {(showPersonal && showBusiness) && (
                  <div className="px-3.5 pt-2 pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Business
                    </span>
                  </div>
                )}
                {filteredBusiness.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => select(cat)}
                    className={cn(
                      'flex w-full items-center px-3.5 py-2 text-sm transition-colors',
                      currentCat === cat
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </>
            )}

            {/* Personal categories */}
            {filteredPersonal.length > 0 && (
              <>
                {(showPersonal && showBusiness) && (
                  <div className="px-3.5 pt-2 pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Personal
                    </span>
                  </div>
                )}
                {filteredPersonal.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => select(cat)}
                    className={cn(
                      'flex w-full items-center px-3.5 py-2 text-sm transition-colors',
                      currentCat === cat
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </>
            )}

            {/* No results */}
            {!hasResults && query && (
              <p className="px-3.5 py-4 text-center text-sm text-slate-400">
                No categories match &ldquo;{query}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
