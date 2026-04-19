'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  propertyId?: string;
  properties?: { id: string; name: string }[];
  prefill?: { name: string; phone: string };
  initial?: {
    id: string;
    propertyId: string;
    name: string;
    phone: string;
    unitLabel: string | null;
    rentAmount: number;
    rentDueDay: number;
    rentFrequency: string;
    leaseStart: string | null;
    leaseEnd: string | null;
  };
};

export function TenantForm({ propertyId, properties, prefill, initial }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = \!\!initial;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const payload = {
      propertyId: fd.get('propertyId') as string,
      name: fd.get('name') as string,
      phone: fd.get('phone') as string,
      unitLabel: fd.get('unitLabel') as string,
      rentAmount: Number(fd.get('rentAmount')),
      rentDueDay: Number(fd.get('rentDueDay') || 1),
      rentFrequency: fd.get('rentFrequency') as string,
      leaseStart: (fd.get('leaseStart') as string) || undefined,
      leaseEnd: (fd.get('leaseEnd') as string) || undefined,
    };

    const url = isEdit ? `/api/tenants/${initial.id}` : '/api/tenants';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (\!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong');
        setSaving(false);
        return;
      }

      if (isEdit) {
        router.push(`/tenants/${initial.id}`);
        router.refresh();
      } else {
        const data = await res.json();
        router.push(`/tenants/${data.id}`);
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  }

  const resolvedPropertyId = propertyId || initial?.propertyId || '';
  const defaultName = initial?.name || prefill?.name || '';
  const defaultPhone = initial?.phone || prefill?.phone || '';
  const nameReadonly = \!\!prefill && \!isEdit;
  const phoneReadonly = \!\!prefill && \!isEdit;

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-5">
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Property selector */}
      {properties && properties.length > 0 ? (
        <div>
          <label htmlFor="propertyId" className="label">Property</label>
          <select
            id="propertyId"
            name="propertyId"
            required
            defaultValue={resolvedPropertyId}
            className="input"
          >
            <option value="">Select a property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="propertyId" value={resolvedPropertyId} />
      )}

      <div>
        <label htmlFor="name" className="label">Tenant name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultName}
          readOnly={nameReadonly}
          className={`input ${nameReadonly ? 'bg-slate-50 text-slate-600' : ''}`}
          placeholder="e.g. Chinedu Okeke"
        />
      </div>

      <div>
        <label htmlFor="phone" className="label">Phone number</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          defaultValue={defaultPhone}
          readOnly={phoneReadonly}
          className={`input ${phoneReadonly ? 'bg-slate-50 text-slate-600' : ''}`}
          placeholder="e.g. 08012345678"
        />
      </div>

      <div>
        <label htmlFor="unitLabel" className="label">Unit / flat label</label>
        <input
          id="unitLabel"
          name="unitLabel"
          type="text"
          defaultValue={initial?.unitLabel || ''}
          className="input"
          placeholder="e.g. Flat 3B, Warehouse A"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="rentAmount" className="label">Rent amount (Naira)</label>
          <input
            id="rentAmount"
            name="rentAmount"
            type="number"
            required
            min={1}
            defaultValue={initial?.rentAmount || ''}
            className="input"
            placeholder="e.g. 250000"
          />
        </div>
        <div>
          <label htmlFor="rentDueDay" className="label">Due day of month</label>
          <input
            id="rentDueDay"
            name="rentDueDay"
            type="number"
            min={1}
            max={28}
            defaultValue={initial?.rentDueDay ?? 1}
            className="input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="rentFrequency" className="label">Rent frequency</label>
        <select
          id="rentFrequency"
          name="rentFrequency"
          defaultValue={initial?.rentFrequency || 'monthly'}
          className="input"
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="leaseStart" className="label">Lease start</label>
          <input
            id="leaseStart"
            name="leaseStart"
            type="date"
            defaultValue={initial?.leaseStart || ''}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="leaseEnd" className="label">Lease end</label>
          <input
            id="leaseEnd"
            name="leaseEnd"
            type="date"
            defaultValue={initial?.leaseEnd || ''}
            className="input"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add tenant'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
