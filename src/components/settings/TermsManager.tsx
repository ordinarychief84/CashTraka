'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Star, Trash2, X, Loader2 } from 'lucide-react';

export interface TermRow {
  id: string;
  name: string;
  description: string | null;
  netDays?: number | null;
  type?: string | null;
  isDefault: boolean;
}

interface Props {
  initialRows: TermRow[];
  /** "payment-terms" or "delivery-terms" — drives the API endpoint. */
  endpoint: 'payment-terms' | 'delivery-terms';
  /** Whether the form exposes a "Net days" field (payment terms only). */
  showNetDays: boolean;
  /** Optional "Type" dropdown options. Empty → field is not rendered. */
  typeOptions?: { value: string; label: string }[];
  /** Singular noun for empty state + button copy ("payment term", "delivery term"). */
  singular: string;
}

export function TermsManager({ initialRows, endpoint, showNetDays, typeOptions, singular }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<TermRow[]>(initialRows);
  const [pending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [netDays, setNetDays] = useState<string>('');
  const [termType, setTermType] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showTypeField = !!typeOptions && typeOptions.length > 0;

  function resetForm() {
    setName('');
    setDescription('');
    setNetDays('');
    setTermType('');
    setIsDefault(false);
    setError(null);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        isDefault,
      };
      if (showNetDays) {
        body.netDays = netDays === '' ? null : Number(netDays);
      }
      if (showTypeField) {
        body.type = termType || null;
      }
      const res = await fetch(`/api/settings/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error ?? 'Could not create term.');
        return;
      }
      const created = json.data.paymentTerm ?? json.data.deliveryTerm;
      // If new row is default, unflag every existing row locally too.
      const next = isDefault
        ? rows.map((r) => ({ ...r, isDefault: false }))
        : [...rows];
      next.push(created);
      setRows(next.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || a.name.localeCompare(b.name)));
      resetForm();
      setShowForm(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message ?? 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  async function setAsDefault(id: string) {
    const res = await fetch(`/api/settings/${endpoint}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      setRows((prev) => prev.map((r) => ({ ...r, isDefault: r.id === id })));
      startTransition(() => router.refresh());
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this term? Existing records that reference it will keep the snapshot name.')) {
      return;
    }
    const res = await fetch(`/api/settings/${endpoint}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      startTransition(() => router.refresh());
    }
  }

  return (
    <div>
      {/* Action bar */}
      <div className="mb-4 flex items-center justify-end">
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={13} />
            Add {singular}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-slate-800">New {singular}</p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={showNetDays ? 'Net 30' : 'EXW'}
                className="h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
              />
            </div>
            {showTypeField && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">Type</label>
                <select
                  value={termType}
                  onChange={(e) => setTermType(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 pr-8 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
                >
                  <option value="">—</option>
                  {typeOptions!.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
            {showNetDays && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Net days
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={netDays}
                  onChange={(e) => setNetDays(e.target.value)}
                  placeholder="30"
                  className="h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
                />
              </div>
            )}
            <div className="md:col-span-2 lg:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={showNetDays ? 'Due 30 days from invoice date' : 'Ex Works — buyer collects'}
                className="h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
              />
            </div>
          </div>

          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-slate-700">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-brand-600"
            />
            Use as the default {singular} on new customers and suppliers
          </label>

          {error && (
            <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={12} className="animate-spin" />}
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[13px] text-slate-500">
              No {singular}s configured yet. Add one to make it available on customer
              and supplier forms.
            </p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Name</th>
                {showTypeField && <th className="px-4 py-2.5">Type</th>}
                <th className="px-4 py-2.5">Description</th>
                {showNetDays && <th className="px-4 py-2.5 text-right">Net days</th>}
                <th className="px-4 py-2.5">Default</th>
                <th className="w-12 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                  {showTypeField && (
                    <td className="px-4 py-3 text-slate-600">
                      {typeOptions!.find((o) => o.value === r.type)?.label ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-600">{r.description ?? '—'}</td>
                  {showNetDays && (
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.netDays ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {r.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                        <Star size={10} fill="currentColor" />
                        Default
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAsDefault(r.id)}
                        disabled={pending}
                        className="text-[11px] text-slate-400 hover:text-brand-600 hover:underline"
                      >
                        Set as default
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      title={`Delete ${singular}`}
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
