'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, CheckCircle2 } from 'lucide-react';

/**
 * "Mark task done" dialog shown when staff tick the checkbox on an assigned
 * task. Lets them leave an optional 1-line note ("Delivered at 2pm, paid
 * cash") that the owner will see on the task afterwards. The whole flow is
 * intentionally tiny — one field, one button — so the staff never has to
 * context-switch away from their actual work.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  taskId: string;
  title: string;
};

export function CompleteTaskDialog({ open, onClose, taskId, title }: Props) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function save(skipNote = false) {
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { status: 'done' };
      if (!skipNote && note.trim()) body.completionNote = note.trim();
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md overflow-hidden rounded-t-2xl p-0 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-success-500 px-5 py-4 text-ink">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span className="text-base font-bold">Mark as done</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 hover:bg-black/20"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Task
            </div>
            <div className="mt-1 font-semibold text-ink">{title}</div>
          </div>

          <div>
            <label htmlFor="note" className="label">
              Add a quick note (optional)
            </label>
            <input
              id="note"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Delivered 2pm, customer paid in cash"
              maxLength={300}
              autoFocus
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Your owner will see this along with the completion time.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? 'Saving…' : 'Mark done'}
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={submitting}
              className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:text-ink"
            >
              Mark done without a note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
