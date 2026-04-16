'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@/lib/format';

type Initial = {
  id?: string;
  name?: string;
  phone?: string;
  pin?: string;
  role?: string;
  hourlyRate?: number | null;
  dailyRate?: number | null;
};

type Props = { initial?: Initial; redirectTo?: string };

export function StaffForm({ initial, redirectTo = '/team' }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get('name') || ''),
      phone: String(form.get('phone') || ''),
      pin: String(form.get('pin') || ''),
      role: String(form.get('role') || ''),
      hourlyRate: Number(form.get('hourlyRate') || 0) || undefined,
      dailyRate: Number(form.get('dailyRate') || 0) || undefined,
    };
    try {
      const res = await fetch(
        editing ? `/api/team/${initial!.id}` : '/api/team',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">Name</label>
        <input id="name" name="name" className="input" required defaultValue={initial?.name ?? ''} placeholder="e.g. Emeka" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="phone" className="label">Phone (optional)</label>
          <input id="phone" name="phone" className="input" inputMode="tel" defaultValue={initial?.phone ?? ''} placeholder="08012345678" />
        </div>
        <div>
          <label htmlFor="pin" className="label">Clock-in PIN (optional)</label>
          <input id="pin" name="pin" className="input font-mono" inputMode="numeric" maxLength={6} defaultValue={initial?.pin ?? ''} placeholder="e.g. 1234" />
        </div>
      </div>
      <div>
        <label htmlFor="role" className="label">Role (optional)</label>
        <input id="role" name="role" className="input" defaultValue={initial?.role ?? ''} placeholder="e.g. Delivery, Packer, Cleaner" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="hourlyRate" className="label">Hourly rate (₦)</label>
          <input id="hourlyRate" name="hourlyRate" type="number" min={0} className="input" defaultValue={initial?.hourlyRate ?? ''} placeholder="e.g. 500" />
        </div>
        <div>
          <label htmlFor="dailyRate" className="label">Daily rate (₦)</label>
          <input id="dailyRate" name="dailyRate" type="number" min={0} className="input" defaultValue={initial?.dailyRate ?? ''} placeholder="e.g. 3000" />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Set either hourly or daily rate. Hours are auto-calculated on clock out. Wages feed into your Expenses report.
      </p>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add team member'}
      </button>
    </form>
  );
}
