'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = {
  resultId: string;
  itemId: string;
  label: string;
  checked: boolean;
  note: string | null;
};

type Props = {
  runId: string;
  checklistName: string;
  items: Item[];
};

export function ChecklistRunner({ runId, checklistName, items: initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const total = items.length;
  const done = items.filter((i) => i.checked).length;
  const allDone = done === total && total > 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const toggle = useCallback(
    async (idx: number) => {
      const item = items[idx];
      const next = !item.checked;
      // Optimistic update
      setItems((prev) =>
        prev.map((it, i) =>
          i === idx ? { ...it, checked: next } : it,
        ),
      );
      try {
        await fetch(`/api/checklists/runs/${runId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: item.itemId,
            checked: next,
          }),
        });
        router.refresh();
      } catch {
        // Revert on failure
        setItems((prev) =>
          prev.map((it, i) =>
            i === idx ? { ...it, checked: !next } : it,
          ),
        );
      }
    },
    [items, runId, router],
  );

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">{checklistName}</span>
          <span className={cn('num', allDone ? 'text-success-700' : 'text-slate-600')}>
            {done}/{total}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              allDone ? 'bg-success-500' : 'bg-brand-500',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Completion banner */}
      {allDone && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-success-500/40 bg-success-50 p-4">
          <PartyPopper size={24} className="shrink-0 text-success-600" />
          <div>
            <div className="font-bold text-success-700">Checklist complete!</div>
            <div className="text-xs text-success-700/80">
              All {total} items done. Great work.
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={item.resultId}>
            <button
              type="button"
              onClick={() => toggle(i)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-4 text-left transition',
                item.checked
                  ? 'border-success-500/30 bg-success-50/60'
                  : 'border-border bg-white hover:border-brand-300 hover:bg-brand-50/30',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition',
                  item.checked
                    ? 'border-success-500 bg-success-500 text-white'
                    : 'border-slate-300 bg-white',
                )}
              >
                {item.checked && <Check size={16} strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  item.checked ? 'text-slate-500 line-through' : 'text-ink',
                )}
              >
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Link href="/checklists" className="btn-ghost w-full text-sm">
          ← Back to checklists
        </Link>
      </div>
    </div>
  );
}
