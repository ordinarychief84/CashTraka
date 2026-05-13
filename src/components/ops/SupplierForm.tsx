'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Initial = {
  id?: string;
  name?: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

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
    const payload = {
      name: String(fd.get('name') ?? '').trim(),
      contactPerson: String(fd.get('contactPerson') ?? '').trim() || undefined,
      phone: String(fd.get('phone') ?? '').trim() || undefined,
      email: String(fd.get('email') ?? '').trim() || undefined,
      address: String(fd.get('address') ?? '').trim() || undefined,
      notes: String(fd.get('notes') ?? '').trim() || undefined,
    };
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
        setError(body?.error || 'Failed to save');
        setSubmitting(false);
        return;
      }
      router.push(isEdit ? `/suppliers/${initial!.id}` : `/suppliers/${body.data.id}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Contact person</label>
          <input
            name="contactPerson"
            defaultValue={initial?.contactPerson ?? ''}
            className="input"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Phone</label>
          <input
            name="phone"
            defaultValue={initial?.phone ?? ''}
            className="input"
            placeholder="0801…"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={initial?.email ?? ''}
            className="input"
            placeholder="orders@supplier.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Address</label>
          <input
            name="address"
            defaultValue={initial?.address ?? ''}
            className="input"
            placeholder="Optional"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ''}
          className="input"
          placeholder="Lead time, payment terms, anything else worth remembering"
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add supplier'}
        </button>
      </div>
    </form>
  );
}
