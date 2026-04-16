'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

/**
 * Round checkbox on every task row that toggles done ↔ todo with one tap.
 * Prevents a full dialog just to mark something finished.
 */
export function TaskQuickCheck({
  id,
  done,
}: {
  id: string;
  done: boolean;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(done);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !optimistic;
    setOptimistic(next);
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next ? 'done' : 'todo' }),
      });
      router.refresh();
    } catch {
      setOptimistic(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={optimistic ? 'Mark as not done' : 'Mark as done'}
      className={
        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ' +
        (optimistic
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-slate-300 bg-white text-transparent hover:border-brand-500 hover:text-brand-500')
      }
    >
      <Check size={12} strokeWidth={3} />
    </button>
  );
}
