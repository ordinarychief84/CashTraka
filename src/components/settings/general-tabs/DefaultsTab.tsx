'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const inputCls =
  'h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300';
const selectCls = inputCls + ' pr-8 bg-white';
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600';

export interface DefaultsProfile {
  // Item
  defaultItemUnit: string;
  defaultItemGroup: string;
  defaultLocation: string;
  defaultPrimarySupplier: string;
  suggestNextNumberItem: boolean;
  // Customer
  defaultCustomerCurrency: string;
  defaultCustomerLanguage: string;
  defaultCustomerPaymentTerm: string;
  defaultCustomerGroup: string;
  defaultCustomerLayout: string;
  defaultCustomerVatZone: string;
  defaultCustomerCountry: string;
  defaultCustomerDeliveryTerms: string;
  suggestNextNumberCustomer: boolean;
  // Supplier
  defaultSupplierCurrency: string;
  defaultSupplierLanguage: string;
  defaultSupplierPaymentTerm: string;
  defaultSupplierGroup: string;
  defaultSupplierLayout: string;
  defaultSupplierVatZone: string;
  defaultSupplierCountry: string;
  defaultSupplierDeliveryTerms: string;
  suggestNextNumberSupplier: boolean;
}

interface Props {
  initialProfile: DefaultsProfile;
}

