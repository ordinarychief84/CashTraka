'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, Filter, Plus, Trash2, TriangleAlert, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type SupplierOpt = { id: string; name: string };
type MaterialOpt = {
  id: string;
  name: string;
  unit: string;
  unitCostKobo: number;
  supplierName: string | null;
};

type Line = {
  materialId: string;
  quantity: number;
  unitCostNaira: number;
  taxRate: number; // percentage, e.g. 0 or 7.5
};

function computeLine(line: Line) {
  const net = line.quantity * line.unitCostNaira;
  const tax = net * (line.taxRate / 100);
  const gross = net + tax;
  return { net, tax, gross };
}

function naira(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ColTH = ({ children }: { children: React.ReactNode }) => (
  <th className="border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap text-left">
    {children}
  </th>
);

const ColTD = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <td
    className={cn(
      'border-b border-r border-slate-100 px-2.5 py-1.5 text-[12px] text-slate-700 whitespace-nowrap',
      className,
    )}
  >
    {children}
  </td>
);

export function PurchaseOrderForm({
  suppliers,
  materials,
  initialSupplierId,
  initialMaterialId,
  initialMaterialQty,
}: {
  suppliers: SupplierOpt[];
  materials: MaterialOpt[];
  initialSupplierId?: string;
  initialMaterialId?: string;
  initialMaterialQty?: number;
}) {
  const router = useRouter();

  const [supplierId, setSupplierId] = useState<string>(initialSupplierId ?? '');
  const [supplierOrderNumber, setSupplierOrderNumber] = useState('');
  const [expectedAt, setExpectedAt] = useState('');
  const [comments, setComments] = useState('');
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [items, setItems] = useState<Line[]>(() => {
    if (initialMaterialId) {
      const m = materials.find((x) => x.id === initialMaterialId);
      return [
        {
          materialId: initialMaterialId,
          quantity: initialMaterialQty ?? 1,
          unitCostNaira: m ? m.unitCostKobo / 100 : 0,
          taxRate: 0,
        },
      ];
    }
    return [];
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickMaterial(i: number, materialId: string) {
    const m = materials.find((x) => x.id === materialId);
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i
          ? {
              ...it,
              materialId,
              unitCostNaira: m ? m.unitCostKobo / 100 : it.unitCostNaira,
            }
          : it,
      ),
    );
  }

  function addItem() {
    const usedIds = new Set(items.map((it) => it.materialId));
    const nextMat = materials.find((m) => !usedIds.has(m.id));
    setItems((prev) => [
      ...prev,
      {
        materialId: nextMat?.id ?? '',
        quantity: 1,
        unitCostNaira: nextMat ? nextMat.unitCostKobo / 100 : 0,
        taxRate: 0,
      },
    ]);
  }

  const usedIds = new Set(items.map((it) => it.materialId));
  const lastBlank = items.length > 0 && !items[items.length - 1]?.materialId;
  const allUsed =
    materials.length > 0 && usedIds.size >= materials.length && !usedIds.has('');
  const addDisabled = lastBlank || allUsed;

  const totals = items.reduce(
    (acc, it) => {
      const { net, tax, gross } = computeLine(it);
      return { net: acc.net + net, tax: acc.tax + tax, gross: acc.gross + gross };
    },
    { net: 0, tax: 0, gross: 0 },
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) {
      setError('Pick a supplier.');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one line item.');
      return;
    }
    if (new Set(items.map((i) => i.materialId)).size !== items.length) {
      setError('Each material can only appear once.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const combinedNotes = [comments.trim(), notes.trim()].filter(Boolean).join('\n');
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          expectedAt: expectedAt || undefined,
          notes: combinedNotes || undefined,
          items: items.map((it) => ({
            materialId: it.materialId,
            quantity: it.quantity,
            unitCostKobo: Math.round(it.unitCostNaira * 100),
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed';
        setError(msg);
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      toast.success('Purchase order created');
      router.push(`/purchase-orders/${body.data.id}`);
      router.refresh();
    } catch (e: any) {
      const msg = e?.message ?? 'Network error';
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {/* ── Form header ── */}
      <div className="flex items-center justify-between rounded-t-lg bg-slate-800 px-4 py-3">
        <h2 className="text-sm font-bold text-white">Add the order with the supplier</h2>
        <div className="flex items-center gap-2">
          <button type="button" className="text-slate-300 hover:text-white transition">
            <Filter size={14} />
          </button>
          <button
            type="button"
            onClick={() => router.push('/purchase-orders')}
            className="text-slate-300 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="rounded-b-lg border border-t-0 border-slate-200 bg-white">
        {/* ── Top 3 fields ── */}
        <div className="grid grid-cols-3 gap-4 border-b border-slate-200 px-4 py-4">
          {/* Supplier */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Supplier <span className="text-rose-500">*</span>
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300"
            >
              <option value="">— Select supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier order number */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Supplier order number
            </label>
            <input
              type="text"
              value={supplierOrderNumber}
              onChange={(e) => setSupplierOrderNumber(e.target.value)}
              placeholder="e.g. SO-2024-001"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300"
            />
          </div>

          {/* Expected arrival */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Expected arrival <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300"
            />
          </div>
        </div>

        {/* ── Line items table ── */}
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] border-collapse text-left">
            <thead>
              <tr>
                <ColTH>Status</ColTH>
                <ColTH>Raw material</ColTH>
                <ColTH>Default supplier</ColTH>
                <ColTH>Quantity</ColTH>
                <ColTH>Delivered qty</ColTH>
                <ColTH>Price</ColTH>
                <ColTH>Tax rate</ColTH>
                <ColTH>Currency</ColTH>
                <ColTH>Net</ColTH>
                <ColTH>Gross</ColTH>
                <ColTH>Tax</ColTH>
                <th className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <TriangleAlert size={24} className="text-slate-300" />
                      <span className="text-[13px] font-medium">No data found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((it, i) => {
                  const mat = materials.find((m) => m.id === it.materialId);
                  const { net, tax, gross } = computeLine(it);
                  return (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      {/* Status */}
                      <ColTD>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-full bg-owed-400" />
                          <span className="text-slate-500">Waiting</span>
                        </span>
                      </ColTD>

                      {/* Raw material */}
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[12px]">
                        <select
                          value={it.materialId}
                          onChange={(e) => pickMaterial(i, e.target.value)}
                          className="min-w-[140px] w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300"
                        >
                          <option value="">— Select —</option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Default supplier */}
                      <ColTD className="text-slate-500">{mat?.supplierName ?? '—'}</ColTD>

                      {/* Quantity */}
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[12px]">
                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((x, idx) =>
                                idx === i
                                  ? { ...x, quantity: Math.max(1, Number(e.target.value)) }
                                  : x,
                              ),
                            )
                          }
                          className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-center text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-300"
                        />
                      </td>

                      {/* Delivered qty — always 0 for a new PO */}
                      <ColTD className="text-center text-slate-400">0</ColTD>

                      {/* Price */}
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[12px]">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.unitCostNaira}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((x, idx) =>
                                idx === i
                                  ? { ...x, unitCostNaira: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                          className="w-24 rounded border border-slate-200 px-1.5 py-0.5 text-right text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-300"
                        />
                      </td>

                      {/* Tax rate */}
                      <td className="border-b border-r border-slate-100 px-2 py-1 text-[12px]">
                        <select
                          value={it.taxRate}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((x, idx) =>
                                idx === i ? { ...x, taxRate: Number(e.target.value) } : x,
                              ),
                            )
                          }
                          className="w-20 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-300"
                        >
                          <option value={0}>0%</option>
                          <option value={7.5}>7.5%</option>
                        </select>
                      </td>

                      {/* Currency */}
                      <ColTD className="text-slate-500">NGN</ColTD>

                      {/* Net */}
                      <ColTD className="text-right">{naira(net)}</ColTD>

                      {/* Gross */}
                      <ColTD className="text-right">{naira(gross)}</ColTD>

                      {/* Tax */}
                      <ColTD className="text-right">{naira(tax)}</ColTD>

                      {/* Actions */}
                      <td className="border-b border-slate-100 px-2.5 py-1.5 text-[12px]">
                        <button
                          type="button"
                          onClick={() =>
                            setItems((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-rose-50"
                          aria-label="Remove line"
                        >
                          <Trash2 size={13} className="text-rose-400 hover:text-rose-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer totals */}
            {items.length > 0 && (
              <tfoot>
                <tr className="bg-orange-500">
                  <td
                    colSpan={8}
                    className="px-2.5 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-white"
                  >
                    Total
                  </td>
                  <td className="px-2.5 py-2 text-right text-[12px] font-bold text-white whitespace-nowrap">
                    {naira(totals.net)}
                  </td>
                  <td className="px-2.5 py-2 text-right text-[12px] font-bold text-white whitespace-nowrap">
                    {naira(totals.gross)}
                  </td>
                  <td className="px-2.5 py-2 text-right text-[12px] font-bold text-white whitespace-nowrap">
                    {naira(totals.tax)}
                  </td>
                  <td className="px-2.5 py-2" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ── ADD ITEM button ── */}
        <div className="border-b border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={addItem}
            disabled={addDisabled}
            title={
              lastBlank
                ? 'Select a material for the current line first'
                : allUsed
                  ? 'All materials are already on this order'
                  : undefined
            }
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition',
              addDisabled
                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-orange-500 text-white hover:bg-orange-600',
            )}
          >
            <Plus size={12} /> ADD ITEM
          </button>
        </div>

        {/* ── Files section ── */}
        <div className="border-b border-slate-200">
          <div className="flex items-center justify-between bg-slate-700 px-4 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-white">
              Files
            </span>
            <button type="button" className="text-slate-300 hover:text-white transition">
              <Plus size={14} />
            </button>
          </div>
          <div className="px-4 py-3 text-[12px] text-slate-400">No files attached.</div>
        </div>

        {/* ── Images section ── */}
        <div className="border-b border-slate-200">
          <div className="flex items-center justify-between bg-slate-700 px-4 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-white">
              Images
            </span>
            <button type="button" className="text-slate-300 hover:text-white transition">
              <Plus size={14} />
            </button>
          </div>
          <div className="px-4 py-3 text-[12px] text-slate-400">No images attached.</div>
        </div>

        {/* ── Comments ── */}
        <div className="border-b border-slate-200 px-4 py-4">
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Comments
          </label>
          <textarea
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Delivery instructions, payment terms…"
            className="w-full resize-none rounded border border-slate-200 px-2 py-1.5 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300"
          />
        </div>

        {/* ── Notes (collapsible) ── */}
        <div className="border-b border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={() => setNotesOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-700 transition"
          >
            <ChevronDown
              size={12}
              className={cn('transition-transform', notesOpen && 'rotate-180')}
            />
            Notes
          </button>
          {notesOpen && (
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes…"
              className="mt-2 w-full resize-none rounded border border-slate-200 px-2 py-1.5 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300"
            />
          )}
        </div>

        {/* ── Error + Submit ── */}
        <div className="flex items-center justify-between px-4 py-4">
          {error ? (
            <p className="text-[12px] text-rose-600">{error}</p>
          ) : (
            <div />
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-6 py-2 text-xs font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'SAVE'}
          </button>
        </div>
      </div>
    </form>
  );
}
