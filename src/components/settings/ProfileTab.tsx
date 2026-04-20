"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Building2, Check, CheckCircle2, AlertCircle, MapPin } from "lucide-react";

type Props = {
  initial: {
    name: string;
    businessName: string;
    businessAddress: string;
    whatsappNumber: string;
    receiptFooter: string;
    businessType: string;
  };
};

export function ProfileTab({ initial }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ ...initial });

  const dirty = useMemo(
    () =>
      form.name \!== initial.name ||
      form.businessName \!== initial.businessName ||
      form.businessAddress \!== initial.businessAddress ||
      form.whatsappNumber \!== initial.whatsappNumber ||
      form.receiptFooter \!== initial.receiptFooter,
    [form, initial],
  );

  useEffect(() => {
    if (\!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const whatsappPreview = useMemo(() => {
    const digits = form.whatsappNumber.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) {
      return '+234 ' + digits.slice(1, 4) + ' ' + digits.slice(4, 7) + ' ' + digits.slice(7);
    }
    if (digits.length === 13 && digits.startsWith('234')) {
      return '+234 ' + digits.slice(3, 6) + ' ' + digits.slice(6, 9) + ' ' + digits.slice(9);
    }
    return null;
  }, [form.whatsappNumber]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          businessAddress: form.businessAddress.trim(),
          whatsappNumber: form.whatsappNumber.trim(),
          receiptFooter: form.receiptFooter.trim(),
        }),
      });
      const data = await res.json();
      if (\!res.ok) throw new Error(data.error || 'Could not save');

      // Also update the user name if changed
      if (form.name \!== initial.name) {
        const nameRes = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name.trim() }),
        });
        if (\!nameRes.ok) {
          const nd = await nameRes.json().catch(() => ({}));
          throw new Error(nd.error || 'Could not update name');
        }
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setForm({ ...initial });
    setError(null);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-bold text-slate-900">Profile</h2>
        <p className="text-sm text-slate-500">
          How your business appears to{' '}
          {initial.businessType === 'property_manager' ? 'tenants' : 'customers'} on receipts and invoices.
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-5">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Your name
          </label>
          <input
            id="name"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500 focus:outline-none"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Your full name"
          />
        </div>

        {/* Business name */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Business name
          </label>
          <input
            id="businessName"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500 focus:outline-none"
            value={form.businessName}
            onChange={(e) => update('businessName', e.target.value)}
            placeholder="e.g. Ada's Fashion Hub"
          />
          <p className="mt-1 text-xs text-slate-500">Displayed on every receipt and invoice.</p>
        </div>

        {/* Business address */}
        <div>
          <label htmlFor="businessAddress" className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-1.5">
            <span>Business address</span>
            <span className="text-xs font-normal text-slate-400">Optional</span>
          </label>
          <input
            id="businessAddress"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500 focus:outline-none"
            value={form.businessAddress}
            onChange={(e) => update('businessAddress', e.target.value)}
            placeholder="e.g. 15 Admiralty Way, Lekki Phase 1, Lagos"
            maxLength={200}
          />
          <p className="mt-1 text-xs text-slate-500">Shown on receipts and invoices below your business name.</p>
        </div>

        {/* Account type badge */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Account type</label>
          <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            {form.businessType === 'property_manager' ? <Building2 size={16} /> : <Store size={16} />}
            {form.businessType === 'property_manager' ? 'Landlord' : 'Small Business'}
          </span>
        </div>

        {/* WhatsApp number */}
        <div>
          <label htmlFor="whatsappNumber" className="block text-sm font-semibold text-slate-700 mb-1.5">
            WhatsApp number
          </label>
          <input
            id="whatsappNumber"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500 focus:outline-none"
            inputMode="tel"
            maxLength={14}
            value={form.whatsappNumber}
            onChange={(e) => update('whatsappNumber', e.target.value)}
            placeholder="08012345678"
          />
          {whatsappPreview && (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-xs font-semibold text-success-700">
              <Check size={11} strokeWidth={3} />
              {whatsappPreview}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Shown on receipts so {form.businessType === 'property_manager' ? 'tenants' : 'customers'} can reach you.
          </p>
        </div>

        {/* Receipt footer */}
        <div>
          <label htmlFor="receiptFooter" className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-1.5">
            <span>Receipt footer</span>
            <span className="text-xs font-normal text-slate-400">Optional</span>
          </label>
          <textarea
            id="receiptFooter"
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500 focus:outline-none resize-y min-h-[72px]"
            value={form.receiptFooter}
            onChange={(e) => update('receiptFooter', e.target.value)}
            maxLength={200}
            placeholder="e.g. Thank you for shopping with us\!"
          />
          <p className="mt-1 text-right text-xs text-slate-400">{form.receiptFooter.length}/200</p>
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {saved && (
          <div className="flex items-start gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            Your changes are saved.
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          {dirty && (
            <button
              type="button"
              onClick={discard}
              disabled={saving}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Discard
            </button>
          )}
          <button
            type="submit"
            disabled={saving || \!dirty}
            className="rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
