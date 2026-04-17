'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { CompleteTaskDialog } from './CompleteTaskDialog';

/**
 * Round checkbox on every task row that toggles done ↔ todo.
 *
 * For staff + fresh complete: opens CompleteTaskDialog so they can add a
 * 1-line note. Owner can just flip without the note flow (faster for
 * self-assigned admin tasks).
 *
 * Un-checking (re-opening a done task) always short-circuits straight to
 * the PATCH without a prompt.
 */
export function TaskQuickCheck({
  id,
  done,
  title,
  promptOnComplete = false,
}: {
  id: string;
  done: boolean;
  /** Shown in the dialog when `promptOnComplete`. */
  title?: string;
  /** When true, marking done opens the note dialog first. Staff = true,
   *  owner-self = false (owners get a faster click-through). */
  promptOnComplete?: boolean;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(done);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function toggleImmediate(e: React.MouseEvent) {
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

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    // Going TO done, and we want to prompt for a note — open the dialog.
    if (!optimistic && promptOnComplete) {
      setDialogOpen(true);
      return;
    }
    void toggleImmediate(e);
  }

  function onDialogClose() {
    setDialogOpen(false);
    // After dialog closes via a successful PATCH, refresh so the server's
    // value is authoritative (router.refresh is already called inside the
    // dialog). Optimistically flip the checkbox either way.
    setOptimistic(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={optimistic ? 'Mark as not done' : 'Mark as done'}
        className={
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ' +
          (optimistic
            ? 'border-success-500 bg-success-500 text-ink'
            : 'border-slate-300 bg-white text-transparent hover:border-success-500 hover:text-success-500')
        }
      >
        <Check size={12} strokeWidth={3} />
      </button>
      {promptOnComplete && (
        <CompleteTaskDialog
          open={dialogOpen}
          onClose={onDialogClose}
          taskId={id}
          title={title ?? 'Task'}
        />
      )}
    </>
  );
}
