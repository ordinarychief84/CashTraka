'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, Zap, Trash2 } from 'lucide-react';

/**
 * Per-row actions for ProductionTemplate. Run-now spawns a Production
 * Order immediately + advances `nextRunAt` so the cron doesn't double-spawn.
 * Pause / resume toggle the cron eligibility. Delete is soft.
 */
export function TemplateRowActions({
  templateId,
  status,
}: {
  templateId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function call(path: 'pause' | 'resume' | 'run-now') {
    startTransition(async () => {
      setMsg(null);
      setError(null);
      try {
        const res = await fetch(`/api/production-templates/${templateId}/${path}`, {
          method: 'POST',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || 'Action failed.');
          return;
        }
        if (path === 'run-now') {
          const pn = data?.data?.productionNumber;
          setMsg(pn ? `Spawned ${pn}` : 'Spawned production order.');
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error.');
      }
    });
  }

  function onDelete() {
    if (!confirm('Delete this template? Past production runs will not be affected.')) return;
    startTransition(async () => {
      setMsg(null);
      setError(null);
      try {
        const res = await fetch(`/api/production-templates/${templateId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || 'Delete failed.');
          return;
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error.');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => call('run-now')}
          disabled={pending || status !== 'active'}
          className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700 hover:bg-brand-100 disabled:opacity-40"
          title="Spawn a production order right now"
        >
          <Zap size={11} />
          Run now
        </button>
        {status === 'active' ? (
          <button
            type="button"
            onClick={() => call('pause')}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Pause size={11} />
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={() => call('resume')}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Play size={11} />
            Resume
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
          title="Delete template"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {msg && <span className="text-[10px] font-semibold text-success-700">{msg}</span>}
      {error && <span className="text-[10px] font-semibold text-rose-700">{error}</span>}
    </div>
  );
}
