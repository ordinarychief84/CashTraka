'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, Loader2 } from 'lucide-react';

export interface AdvancedProfile {
  priceDecimals: number;
  quantityDecimals: number;
  decimalSeparator: '.' | ',';
  thousandsSeparator: ',' | '.' | ' ';
  dateFormat: 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD';
  showMondayFirst: boolean;
  updateSupplierPricesOnInvoice: boolean;
  allowEditBomsInProduction: boolean;
  includeDescriptionOnSalesLines: boolean;
  giveSupportAccess: boolean;
  enableInventorySharing: boolean;
  sendIntegrationErrorsByEmail: boolean;
  logoUrl: string | null;
}

interface Props {
  initialProfile: AdvancedProfile;
}

const selectCls =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 pr-8 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300';
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600';

export function AdvancedTab({ initialProfile }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function save(patch: Partial<AdvancedProfile>) {
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

  function generateConnectionId() {
    // Connection ID is a local random identifier surfaced for support
    // tickets. Not persisted server-side — see Rackbeat's design.
    setGeneratingId(true);
    const id = 'CT-' + Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    setConnectionId(id);
    setTimeout(() => setGeneratingId(false), 400);
  }

  return (
    <div className="space-y-4">
      {/* Decimal settings */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-2 text-[14px] font-semibold text-brand-700">Decimal settings</p>
        <div className="mb-4 rounded-lg border border-owed-200 bg-owed-50 px-3 py-2 text-[12px] text-owed-900">
          Changing the default decimal settings will interfere with accuracy when
          transferring data to other systems via integrations, because other
          systems may not be able to account for more than 2 decimals. For this
          reason, it is recommended not to change the decimal settings if
          integrations are connected.
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>
              Number of decimals for prices{' '}
              <span title="Decimals shown in invoice line totals." className="cursor-help align-middle text-slate-400">
                <HelpCircle size={11} className="inline" />
              </span>
            </label>
            <select
              value={profile.priceDecimals}
              onChange={(e) => save({ priceDecimals: Number(e.target.value) })}
              className={selectCls}
            >
              {[0, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>
              Number of decimals for quantities{' '}
              <span title="Decimals shown for stock and recipe quantities." className="cursor-help align-middle text-slate-400">
                <HelpCircle size={11} className="inline" />
              </span>
            </label>
            <select
              value={profile.quantityDecimals}
              onChange={(e) => save({ quantityDecimals: Number(e.target.value) })}
              className={selectCls}
            >
              {[0, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Separator for decimals</label>
            <select
              value={profile.decimalSeparator}
              onChange={(e) => save({ decimalSeparator: e.target.value as '.' | ',' })}
              className={selectCls}
            >
              <option value=".">Period (.)</option>
              <option value=",">Comma (,)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Separator for thousands</label>
            <select
              value={profile.thousandsSeparator}
              onChange={(e) => save({ thousandsSeparator: e.target.value as ',' | '.' | ' ' })}
              className={selectCls}
            >
              <option value=",">Comma (,)</option>
              <option value=".">Period (.)</option>
              <option value=" ">Space ( )</option>
            </select>
          </div>
        </div>
      </div>

      {/* Date format settings */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-[14px] font-semibold text-brand-700">Date format settings</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>Date format</label>
            <select
              value={profile.dateFormat}
              onChange={(e) => save({ dateFormat: e.target.value as AdvancedProfile['dateFormat'] })}
              className={selectCls}
            >
              <option value="DD-MM-YYYY">Day-Month-Year (31-12-2020)</option>
              <option value="MM-DD-YYYY">Month-Day-Year (12-31-2020)</option>
              <option value="YYYY-MM-DD">Year-Month-Day (2020-12-31)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Show monday first</label>
            <select
              value={profile.showMondayFirst ? 'YES' : 'NO'}
              onChange={(e) => save({ showMondayFirst: e.target.value === 'YES' })}
              className={selectCls}
            >
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced account settings */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="mb-4 text-[14px] font-semibold text-brand-700">Advanced account settings</p>
            <div className="space-y-3">
              <Check
                checked={profile.updateSupplierPricesOnInvoice}
                onChange={(v) => save({ updateSupplierPricesOnInvoice: v })}
                label="Update supplier prices when booking supplier invoices"
                tooltip="When you book a purchase invoice, the matching supplier's saved unit cost will be replaced with the invoice price."
              />
              <Check
                checked={profile.allowEditBomsInProduction}
                onChange={(v) => save({ allowEditBomsInProduction: v })}
                label="Allow editing BOMs in production"
                tooltip="Lets you tweak the bill of materials on an active production order without cancelling it."
              />
              <Check
                checked={profile.includeDescriptionOnSalesLines}
                onChange={(v) => save({ includeDescriptionOnSalesLines: v })}
                label="Include description on new sales lines"
                tooltip="Pre-fills the description on each new sales line with the product's saved description."
              />
              <Check
                checked={profile.giveSupportAccess}
                onChange={(v) => save({ giveSupportAccess: v })}
                label="Give Support access to agreement"
                tooltip="Lets CashTraka support log into your workspace to diagnose issues. Revoke anytime."
              />
            </div>
          </div>

          <div>
            <p className="mb-4 text-[14px] font-semibold text-brand-700">Logo</p>
            <p className="mb-3 text-[12px] text-slate-500">
              Used on e-mails and in the B2B add-on. Upload from the General &gt; Information area.
            </p>
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt="Workspace logo"
                className="max-h-24 rounded-lg border border-slate-200 bg-white p-2"
              />
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[12px] text-slate-400">
                No logo uploaded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced integration settings */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-[14px] font-semibold text-brand-700">Advanced integration settings</p>
        <div className="space-y-3">
          <Check
            checked={profile.enableInventorySharing}
            onChange={(v) => save({ enableInventorySharing: v })}
            label="Enable inventory sharing"
            tooltip="Lets connected integrations read your live stock levels for cross-channel sync."
          />
          <Check
            checked={profile.sendIntegrationErrorsByEmail}
            onChange={(v) => save({ sendIntegrationErrorsByEmail: v })}
            label="Send integration errors by e-mail"
            tooltip="Sends a daily digest of integration failures to your account e-mail."
          />
        </div>

        <p className="mt-5 text-[12px] text-slate-500">
          This will generate a so-called Connection ID, which you only have to use
          if asked. You can safely ignore this and should you click the button by
          mistake, nothing will happen.
        </p>
        <button
          type="button"
          onClick={generateConnectionId}
          disabled={generatingId}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {generatingId && <Loader2 size={12} className="animate-spin" />}
          Generate Connection ID
        </button>
        {connectionId && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <code className="font-mono text-[12px] text-slate-700">{connectionId}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(connectionId)}
              className="ml-auto text-[11px] text-brand-600 hover:underline"
            >
              Copy
            </button>
          </div>
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

function Check({
  checked,
  onChange,
  label,
  tooltip,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  tooltip?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-brand-600"
      />
      {label}
      {tooltip && (
        <span title={tooltip} className="cursor-help text-slate-400 hover:text-slate-600">
          <HelpCircle size={11} />
        </span>
      )}
    </label>
  );
}
