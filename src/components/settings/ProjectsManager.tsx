'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';

export interface ProjectRow {
  id: string;
  number: string;
  name: string;
  description: string | null;
}

interface Props {
  initialRows: ProjectRow[];
}

const inputCls =
  'h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300';
const labelCls = 'mb-1.5 block text-[12px] font-medium text-slate-600';

export function ProjectsManager({ initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<ProjectRow[]>(initialRows);
  const [pending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setNumber('');
    setName('');
    setDescription('');
    setError(null);
  }

  async function submit(andNew: boolean) {
    if (!number.trim() || !name.trim()) {
      setError('Number and name are both required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: number.trim(),
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error ?? 'Could not create project.');
        return;
      }
      setRows((prev) =>
        [...prev, json.data.project].sort((a, b) => a.number.localeCompare(b.number)),
      );
      if (andNew) {
        reset();
      } else {
        reset();
        setShowForm(false);
      }
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project?')) return;
    const res = await fetch(`/api/settings/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      startTransition(() => router.refresh());
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={13} />
            Create project
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[15px] font-semibold text-slate-800">Create project</p>
            <button
              type="button"
              onClick={() => {
                reset();
                setShowForm(false);
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelCls}>Number</label>
              <input
                autoFocus
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300 resize-y"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-[12px] font-medium text-rose-600">{error}</p>}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={12} className="animate-spin" />}
              Create project
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={submitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Create and new
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13px] text-slate-500">
            No projects yet. Add a project to group orders, expenses and
            invoices by cost centre.
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Number</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="w-12 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-[12px] font-semibold text-brand-700">
                    {r.number}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.description ? (
                      <span className="line-clamp-1" title={r.description}>{r.description}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      disabled={pending}
                      title="Delete project"
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
