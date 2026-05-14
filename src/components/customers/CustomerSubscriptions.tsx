'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Repeat2, Plus, Pause, Play, X, Trash2 } from 'lucide-react';
import { formatNaira } from '@/lib/format';

export type SubscriptionItem = {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPriceKobo: number;
};

export type SubscriptionRow = {
  id: string;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | string;
  status: 'active' | 'paused' | 'cancelled' | string;
  nextRunAt: string;
  lastRunAt: string | null;
  endsAt: string | null;
  itemsJson: string;
  notes: string | null;
};

const CADENCES = [
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
  { value: 'quarterly', label: 'Every 3 months' },
] as const;

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success-100 text-success-800',
  paused: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-600',
};

function parseItems(json: string): SubscriptionItem[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function CustomerSubscriptions({
  customerId,
  initial,
}: {
  customerId: string;
  initial: SubscriptionRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<SubscriptionRow[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Repeat2 size={14} className="text-brand-600" />
          Recurring orders
        </h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
          >
            <Plus size={14} />
            Add subscription
          </button>
        )}
      </div>

      {showForm && (
        <SubscriptionForm
          customerId={customerId}
          onCancel={() => setShowForm(false)}
          onCreated={(row) => {
            setRows((r) => [row, ...r]);
            setShowForm(false);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {rows.length === 0 && !showForm ? (
        <div className="rounded-xl border border-border bg-white p-4 text-xs text-slate-600">
          No recurring orders yet. A subscription auto-creates a draft order on
          the chosen cadence — useful for monthly hampers, weekly produce
          boxes, refill orders.
        </div>
      ) : null}

      {rows.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-white">
          {rows.map((sub) => (
            <SubscriptionRowItem
              key={sub.id}
              sub={sub}
              onChange={(updated) =>
                setRows((r) => r.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)))
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SubscriptionRowItem({
  sub,
  onChange,
}: {
  sub: SubscriptionRow;
  onChange: (s: Partial<SubscriptionRow> & { id: string }) => void;
}) {
  const items = parseItems(sub.itemsJson);
  const total = items.reduce((sum, it) => sum + it.unitPriceKobo * it.quantity, 0);
  const isCancelled = sub.status === 'cancelled';
  const isPaused = sub.status === 'paused';
  const [busy, setBusy] = useState(false);

  async function setStatus(status: 'active' | 'paused' | 'cancelled') {
    if (isCancelled) return;
    if (
      status === 'cancelled' &&
      !window.confirm('Cancel this subscription? It cannot be reactivated.')
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) onChange({ id: sub.id, status });
    } finally {
      setBusy(false);
    }
  }

  const cadenceLabel =
    CADENCES.find((c) => c.value === sub.cadence)?.label ?? sub.cadence;

  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            'rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
            (STATUS_BADGE[sub.status] ?? 'bg-slate-100 text-slate-700')
          }
        >
          {sub.status}
        </span>
        <span className="text-xs font-semibold text-slate-700">{cadenceLabel}</span>
        <span className="text-xs text-slate-500">
          {items.length} {items.length === 1 ? 'item' : 'items'} · {formatNaira(total)}
        </span>
        {!isCancelled && (
          <div className="ml-auto flex items-center gap-1">
            {isPaused ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setStatus('active')}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Play size={12} /> Resume
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setStatus('paused')}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Pause size={12} /> Pause
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => setStatus('cancelled')}
              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 size={12} /> Cancel
            </button>
          </div>
        )}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Next: {formatDate(sub.nextRunAt)}
        {sub.lastRunAt ? <> · Last spawned {formatDate(sub.lastRunAt)}</> : null}
        {sub.endsAt ? <> · Ends {formatDate(sub.endsAt)}</> : null}
      </div>
      {items.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600">
          {items.map((it, i) => (
            <li key={i} className="flex justify-between">
              <span className="truncate pr-3">
                {it.quantity} × {it.description}
              </span>
              <span className="num text-slate-500">
                {formatNaira(it.unitPriceKobo * it.quantity)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {sub.notes ? (
        <div className="mt-1 text-xs italic text-slate-500">&ldquo;{sub.notes}&rdquo;</div>
      ) : null}
    </li>
  );
}

function SubscriptionForm({
  customerId,
  onCancel,
  onCreated,
}: {
  customerId: string;
  onCancel: () => void;
  onCreated: (row: SubscriptionRow) => void;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [cadence, setCadence] =
    useState<'weekly' | 'biweekly' | 'monthly' | 'quarterly'>('monthly');
  const [startsAt, setStartsAt] = useState(todayIso);
  const [endsAt, setEndsAt] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    { description: string; quantity: string; unitPriceNaira: string }[]
  >([{ description: '', quantity: '1', unitPriceNaira: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(i: number, patch: Partial<(typeof items)[number]>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((arr) => [...arr, { description: '', quantity: '1', unitPriceNaira: '' }]);
  }

  function removeItem(i: number) {
    setItems((arr) => (arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanedItems = items
      .map((it) => ({
        description: it.description.trim(),
        quantity: Math.max(1, parseInt(it.quantity || '1', 10)),
        unitPriceKobo: Math.max(
          0,
          Math.round((parseFloat(it.unitPriceNaira || '0') || 0) * 100),
        ),
      }))
      .filter((it) => it.description.length > 0);
    if (cleanedItems.length === 0) {
      setError('Add at least one item with a description.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          cadence,
          startsAt: new Date(startsAt + 'T00:00:00').toISOString(),
          endsAt: endsAt ? new Date(endsAt + 'T00:00:00').toISOString() : null,
          notes: notes.trim() || null,
          items: cleanedItems,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: SubscriptionRow;
        error?: string;
      };
      if (!res.ok || body.success === false) {
        setError(body.error || 'Could not create subscription.');
        return;
      }
      if (body.data) onCreated(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-2 rounded-xl border border-border bg-white p-4 space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-700">
          Cadence
          <select
            className="mt-1 block w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
            value={cadence}
            onChange={(e) => setCadence(e.target.value as typeof cadence)}
          >
            {CADENCES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          First order on
          <input
            type="date"
            className="mt-1 block w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </label>
        <label className="block text-xs font-semibold text-slate-700 sm:col-span-2">
          End date (optional)
          <input
            type="date"
            className="mt-1 block w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </label>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold text-slate-700">Items</div>
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              <input
                type="text"
                placeholder="What"
                className="flex-1 rounded-md border border-border bg-white px-2 py-1.5 text-sm"
                value={it.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
              />
              <input
                type="number"
                min={1}
                placeholder="Qty"
                className="w-16 rounded-md border border-border bg-white px-2 py-1.5 text-sm"
                value={it.quantity}
                onChange={(e) => updateItem(i, { quantity: e.target.value })}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="₦"
                className="w-24 rounded-md border border-border bg-white px-2 py-1.5 text-sm"
                value={it.unitPriceNaira}
                onChange={(e) => updateItem(i, { unitPriceNaira: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={items.length === 1}
                aria-label="Remove item"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 disabled:opacity-30"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addItem}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
        >
          <Plus size={12} /> Add item
        </button>
      </div>

      <label className="block text-xs font-semibold text-slate-700">
        Notes (optional)
        <textarea
          rows={2}
          className="mt-1 block w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Visible to you on every spawned order"
        />
      </label>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Start subscription'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
