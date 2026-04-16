'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  initial?: {
    id: string;
    name: string;
    address: string | null;
    unitCount: number;
    note: string | null;
  };
};

export function PropertyForm({ initial }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initial;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get('name') as string,
      address: fd.get('address') as string,
      unitCount: Number(fd.get('unitCount') || 0),
      note: fd.get('note') as string,
    };

    const url = isEdit ? `/api/properties/${initial.id}` : '/api/properties';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong');
        setSaving(false);
        return;
      }

      if (isEdit) {
        router.push(`/properties/${initial.id}`);
        router.refresh();
      } else {
        const data = await res.json();
        router.push(`/properties/${data.id}`);
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-5">
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label htmlFor="name" className="label">Property name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initial?.name || ''}
          className="input"
          placeholder="e.g. Sunrise Estate"
        />
      </div>

      <div>
        <label htmlFor="address" className="label">Address</label>
        <input
          id="address"
          name="address"
          type="text"
          defaultValue={initial?.address || ''}
          className="input"
          placeholder="e.g. 12 Admiralty Way, Lekki"
        />
      </div>

      <div>
        <label htmlFor="unitCount" className="label">Number of units</label>
        <input
          id="unitCount"
          name="unitCount"
          type="number"
          min={0}
          defaultValue={initial?.unitCount ?? 0}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="note" className="label">Note (optional)</label>
        <textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={initial?.note || ''}
          className="input"
          placeholder="Any extra info about this property"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create property'}
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