export function DefaultsTab({ initialProfile }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function set<K extends keyof DefaultsProfile>(key: K, value: DefaultsProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function save(patch?: Partial<DefaultsProfile>) {
    setSaving(true);
    setError(null);
    try {
      const body = patch ?? profile;
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? 'Could not save.');
        return;
      }
      setSavedAt(Date.now());
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Item defaults */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-[14px] font-semibold text-brand-700">Item defaults</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Unit">
            <input
              type="text"
              value={profile.defaultItemUnit}
              onChange={(e) => set('defaultItemUnit', e.target.value)}
              onBlur={() => save()}
              placeholder="stk."
              className={inputCls}
            />
          </Field>
          <Field label="Item group">
            <input
              type="text"
              value={profile.defaultItemGroup}
              onChange={(e) => set('defaultItemGroup', e.target.value)}
              onBlur={() => save()}
              className={inputCls}
            />
          </Field>
          <Field label="Default location">
            <input
              type="text"
              value={profile.defaultLocation}
              onChange={(e) => set('defaultLocation', e.target.value)}
              onBlur={() => save()}
              placeholder="Select location"
              className={inputCls}
            />
          </Field>
          <Field label="Primary supplier">
            <input
              type="text"
              value={profile.defaultPrimarySupplier}
              onChange={(e) => set('defaultPrimarySupplier', e.target.value)}
              onBlur={() => save()}
              className={inputCls}
            />
          </Field>
          <div className="md:col-span-2 flex items-center">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700 pt-5">
              <input
                type="checkbox"
                checked={profile.suggestNextNumberItem}
                onChange={(e) => {
                  set('suggestNextNumberItem', e.target.checked);
                  save({ suggestNextNumberItem: e.target.checked });
                }}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              Suggest next number{' '}
              <span className="text-[11px] text-slate-400">(works best when not using letters)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Customer defaults */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-[14px] font-semibold text-brand-700">Customer defaults</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Currency">
            <select
              value={profile.defaultCustomerCurrency}
              onChange={(e) => { set('defaultCustomerCurrency', e.target.value); save({ defaultCustomerCurrency: e.target.value }); }}
              className={selectCls}
            >
              <option value="">—</option>
              <option>NGN</option><option>USD</option><option>EUR</option><option>GBP</option>
            </select>
          </Field>
          <Field label="Language">
            <select
              value={profile.defaultCustomerLanguage}
              onChange={(e) => { set('defaultCustomerLanguage', e.target.value); save({ defaultCustomerLanguage: e.target.value }); }}
              className={selectCls}
            >
              <option value="">—</option>
              <option>English</option><option>French</option><option>Arabic</option>
            </select>
          </Field>
          <Field label="Payment term">
            <input
              type="text"
              value={profile.defaultCustomerPaymentTerm}
              onChange={(e) => set('defaultCustomerPaymentTerm', e.target.value)}
              onBlur={() => save()}
              placeholder="Net 30"
              className={inputCls}
            />
          </Field>
          <Field label="Group">
            <input type="text" value={profile.defaultCustomerGroup} onChange={(e) => set('defaultCustomerGroup', e.target.value)} onBlur={() => save()} className={inputCls} />
          </Field>
          <Field label="Layout">
            <input type="text" value={profile.defaultCustomerLayout} onChange={(e) => set('defaultCustomerLayout', e.target.value)} onBlur={() => save()} placeholder="Standard layout" className={inputCls} />
          </Field>
          <Field label="VAT zone">
            <select
              value={profile.defaultCustomerVatZone}
              onChange={(e) => { set('defaultCustomerVatZone', e.target.value); save({ defaultCustomerVatZone: e.target.value }); }}
              className={selectCls}
            >
              <option value="">—</option>
              <option>Domestic</option><option>EU</option><option>Non-EU</option>
            </select>
          </Field>
          <Field label="Country">
            <input type="text" value={profile.defaultCustomerCountry} onChange={(e) => set('defaultCustomerCountry', e.target.value)} onBlur={() => save()} className={inputCls} />
          </Field>
          <Field label="Delivery terms">
            <input type="text" value={profile.defaultCustomerDeliveryTerms} onChange={(e) => set('defaultCustomerDeliveryTerms', e.target.value)} onBlur={() => save()} placeholder="EXW / FOB / CIF / DDP" className={inputCls} />
          </Field>
          <div className="flex items-center">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700 pt-5">
              <input
                type="checkbox"
                checked={profile.suggestNextNumberCustomer}
                onChange={(e) => {
                  set('suggestNextNumberCustomer', e.target.checked);
                  save({ suggestNextNumberCustomer: e.target.checked });
                }}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              Suggest next number
            </label>
          </div>
        </div>
      </div>

      {/* Supplier defaults */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-[14px] font-semibold text-brand-700">Supplier defaults</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Currency">
            <select
              value={profile.defaultSupplierCurrency}
              onChange={(e) => { set('defaultSupplierCurrency', e.target.value); save({ defaultSupplierCurrency: e.target.value }); }}
              className={selectCls}
            >
              <option value="">—</option>
              <option>NGN</option><option>USD</option><option>EUR</option><option>GBP</option>
            </select>
          </Field>
          <Field label="Language">
            <select
              value={profile.defaultSupplierLanguage}
              onChange={(e) => { set('defaultSupplierLanguage', e.target.value); save({ defaultSupplierLanguage: e.target.value }); }}
              className={selectCls}
            >
              <option value="">—</option>
              <option>English</option><option>French</option><option>Arabic</option>
            </select>
          </Field>
          <Field label="Payment term">
            <input type="text" value={profile.defaultSupplierPaymentTerm} onChange={(e) => set('defaultSupplierPaymentTerm', e.target.value)} onBlur={() => save()} placeholder="Net 30" className={inputCls} />
          </Field>
          <Field label="Group">
            <input type="text" value={profile.defaultSupplierGroup} onChange={(e) => set('defaultSupplierGroup', e.target.value)} onBlur={() => save()} className={inputCls} />
          </Field>
          <Field label="Layout">
            <input type="text" value={profile.defaultSupplierLayout} onChange={(e) => set('defaultSupplierLayout', e.target.value)} onBlur={() => save()} placeholder="Standard layout" className={inputCls} />
          </Field>
          <Field label="VAT zone">
            <select
              value={profile.defaultSupplierVatZone}
              onChange={(e) => { set('defaultSupplierVatZone', e.target.value); save({ defaultSupplierVatZone: e.target.value }); }}
              className={selectCls}
            >
              <option value="">—</option>
              <option>Domestic</option><option>EU</option><option>Non-EU</option>
            </select>
          </Field>
          <Field label="Country">
            <input type="text" value={profile.defaultSupplierCountry} onChange={(e) => set('defaultSupplierCountry', e.target.value)} onBlur={() => save()} className={inputCls} />
          </Field>
          <Field label="Delivery terms">
            <input type="text" value={profile.defaultSupplierDeliveryTerms} onChange={(e) => set('defaultSupplierDeliveryTerms', e.target.value)} onBlur={() => save()} placeholder="EXW / FOB / CIF / DDP" className={inputCls} />
          </Field>
          <div className="flex items-center">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700 pt-5">
              <input
                type="checkbox"
                checked={profile.suggestNextNumberSupplier}
                onChange={(e) => {
                  set('suggestNextNumberSupplier', e.target.checked);
                  save({ suggestNextNumberSupplier: e.target.checked });
                }}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              Suggest next number
            </label>
          </div>
        </div>
      </div>

      {/* Status line */}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}
