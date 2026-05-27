'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, X, Loader2, Star, Search } from 'lucide-react';
import { CURRENCY_CATALOG, getCurrencyInfo } from '@/lib/currency-catalog';

export interface CurrencyRow {
  id: string;
  code: string;
  exchangeRate: number;
  isDefault: boolean;
}

interface Props {
  initialRows: CurrencyRow[];
}

const inputCls =
  'h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300';

function formatRate(n: number): string {
  // Show up to 6 decimal places — enough for most NGN-based pairs
  // (e.g. NGN→USD ≈ 0.000650). Strip trailing zeros.
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(6).replace(/\.?0+$/, '') || '0';
}

export function CurrenciesManager({ initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<CurrencyRow[]>(initialRows);
  const [openAdd, setOpenAdd] = useState(false);
  const [, startTransition] = useTransition();

  async function handleRateChange(id: string, newRate: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, exchangeRate: newRate } : r)));
    const res = await fetch(`/api/settings/currencies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchangeRate: newRate }),
    });
    if (!res.ok) {
      // Revert on failure.
      router.refresh();
    } else {
      startTransition(() => router.refresh());
    }
  }

  async function handleSetDefault(id: string) {
    if (!confirm('Make this the default currency? Other currency rates will need to be re-quoted manually.')) {
      return;
    }
    const res = await fetch(`/api/settings/currencies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          isDefault: r.id === id,
          exchangeRate: r.id === id ? 1.0 : r.exchangeRate,
        })),
      );
      startTransition(() => router.refresh());
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this currency from your active list? Existing invoices keep their currency.')) return;
    const res = await fetch(`/api/settings/currencies/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      startTransition(() => router.refresh());
    } else {
      const json = await res.json().catch(() => null);
      alert(json?.error ?? 'Could not remove currency.');
    }
  }

  function onAdded(row: CurrencyRow) {
    setRows((prev) =>
      [...prev, row].sort((a, b) =>
        (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || a.code.localeCompare(b.code),
      ),
    );
    setOpenAdd(false);
    startTransition(() => router.refresh());
  }

  const defaultCode = rows.find((r) => r.isDefault)?.code ?? 'NGN';

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] text-slate-500">
          {rows.length} {rows.length === 1 ? 'currency' : 'currencies'} enabled.
          Default: <strong className="text-slate-700">{defaultCode}</strong>.
        </p>
        <button
          type="button"
          onClick={() => setOpenAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={13} />
          Create new
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Currency</th>
              <th className="px-4 py-2.5">Fixed exchange rate</th>
              <th className="px-4 py-2.5">Currency rate</th>
              <th className="w-12 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const info = getCurrencyInfo(r.code);
              return (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold text-brand-700">
                        {r.code}
                      </span>
                      {info?.symbol && (
                        <span className="text-[11px] text-slate-400">{info.symbol}</span>
                      )}
                      {info?.name && (
                        <span className="text-[11px] text-slate-400">· {info.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.isDefault ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700">
                        <Star size={10} fill="currentColor" />
                        Default currency
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(r.id)}
                        className="text-[11px] text-slate-400 hover:text-brand-600 hover:underline"
                        title="Set as default currency"
                      >
                        No
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <RateInput
                      key={r.id + '-' + r.isDefault}
                      initial={r.exchangeRate}
                      readOnly={r.isDefault}
                      onCommit={(v) => handleRateChange(r.id, v)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      disabled={r.isDefault}
                      title={r.isDefault ? 'Cannot delete the default currency' : 'Remove currency'}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openAdd && (
        <AddCurrencyModal
          existingCodes={new Set(rows.map((r) => r.code))}
          onClose={() => setOpenAdd(false)}
          onAdded={onAdded}
        />
      )}
    </div>
  );
}

function RateInput({
  initial,
  readOnly,
  onCommit,
}: {
  initial: number;
  readOnly: boolean;
  onCommit: (v: number) => void;
}) {
  const [v, setV] = useState(formatRate(initial));
  return (
    <input
      type="number"
      step="0.000001"
      min="0"
      readOnly={readOnly}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0 && n !== initial) onCommit(n);
        else setV(formatRate(initial));
      }}
      className={`${inputCls} max-w-[200px] ${readOnly ? 'cursor-not-allowed bg-slate-50' : ''}`}
    />
  );
}

function AddCurrencyModal({
  existingCodes,
  onClose,
  onAdded,
}: {
  existingCodes: Set<string>;
  onClose: () => void;
  onAdded: (row: CurrencyRow) => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = CURRENCY_CATALOG.filter((c) => !existingCodes.has(c.code));
    if (!q) return pool;
    return pool.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q),
    );
  }, [query, existingCodes]);

  // Group by region for the dropdown — Africa first.
  const grouped = useMemo(() => {
    const order = ['West Africa', 'East Africa', 'Southern Africa', 'Central Africa', 'North Africa', 'International'] as const;
    return order
      .map((region) => ({
        region,
        items: filtered.filter((c) => c.region === region),
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  async function submit() {
    if (!selectedCode) {
      setError('Pick a currency first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: selectedCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error ?? 'Could not add currency.');
        return;
      }
      onAdded(json.data.currency);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-3 max-h-[90vh] w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-[15px] font-semibold text-slate-900">Add new currency</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="relative mb-3">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedCode('');
              }}
              placeholder="Search by code, name or region"
              className={`${inputCls} pl-8`}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-slate-400">
              {existingCodes.size === CURRENCY_CATALOG.length
                ? 'All supported currencies are already enabled.'
                : 'No currencies match your search.'}
            </p>
          ) : (
            <div className="max-h-[40vh] overflow-y-auto rounded-md border border-slate-200">
              {grouped.map((g) => (
                <div key={g.region}>
                  <div className="sticky top-0 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {g.region}
                  </div>
                  {g.items.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setSelectedCode(c.code)}
                      className={`flex w-full items-center justify-between border-b border-slate-100 px-4 py-2 text-left last:border-0 hover:bg-slate-50 ${
                        selectedCode === c.code ? 'bg-brand-50' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`font-mono text-[13px] font-semibold ${
                            selectedCode === c.code ? 'text-brand-700' : 'text-slate-800'
                          }`}
                        >
                          {c.code}
                        </span>
                        {c.symbol && <span className="text-[11px] text-slate-400">{c.symbol}</span>}
                      </span>
                      <span className="text-[12px] text-slate-500">{c.name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {error && <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!selectedCode || submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            Add selected currency
          </button>
        </div>
      </div>
    </div>
  );
}
