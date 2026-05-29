'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Factory, AlertTriangle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProductOpt = {
  id: string;
  name: string;
  sku: string | null;
  canBeProduced: boolean;
  hasRecipe: boolean;
  defaultBatchSize: number | null;
  defaultProductionLeadTimeDays: number | null;
};

type CustomerOrderOpt = {
  id: string;
  orderNumber: string;
  customerName: string;
  productNames: string[];
};

type Line = {
  productId: string;
  quantity: number;
};

/**
 * Manual production order create form. Spawns from the /production
 * board and bypasses customer-order-spawn for things like restock runs
 * or off-cycle production for stock.
 */
export function ProductionOrderForm({
  products,
  customerOrders,
}: {
  products: ProductOpt[];
  customerOrders: CustomerOrderOpt[];
}) {
  const router = useRouter();

  // Bug fix: previously gated on `canBeProduced || hasRecipe` but the
  // canBeProduced flag has no UI to toggle, so users could never escape
  // the "No producable products" empty state. Allow every non-archived
  // product into the picker — the inline "(no recipe)" badge below stays
  // as the soft warning when an active recipe isn't attached.
  const producableProducts = useMemo(() => products, [products]);

  const [title, setTitle] = useState('');
  const [linkedOrderId, setLinkedOrderId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>(
    'NORMAL',
  );
  const [plannedStartAt, setPlannedStartAt] = useState('');
  const [plannedEndAt, setPlannedEndAt] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Line[]>([
    {
      productId: producableProducts[0]?.id ?? '',
      quantity: producableProducts[0]?.defaultBatchSize ?? 1,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickProduct(i: number, productId: string) {
    const p = producableProducts.find((x) => x.id === productId);
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i
          ? {
              productId,
              quantity: p?.defaultBatchSize ?? it.quantity,
            }
          : it,
      ),
    );
  }
  function addLine() {
    const used = new Set(items.map((i) => i.productId));
    const next = producableProducts.find((p) => !used.has(p.id));
    setItems((prev) => [
      ...prev,
      { productId: next?.id ?? '', quantity: next?.defaultBatchSize ?? 1 },
    ]);
  }
  function removeLine(i: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0 || items.every((it) => !it.productId)) {
      setError('Add at least one product.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim() || undefined,
        priority,
        plannedStartAt: plannedStartAt || undefined,
        plannedEndAt: plannedEndAt || undefined,
        notes: notes.trim() || undefined,
        items: items
          .filter((it) => it.productId)
          .map((it) => ({
            productId: it.productId,
            quantity: Math.max(1, Math.floor(it.quantity)),
          })),
      };
      const res = await fetch('/api/production-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed to create production order';
        setError(msg);
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      // If linked to a customer order, attach (best-effort).
      if (linkedOrderId) {
        await fetch(`/api/customer-orders/${linkedOrderId}/produce`, {
          method: 'POST',
        }).catch(() => null);
      }
      toast.success('Production order created');
      router.push(`/production/${body.data.order.id}`);
      router.refresh();
    } catch (e: any) {
      const msg = e?.message ?? 'Network error';
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  }

  const producableCount = producableProducts.length;
  const noProducts = producableCount === 0;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {noProducts && (
        <div className="rounded-lg border border-owed-200 bg-owed-50 p-3 text-sm text-owed-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={14} />
            No products in your catalog yet
          </div>
          <p className="mt-1 text-xs">
            Add a product first, then return here to plan a batch.
          </p>
        </div>
      )}

      <section className="card grid gap-3 p-5 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Title (optional)
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder='e.g. "Restock cream — March batch"'
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Priority
          </label>
          <div className="flex flex-wrap gap-1">
            {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition',
                  priority === p
                    ? p === 'URGENT'
                      ? 'bg-rose-600 text-white'
                      : p === 'HIGH'
                        ? 'bg-owed-500 text-white'
                        : p === 'LOW'
                          ? 'bg-slate-400 text-white'
                          : 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Planned start
          </label>
          <input
            type="date"
            value={plannedStartAt}
            onChange={(e) => setPlannedStartAt(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Planned complete
          </label>
          <input
            type="date"
            value={plannedEndAt}
            onChange={(e) => setPlannedEndAt(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Link customer order
          </label>
          <select
            value={linkedOrderId}
            onChange={(e) => setLinkedOrderId(e.target.value)}
            className="input"
          >
            <option value="">— Restock run (no order) —</option>
            {customerOrders.map((co) => (
              <option key={co.id} value={co.id}>
                {co.orderNumber} · {co.customerName}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
            <Factory size={14} /> Items
          </div>
          {(() => {
            const usedIds = new Set(items.map((it) => it.productId).filter(Boolean));
            const lastBlank = !items[items.length - 1]?.productId;
            const allUsed =
              producableProducts.length > 0 &&
              usedIds.size >= producableProducts.length;
            const addDisabled = noProducts || lastBlank || allUsed;
            return (
              <button
                type="button"
                onClick={addLine}
                disabled={addDisabled}
                title={
                  lastBlank
                    ? 'Pick a product for the current line first'
                    : allUsed
                      ? 'All products are already on this order'
                      : undefined
                }
                className={
                  addDisabled
                    ? 'inline-flex cursor-not-allowed items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-400'
                    : 'inline-flex items-center gap-1 rounded-md bg-owed-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-owed-600'
                }
              >
                <Plus size={12} /> Add product
              </button>
            );
          })()}
        </header>
        <ul className="divide-y divide-border">
          {items.map((it, i) => {
            const p = producableProducts.find((x) => x.id === it.productId);
            return (
              <li key={i} className="p-3 sm:px-4 sm:py-2.5">
                <div className="grid gap-2 sm:grid-cols-12 sm:items-center">
                  <div className="sm:col-span-7">
                    <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Product
                    </label>
                    <select
                      value={it.productId}
                      onChange={(e) => pickProduct(i, e.target.value)}
                      className="input"
                    >
                      <option value="">— Select —</option>
                      {producableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.sku ? ` · ${p.sku}` : ''}
                          {!p.hasRecipe ? ' (no recipe)' : ''}
                        </option>
                      ))}
                    </select>
                    {p && !p.hasRecipe && (
                      <p className="mt-1 text-xs text-owed-700">
                        No active recipe — materials check will skip this item.
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x, idx) =>
                            idx === i
                              ? {
                                  ...x,
                                  quantity: Math.max(1, Number(e.target.value)),
                                }
                              : x,
                          ),
                        )
                      }
                      className="input"
                    />
                    {p?.defaultBatchSize && (
                      <p className="mt-1 text-xs text-slate-500">
                        Default batch: {p.defaultBatchSize}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      disabled={items.length === 1}
                      className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                      aria-label="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-5">
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Notes
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="Mixing instructions, special handling, anything to flag"
        />
      </section>

      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar size={12} />
          We'll check material readiness as soon as you save.
        </div>
        <button type="submit" disabled={submitting || noProducts} className="btn-pill-primary">
          {submitting ? 'Creating…' : 'Create production order'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
    </form>
  );
}
