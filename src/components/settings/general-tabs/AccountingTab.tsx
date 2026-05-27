'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, Loader2 } from 'lucide-react';

export interface AccountingProfile {
  costPricePrinciple: 'AVERAGE' | 'FIFO' | 'LIFO';
  valuationAssociatedWithInvoicing: boolean;
  negativeQtyValuation: 'UNDECIDED' | 'ZERO' | 'EXPECTED_COST';
}

interface Props {
  initialProfile: AccountingProfile;
}

const inputCls =
  'h-9 w-full rounded-md border border-slate-300 px-3 pr-8 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300 bg-white';
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600';

const VALUATION_TOOLTIP =
  'If you enable this, receiving and shipping will not affect the ledger until a matching sales or purchase invoice is booked. On top of that, booking invoices without an order or purchase order attached will automatically adjust inventory as well. You must complete all open orders, purchases, invoices, receipts and shipments before you can change this setting.';

export function AccountingTab({ initialProfile }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function save(patch: Partial<AccountingProfile>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? 'Could not save.');
        return;
      }
      setSavedAt(Date.now());
      setProfile((p) => ({ ...p, ...patch }));
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  // The negative-qty radio is one-way: once a non-UNDECIDED choice is
  // persisted, the radios disable so the user can't accidentally
  // flip-flop the ledger basis.
  const isLocked = profile.negativeQtyValuation !== 'UNDECIDED';

  return (
    <div className="space-y-4">
      {/* Cost price principle */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label className={labelCls}>Cost price principle</label>
        <select
          value={profile.costPricePrinciple}
          onChange={(e) => save({ costPricePrinciple: e.target.value as AccountingProfile['costPricePrinciple'] })}
          className={`${inputCls} max-w-md`}
        >
          <option value="AVERAGE">Average cost price</option>
          <option value="FIFO">FIFO (First in, first out)</option>
          <option value="LIFO">LIFO (Last in, first out)</option>
        </select>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
          <input
            type="checkbox"
            checked={profile.valuationAssociatedWithInvoicing}
            onChange={(e) => save({ valuationAssociatedWithInvoicing: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 accent-brand-600"
          />
          Valuation associated with invoicing
          <span title={VALUATION_TOOLTIP} className="cursor-help text-slate-400 hover:text-slate-600">
            <HelpCircle size={13} />
          </span>
        </label>
      </div>

      {/* Negative quantity valuation */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className={`${labelCls} font-semibold`}>Value of negative quantity</p>
        <p className="mb-3 text-[12px] text-slate-500">
          Select how the value of negative quantities should be calculated.{' '}
          <strong>This choice cannot be reversed.</strong>
        </p>

        <div className="space-y-2">
          <Radio
            checked={profile.negativeQtyValuation === 'UNDECIDED'}
            disabled={isLocked}
            onChange={() => save({ negativeQtyValuation: 'UNDECIDED' })}
            label="Undecided (select below)"
          />
          <Radio
            checked={profile.negativeQtyValuation === 'ZERO'}
            disabled={isLocked && profile.negativeQtyValuation !== 'ZERO'}
            onChange={() => save({ negativeQtyValuation: 'ZERO' })}
            label="Negative quantity should be calculated as 0 value"
          />
          <Radio
            checked={profile.negativeQtyValuation === 'EXPECTED_COST'}
            disabled={isLocked && profile.negativeQtyValuation !== 'EXPECTED_COST'}
            onChange={() => save({ negativeQtyValuation: 'EXPECTED_COST' })}
            label={
              <>
                Negative quantity should be calculated using expected cost price{' '}
                <span className="text-[11px] text-slate-400">
                  (recommended by accounting systems like e-conomic)
                </span>
              </>
            }
          />
        </div>

        {isLocked && (
          <p className="mt-3 text-[11px] text-owed-700">
            Locked. Contact support to change the negative-quantity basis after first save.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 text-[12px]">
        {saving && (
          <span className="flex items-center gap-1 text-slate-500">
            <Loader2 size={11} className="animate-spin" /> Saving…
          </span>
        )}
        {savedAt && !saving && !error && <span className="text-success-700">Saved.</span>}
        {error && <span className="font-medium text-rose-600">{error}</span>}
      </div>
    </div>
  );
}

function Radio({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: React.ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 text-[13px] ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 accent-brand-600"
      />
      <span className="text-slate-700">{label}</span>
    </label>
  );
}
