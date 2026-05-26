'use client';

import { useState, useCallback } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BoMLine {
  id: string;
  bomId: string;
  quantity: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  products: { id: string; name: string; sku: string | null }[];
  customerOrders: { id: string; orderNumber: string; customerName: string }[];
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export function CreateProductionOrderDialog({ open, onClose, products, customerOrders }: Props) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [lines, setLines] = useState<BoMLine[]>([{ id: uid(), bomId: '', quantity: '1.00' }]);
  const [employee, setEmployee] = useState('');
  const [customer, setCustomer] = useState('');
  const [layout, setLayout] = useState('');
  const [orderId, setOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, { id: uid(), bomId: '', quantity: '1.00' }]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLine = useCallback((id: string, field: 'bomId' | 'quantity', value: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!lines[0]?.bomId) return;
    setSubmitting(true);
    try {
      const body = {
        productId: lines[0].bomId,
        quantity: parseFloat(lines[0].quantity) || 1,
        plannedStartAt: startDate || undefined,
        plannedEndAt: expectedDate || undefined,
        notes: note || undefined,
        customerOrderId: orderId || undefined,
      };
      const res = await fetch('/api/production-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onClose();
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }, [lines, startDate, expectedDate, note, orderId, onClose, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog card */}
      <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-ink">Create production order</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">

          {/* Top fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">Expected date</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          {/* Bills of Materials section */}
          <div>
            <h3 className="mb-3 text-[13px] font-semibold text-brand-600">
              Bills of Materials for production
            </h3>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr_120px_60px] gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Bill of Materials</span>
                <span>Quantity</span>
                <span />
              </div>

              {/* Lines */}
              {lines.map((line) => (
                <div key={line.id} className="grid grid-cols-[1fr_120px_60px] items-center gap-2">
                  <div className="flex items-center gap-1">
                    <select
                      value={line.bomId}
                      onChange={(e) => updateLine(line.id, 'bomId', e.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="" />
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.sku ? ` (${p.sku})` : ''}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="rounded p-1 text-slate-400 hover:text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-right text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="text-[13px] font-medium text-rose-500 hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLine}
              className="mt-3 flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700"
            >
              <Plus size={13} />
              Add Bill of Materials
            </button>
          </div>

          {/* Optional info section */}
          <div>
            <h3 className="mb-3 text-[13px] font-semibold text-brand-600">Optional info</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Employee</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={employee}
                    onChange={(e) => setEmployee(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <button type="button" className="rounded p-0.5 text-slate-400 hover:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Customer</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <button type="button" className="rounded p-0.5 text-slate-400 hover:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Layout</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={layout}
                    onChange={(e) => setLayout(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <button type="button" className="rounded p-0.5 text-slate-400 hover:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">Order</label>
                <div className="flex items-center gap-1">
                  <select
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="" />
                    {customerOrders.map((co) => (
                      <option key={co.id} value={co.id}>
                        #{co.orderNumber} — {co.customerName}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="rounded p-0.5 text-slate-400 hover:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !lines[0]?.bomId}
            className="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create and share'}
          </button>
        </div>
      </div>
    </div>
  );
}
