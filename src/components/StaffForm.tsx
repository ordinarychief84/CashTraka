'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@/lib/format';

/**
 * Staff profile form — add or edit a team member.
 *
 * Shaped for Nigerian SMB reality:
 *   - Pay is cycle-based (monthly / weekly / daily / per-task), not hourly.
 *   - Bank details collected so transfers can be made directly.
 *   - Next-of-kin captured — standard informal-employment practice.
 *   - PIN is optional — only matters if staff self-mark attendance on a
 *     shared device (e.g. shop till).
 */

type Initial = {
  id?: string;
  name?: string;
  phone?: string;
  pin?: string;
  role?: string;
  payType?: 'monthly' | 'weekly' | 'daily' | 'per_task';
  payAmount?: number;
  startDate?: string | Date | null;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  notes?: string;
};

type Props = { initial?: Initial; redirectTo?: string };

const PAY_TYPE_HELP: Record<string, string> = {
  monthly: 'Full monthly salary, paid once at month-end.',
  weekly: 'Weekly wage — multiplied by weeks worked.',
  daily: 'Day rate — multiplied by days present in the pay period.',
  per_task: 'Paid per trip / per garment / per delivery. Amount is logged per payment.',
};

function dateInputValue(d: string | Date | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function StaffForm({ initial, redirectTo = '/team' }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payType, setPayType] = useState<Initial['payType']>(
    initial?.payType ?? 'monthly',
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const startDate = String(form.get('startDate') || '');
    const payload = {
      name: String(form.get('name') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      pin: String(form.get('pin') || '').trim(),
      role: String(form.get('role') || '').trim(),
      payType: String(form.get('payType') || 'monthly'),
      payAmount: Number(form.get('payAmount') || 0) || 0,
      startDate: startDate ? new Date(startDate).toISOString() : '',
      bankName: String(form.get('bankName') || '').trim(),
      bankAccountNumber: String(form.get('bankAccountNumber') || '').trim(),
      bankAccountName: String(form.get('bankAccountName') || '').trim(),
      nextOfKinName: String(form.get('nextOfKinName') || '').trim(),
      nextOfKinPhone: String(form.get('nextOfKinPhone') || '').trim(),
      notes: String(form.get('notes') || '').trim(),
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

  const cycleLabel =
    payType === 'monthly'
      ? 'per month'
      : payType === 'weekly'
        ? 'per week'
        : payType === 'daily'
          ? 'per day'
          : 'per task';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Basic ── */}
      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Staff details
        </h2>
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input
            id="name"
            name="name"
            className="input"
            required
            defaultValue={initial?.name ?? ''}
            placeholder="e.g. Emeka Okafor"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="phone" className="label">Phone</label>
            <input
              id="phone"
              name="phone"
              className="input"
              inputMode="tel"
              defaultValue={initial?.phone ?? ''}
              placeholder="08012345678"
            />
          </div>
          <div>
            <label htmlFor="role" className="label">Role</label>
            <input
              id="role"
              name="role"
              className="input"
              defaultValue={initial?.role ?? ''}
              placeholder="e.g. Shop attendant"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="startDate" className="label">Start date</label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className="input"
              defaultValue={dateInputValue(initial?.startDate)}
            />
          </div>
          <div>
            <label htmlFor="pin" className="label">Attendance PIN (optional)</label>
            <input
              id="pin"
              name="pin"
              className="input font-mono"
              inputMode="numeric"
              maxLength={6}
              defaultValue={initial?.pin ?? ''}
              placeholder="e.g. 1234"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Only needed if staff self-mark attendance on a shared device.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pay ── */}
      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          How you pay them
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="payType" className="label">Pay type</label>
            <select
              id="payType"
              name="payType"
              className="input"
              value={payType}
              onChange={(e) => setPayType(e.target.value as Initial['payType'])}
            >
              <option value="monthly">Monthly salary</option>
              <option value="weekly">Weekly wage</option>
              <option value="daily">Daily wage</option>
              <option value="per_task">Per task</option>
            </select>
          </div>
          <div>
            <label htmlFor="payAmount" className="label">
              Pay amount (₦) <span className="font-normal text-slate-400">{cycleLabel}</span>
            </label>
            <input
              id="payAmount"
              name="payAmount"
              type="number"
              min={0}
              className="input"
              defaultValue={initial?.payAmount ?? ''}
              placeholder={
                payType === 'monthly'
                  ? 'e.g. 35000'
                  : payType === 'daily'
                    ? 'e.g. 3000'
                    : payType === 'weekly'
                      ? 'e.g. 15000'
                      : 'Set when you pay'
              }
              disabled={payType === 'per_task'}
            />
            {initial?.payAmount !== undefined && initial.payAmount > 0 && (
              <p className="mt-1 text-[11px] text-slate-500">
                Currently {formatNaira(initial.payAmount)} {cycleLabel}.
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-600">{PAY_TYPE_HELP[payType ?? 'monthly']}</p>
      </section>

      {/* ── Bank (for transfer) ── */}
      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Bank details
          <span className="ml-2 text-[10px] font-normal normal-case text-slate-400">
            for salary transfer
          </span>
        </h2>
        <div>
          <label htmlFor="bankName" className="label">Bank</label>
          <input
            id="bankName"
            name="bankName"
            className="input"
            defaultValue={initial?.bankName ?? ''}
            placeholder="e.g. GTBank, Access, OPay"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bankAccountNumber" className="label">Account number</label>
            <input
              id="bankAccountNumber"
              name="bankAccountNumber"
              className="input font-mono"
              inputMode="numeric"
              defaultValue={initial?.bankAccountNumber ?? ''}
              placeholder="0123456789"
            />
          </div>
          <div>
            <label htmlFor="bankAccountName" className="label">Account name</label>
            <input
              id="bankAccountName"
              name="bankAccountName"
              className="input"
              defaultValue={initial?.bankAccountName ?? ''}
              placeholder="e.g. EMEKA OKAFOR"
            />
          </div>
        </div>
      </section>

      {/* ── Next of kin ── */}
      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Next of kin
          <span className="ml-2 text-[10px] font-normal normal-case text-slate-400">
            for emergencies
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="nextOfKinName" className="label">Name</label>
            <input
              id="nextOfKinName"
              name="nextOfKinName"
              className="input"
              defaultValue={initial?.nextOfKinName ?? ''}
              placeholder="e.g. Mrs. Ngozi Okafor"
            />
          </div>
          <div>
            <label htmlFor="nextOfKinPhone" className="label">Phone</label>
            <input
              id="nextOfKinPhone"
              name="nextOfKinPhone"
              className="input"
              inputMode="tel"
              defaultValue={initial?.nextOfKinPhone ?? ''}
              placeholder="08012345678"
            />
          </div>
        </div>
      </section>

      {/* ── Notes ── */}
      <section className="card p-5">
        <label htmlFor="notes" className="label">
          Notes
          <span className="ml-2 text-[10px] font-normal normal-case text-slate-400">
            guarantor, ID card no., or anything else
          </span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="input"
          defaultValue={initial?.notes ?? ''}
          placeholder="e.g. Referred by Pastor John. NIN: 12345678901."
        />
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add team member'}
      </button>
    </form>
  );
}
