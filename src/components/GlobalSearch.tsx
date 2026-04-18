'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Suspense, useState } from 'react';

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (\!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} role="search" className="w-full max-w-md">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customers, payments, debts"
          className="h-10 w-full rounded-lg border border-border bg-white pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          style={{ minHeight: '40px' }}
        />
      </div>
    </form>
  );
}

export function GlobalSearch() {
  return (
    <Suspense fallback={<div className="h-10 w-full max-w-md" />}>
      <Inner />
    </Suspense>
  );
}
