'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export interface LanguageRow {
  id: string;
  name: string;
  code: string;
}

interface Props {
  initialRows: LanguageRow[];
}

const inputCls =
  'h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300';
const errCls =
  'h-9 w-full rounded-md border border-rose-400 px-3 text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-rose-200';

export function LanguagesManager({ initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<LanguageRow[]>(initialRows);
  const [, startTransition] = useTransition();

  // ── Add-new form (left column) ──
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreate() {
    setNameErr(null);
    setCodeErr(null);
    setFormError(null);
    if (!name.trim()) {
      setNameErr('The name field is required.');
    }
    if (!code.trim()) {
      setCodeErr('The locale field is required.');
    }
    if (!name.trim() || !code.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/settings/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), code: code.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json?.error ?? 'Could not add language.');
        return;
      }
      setRows((prev) =>
        [...prev, json.data.language].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setName('');
      setCode('');
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
      {/* ── Add new language ── */}
      <aside className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-[14px] font-semibold text-brand-700">Add new languages</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameErr(null);
              }}
              placeholder="Example: English"
              className={nameErr ? errCls : inputCls}
            />
            {nameErr && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">{nameErr}</p>
            )}
          </div>

          <div>
            <label className={`mb-1 block text-[12px] font-medium ${codeErr ? 'text-rose-600' : 'text-slate-600'}`}>
              Language code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setCodeErr(null);
              }}
              placeholder="Example: EN"
              className={codeErr ? errCls : inputCls}
            />
            {codeErr && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">{codeErr}</p>
            )}
          </div>

          {formError && (
            <p className="text-[12px] font-medium text-rose-600">{formError}</p>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting}
            className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            Create languages
          </button>
        </div>
      </aside>

      {/* ── Existing languages table ── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        {rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] text-slate-500">
            No languages yet — add one on the left.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[12px] font-semibold text-slate-700">
                  <th className="px-2 py-2.5">Name</th>
                  <th className="px-2 py-2.5">Language code</th>
                  <th className="w-32 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <LanguageRowEditor
                    key={r.id}
                    row={r}
                    onSaved={(next) =>
                      setRows((prev) =>
                        prev.map((x) => (x.id === r.id ? next : x)).sort((a, b) => a.name.localeCompare(b.name)),
                      )
                    }
                    onDeleted={() =>
                      setRows((prev) => prev.filter((x) => x.id !== r.id))
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function LanguageRowEditor({
  row,
  onSaved,
  onDeleted,
}: {
  row: LanguageRow;
  onSaved: (next: LanguageRow) => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(row.name);
  const [code, setCode] = useState(row.code);
  const [saving, setSaving] = useState(false);
  const dirty = name !== row.name || code !== row.code;
  const [, startTransition] = useTransition();

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/languages/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), code: code.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        onSaved(json.data.language);
        startTransition(() => router.refresh());
      }
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!confirm(`Delete the "${row.name}" language?`)) return;
    const res = await fetch(`/api/settings/languages/${row.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDeleted();
      startTransition(() => router.refresh());
    }
  }

  return (
    <tr className="align-middle">
      <td className="px-2 py-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className={inputCls}
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={del}
            className="text-[12px] font-semibold text-rose-600 hover:underline"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              dirty && !saving
                ? 'bg-brand-600 text-white hover:bg-brand-700'
                : 'bg-brand-100 text-brand-400 cursor-not-allowed'
            }`}
          >
            {saving && <Loader2 size={11} className="animate-spin" />}
            Save
          </button>
        </div>
      </td>
    </tr>
  );
}
