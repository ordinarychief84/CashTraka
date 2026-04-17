'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Download, MessageSquare, ExternalLink } from 'lucide-react';

type Props = {
  initial: {
    businessName: string;
    whatsappNumber: string;
    receiptFooter: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    businessType: string;
  };
};

export function SettingsForm({ initial }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      businessName: String(form.get('businessName') || ''),
      whatsappNumber: String(form.get('whatsappNumber') || ''),
      receiptFooter: String(form.get('receiptFooter') || ''),
      bankName: String(form.get('bankName') || ''),
      bankAccountNumber: String(form.get('bankAccountNumber') || ''),
      bankAccountName: String(form.get('bankAccountName') || ''),
      businessType: String(form.get('businessType') || 'seller'),
    };
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="card space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Business
          </h2>
        </div>
        <div>
          <label htmlFor="businessName" className="label">Business name</label>
          <input
            id="businessName"
            name="businessName"
            className="input"
            defaultValue={initial.businessName}
            placeholder="e.g. Ada's Fashion Hub"
          />
        </div>
        <div>
          <label htmlFor="businessType" className="label">Business type</label>
          <select
            id="businessType"
            name="businessType"
            className="input"
            defaultValue={initial.businessType}
          >
            <option value="seller">Small Business</option>
            <option value="property_manager">Landlord</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Landlords get rent tracking, tenant management, and per-property dashboards.
          </p>
        </div>
        <div>
          <label htmlFor="whatsappNumber" className="label">Your WhatsApp number</label>
          <input
            id="whatsappNumber"
            name="whatsappNumber"
            className="input"
            inputMode="tel"
            defaultValue={initial.whatsappNumber}
            placeholder="08012345678"
          />
          <p className="mt-1 text-xs text-slate-500">
            Shown on receipts and invoices so customers can reach you.
          </p>
        </div>

        <div>
          <label htmlFor="receiptFooter" className="label">Receipt footer (optional)</label>
          <input
            id="receiptFooter"
            name="receiptFooter"
            className="input"
            defaultValue={initial.receiptFooter}
            placeholder="e.g. Thank you for shopping with us!"
          />
          <p className="mt-1 text-xs text-slate-500">
            Appears at the bottom of every shareable receipt.
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Bank details (for payment links & invoices)
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Shown to your customers on payment request links and invoices.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label htmlFor="bankName" className="label">Bank</label>
            <input
              id="bankName"
              name="bankName"
              className="input"
              defaultValue={initial.bankName}
              placeholder="e.g. GTBank, Access, Kuda"
            />
          </div>
          <div>
            <label htmlFor="bankAccountNumber" className="label">Account number</label>
            <input
              id="bankAccountNumber"
              name="bankAccountNumber"
              inputMode="numeric"
              className="input font-mono"
              defaultValue={initial.bankAccountNumber}
              placeholder="0123456789"
            />
          </div>
          <div>
            <label htmlFor="bankAccountName" className="label">Account name</label>
            <input
              id="bankAccountName"
              name="bankAccountName"
              className="input"
              defaultValue={initial.bankAccountName}
              placeholder="e.g. ADA EZE"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        {saved && (
          <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            Changes saved.
          </div>
        )}
        <button disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {/* Templates */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Messaging
        </h2>
        <Link
          href="/templates"
          className="mt-3 flex items-center justify-between rounded-lg border border-border p-3 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <MessageSquare size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">Message templates</span>
              <span className="block text-xs text-slate-500">
                Save reusable WhatsApp messages.
              </span>
            </span>
          </div>
          <ExternalLink size={16} className="text-slate-400" />
        </Link>
      </div>

      {/* Export data */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Export your data
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Your records are yours. Download them any time.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <ExportLink
            href="/api/export/payments"
            label={initial.businessType === 'property_manager' ? 'Rent payments CSV' : 'Payments CSV'}
          />
          <ExportLink
            href="/api/export/debts"
            label={initial.businessType === 'property_manager' ? 'Unpaid rent CSV' : 'Debts CSV'}
          />
          {initial.businessType === 'property_manager' ? (
            <>
              <ExportLink href="/api/export/tenants" label="Tenants CSV" />
              <ExportLink href="/api/export/properties" label="Properties CSV" />
            </>
          ) : (
            <ExportLink href="/api/export/customers" label="Customers CSV" />
          )}
          <ExportLink href="/api/export/expenses" label="Expenses CSV" />
        </div>
      </div>

      {/*
        Logout: native form POST so the browser handles the server's 303
        redirect as a real navigation. This is the only reliable way to
        land on /login with the session cookie cleared — a fetch()-based
        logout drops cookies set on intermediate redirects in some
        browsers and leaves stale client-router cache.
      */}
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="btn-secondary w-full text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={16} />
          Log out
        </button>
      </form>
    </div>
  );
}

function ExportLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
    >
      <Download size={14} />
      {label}
    </a>
  );
}
