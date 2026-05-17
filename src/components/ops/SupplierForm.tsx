'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Initial = {
  id?: string;
  name?: string;
  contactPerson?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  supplierCategory?: string | null;
  materialsSupplied?: string | null;
  paymentTerms?: string | null;
  leadTimeDays?: number | null;
  minimumOrderQuantity?: number | null;
  deliveryMethod?: string | null;
  status?: string | null;
  notes?: string | null;
};

const DELIVERY_METHODS = [
  { value: '', label: '—' },
  { value: 'DELIVERY', label: 'Supplier delivers' },
  { value: 'PICKUP', label: 'We pick up' },
  { value: 'THIRD_PARTY', label: 'Third-party logistics' },
];

const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'BLACKLISTED', label: 'Blacklisted' },
];

export function SupplierForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial?.id);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: String(fd.get('name') ?? '').trim(),
      contactPerson: String(fd.get('contactPerson') ?? '').trim() || undefined,
      phone: String(fd.get('phone') ?? '').trim() || undefined,
      whatsappNumber: String(fd.get('whatsappNumber') ?? '').trim() || undefined,
      email: String(fd.get('email') ?? '').trim() || undefined,
      address: String(fd.get('address') ?? '').trim() || undefined,
      supplierCategory: String(fd.get('supplierCategory') ?? '').trim() || undefined,
      materialsSupplied: String(fd.get('materialsSupplied') ?? '').trim() || undefined,
      paymentTerms: String(fd.get('paymentTerms') ?? '').trim() || undefined,
      deliveryMethod: String(fd.get('deliveryMethod') ?? '').trim() || undefined,
      status: String(fd.get('status') ?? '').trim() || undefined,
      notes: String(fd.get('notes') ?? '').trim() || undefined,
    };
    const leadTime = String(fd.get('leadTimeDays') ?? '').trim();
    if (leadTime) payload.leadTimeDays = Number(leadTime);
    const moq = String(fd.get('minimumOrderQuantity') ?? '').trim();
    if (moq) payload.minimumOrderQuantity = Number(moq);

    try {
      const res = await fetch(
        isEdit ? `/api/suppliers/${initial!.id}` : '/api/suppliers',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed to save';
        setError(msg);
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      toast.success(isEdit ? 'Supplier updated' : 'Supplier saved');
      router.push(
        isEdit ? `/suppliers/${initial!.id}` : `/suppliers/${body.data.id}`,
      );
      router.refresh();
    } catch (e: any) {
      const msg = e?.message ?? 'Network error';
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Identity */}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Supplier name <span className="text-rose-500">*</span>
          </label>
          <input
            name="name"
            required
            defaultValue={initial?.name ?? ''}
            className="input"
            placeholder="e.g. Lagos Packaging Ltd"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Category
            </label>
            <input
              name="supplierCategory"
              defaultValue={initial?.supplierCategory ?? ''}
              className="input"
              placeholder="e.g. Packaging, Ingredients"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Status
            </label>
            <select
              name="status"
              defaultValue={initial?.status ?? 'ACTIVE'}
              className="input"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Contact
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Contact person
            </label>
            <input
              name="contactPerson"
              defaultValue={initial?.contactPerson ?? ''}
              className="input"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Phone</label>
            <input
              name="phone"
              defaultValue={initial?.phone ?? ''}
              className="input"
              placeholder="0801…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              WhatsApp number
            </label>
            <input
              name="whatsappNumber"
              defaultValue={initial?.whatsappNumber ?? ''}
              className="input"
              placeholder="Falls back to phone when empty"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={initial?.email ?? ''}
              className="input"
              placeholder="orders@supplier.com"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Address</label>
            <input
              name="address"
              defaultValue={initial?.address ?? ''}
              className="input"
              placeholder="Optional"
            />
          </div>
        </div>
      </div>

      {/* Commercial terms */}
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Commercial terms
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Payment terms
            </label>
            <input
              name="paymentTerms"
              defaultValue={initial?.paymentTerms ?? ''}
              className="input"
              placeholder='e.g. "Net 30", "COD", "50% deposit"'
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Lead time (days)
            </label>
            <input
              name="leadTimeDays"
              type="number"
              min={0}
              defaultValue={initial?.leadTimeDays ?? ''}
              className="input"
              placeholder="Average days PO sent → received"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Minimum order quantity
            </label>
            <input
              name="minimumOrderQuantity"
              type="number"
              min={0}
              defaultValue={initial?.minimumOrderQuantity ?? ''}
              className="input"
              placeholder="Total units across PO"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Delivery method
            </label>
            <select
              name="deliveryMethod"
              defaultValue={initial?.deliveryMethod ?? ''}
              className="input"
            >
              {DELIVERY_METHODS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Materials supplied
        </label>
        <textarea
          name="materialsSupplied"
          rows={2}
          defaultValue={initial?.materialsSupplied ?? ''}
          className="input"
          placeholder="Free-text list — what this supplier provides"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Notes
        </label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ''}
          className="input"
          placeholder="Internal notes — quality, history, anything else worth remembering"
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting
            ? 'Saving…'
            : isEdit
              ? 'Save changes'
              : 'Add supplier'}
        </button>
      </div>
    </form>
  );
}
