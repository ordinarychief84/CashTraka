'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut,
  Download,
  MessageSquare,
  ExternalLink,
  Store,
  Building2,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react';

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

/**
 * /settings main form.
 *
 * Reorganised into clearly-labelled sections, each with an icon + headline +
 * description — so the page reads as a real settings surface rather than a
 * stack of identical-looking grey cards. The page is also tightened on
 * validation: WhatsApp shows a live formatted preview, account numbers are
 * capped to 10 digits (NUBAN), and account names are force-uppercased.
 *
 * The success banner auto-dismisses after 3s.
 */
export function SettingsForm({ initial }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controlled values so we can show validation hints + derive dirty state.
  const [form, setForm] = useState({
    businessName: initial.businessName,
    businessType: initial.businessType,
    whatsappNumber: initial.whatsappNumber,
    receiptFooter: initial.receiptFooter,
    bankName: initial.bankName,
    bankAccountNumber: initial.bankAccountNumber,
    bankAccountName: initial.bankAccountName,
  });

  const dirty = useMemo(
    () =>
      form.businessName !== initial.businessName ||
      form.whatsappNumber !== initial.whatsappNumber ||
      form.receiptFooter !== initial.receiptFooter ||
      form.bankName !== initial.bankName ||
      form.bankAccountNumber !== initial.bankAccountNumber ||
      form.bankAccountName !== initial.bankAccountName,
    [form, initial],
  );

  // Auto-dismiss the "Saved" banner.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /**
   * Nigerian MSISDN sniff — accept 0XXXXXXXXXX (11 digits) or +234 / 234 + 10.
   * Return a formatted preview or null.
   */
  const whatsappPreview = useMemo(() => {
    const digits = form.whatsappNumber.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) {
      return `+234 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    if (digits.length === 13 && digits.startsWith('234')) {
      return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    }
    return null;
  }, [form.whatsappNumber]);

  const accountNumberValid =
    form.bankAccountNumber.length === 0 || form.bankAccountNumber.length === 10;

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!accountNumberValid) {
      setError('Account number should be 10 digits.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          // Normalise before sending.
          bankAccountName: form.bankAccountName.toUpperCase().trim(),
          bankAccountNumber: form.bankAccountNumber.trim(),
          whatsappNumber: form.whatsappNumber.trim(),
        }),
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

  function discard() {
    setForm({
      businessName: initial.businessName,
      businessType: initial.businessType,
      whatsappNumber: initial.whatsappNumber,
      receiptFooter: initial.receiptFooter,
      bankName: initial.bankName,
      bankAccountNumber: initial.bankAccountNumber,
      bankAccountName: initial.bankAccountName,
    });
    setError(null);
    setSaved(false);
  }

  return (
    <div className="space-y-5">
      {/* ─────────── Business profile ─────────── */}
      <Section
        icon={form.businessType === 'property_manager' ? Building2 : Store}
        title="Business profile"
        description={
          form.businessType === 'property_manager'
            ? 'How your business appears to tenants on rent receipts and invoices.'
            : 'How your business appears to customers on receipts, invoices and messages.'
        }
      >
        <form onSubmit={handleSave} className="space-y-5">
          <Field
            id="businessName"
            label="Business name"
            hint="Displayed on every receipt and invoice."
          >
            <input
              id="businessName"
              name="businessName"
              className="input"
              value={form.businessName}
              onChange={(e) => update('businessName', e.target.value)}
              placeholder="e.g. Ada's Fashion Hub"
            />
          </Field>

          {/* Read-only mode badge */}
          <div>
            <label className="text-sm font-semibold text-ink">Account type</label>
            <div className="mt-1.5">
              <span
                className={
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ' +
                  (form.businessType === 'property_manager'
                    ? 'border-brand-200 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700')
                }
              >
                {form.businessType === 'property_manager' ? (
                  <Building2 size={16} />
                ) : (
                  <Store size={16} />
                )}
                {form.businessType === 'property_manager' ? 'Landlord' : 'Small Business'}
              </span>
            </div>
          </div>

          <Field
            id="whatsappNumber"
            label="WhatsApp number"
            hint={
              form.businessType === 'property_manager'
                ? 'Shown on rent receipts so tenants can reach you.'
                : 'Shown on receipts so customers can reach you.'
            }
          >
            <input
              id="whatsappNumber"
              name="whatsappNumber"
              className="input"
              inputMode="tel"
              maxLength={14}
              value={form.whatsappNumber}
              onChange={(e) => update('whatsappNumber', e.target.value)}
              placeholder="08012345678"
            />
            {whatsappPreview && (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-[11px] font-semibold text-success-700">
                <Check size={11} strokeWidth={3} />
                {whatsappPreview}
              </p>
            )}
          </Field>

          <Field
            id="receiptFooter"
            label="Receipt footer"
            optional
            hint={
              form.businessType === 'property_manager'
                ? 'Appears at the bottom of every rent receipt. Great for a note about payment terms.'
                : 'Appears at the bottom of every receipt. Great for a thank-you note or return policy.'
            }
          >
            <textarea
              id="receiptFooter"
              name="receiptFooter"
              rows={2}
              className="input min-h-[72px] resize-y"
              value={form.receiptFooter}
              onChange={(e) => update('receiptFooter', e.target.value)}
              maxLength={200}
              placeholder="e.g. Thank you for shopping with us! No returns after 7 days."
            />
            <p className="mt-1 text-right text-[10px] text-slate-400">
              {form.receiptFooter.length}/200
            </p>
          </Field>

          {/* ─────────── Bank details (inline sub-section) ─────────── */}
          <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
            <div className="mb-3 flex items-start gap-2">
              <Landmark size={16} className="mt-0.5 text-brand-600" />
              <div>
                <h3 className="text-sm font-bold text-ink">Payment details</h3>
                <p className="text-xs text-slate-600">
                  {form.businessType === 'property_manager'
                    ? 'Shown on rent invoices so tenants can pay into your account.'
                    : 'Shown on your payment links and invoices so customers can pay into your account.'}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Field id="bankName" label="Bank" compact>
                <input
                  id="bankName"
                  name="bankName"
                  className="input"
                  value={form.bankName}
                  onChange={(e) => update('bankName', e.target.value)}
                  placeholder="e.g. GTBank, Access, Kuda"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  id="bankAccountNumber"
                  label="Account number"
                  compact
                  error={!accountNumberValid ? 'Must be 10 digits' : undefined}
                >
                  <input
                    id="bankAccountNumber"
                    name="bankAccountNumber"
                    inputMode="numeric"
                    className="input num tracking-wider"
                    maxLength={10}
                    value={form.bankAccountNumber}
                    onChange={(e) =>
                      // Digits only.
                      update(
                        'bankAccountNumber',
                        e.target.value.replace(/\D/g, '').slice(0, 10),
                      )
                    }
                    placeholder="0123456789"
                  />
                </Field>
                <Field id="bankAccountName" label="Account name" compact>
                  <input
                    id="bankAccountName"
                    name="bankAccountName"
                    className="input uppercase"
                    value={form.bankAccountName}
                    onChange={(e) =>
                      update('bankAccountName', e.target.value.toUpperCase())
                    }
                    placeholder="ADA EZE"
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {saved && (
            <div className="flex items-start gap-2 rounded-lg bg-success-100 px-3 py-2 text-sm text-success-700">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              <span>Your changes are saved.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            {dirty && (
              <button
                type="button"
                onClick={discard}
                disabled={saving}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink"
              >
                Discard
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !dirty}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Section>

      {/* ─────────── Tools ─────────── */}
      <Section
        icon={Download}
        title="Your data"
        description="Your records are yours. Download any time as CSV for backup or your accountant."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <ExportLink
            href="/api/export/payments"
            label={
              form.businessType === 'property_manager' ? 'Rent payments' : 'Payments'
            }
          />
          <ExportLink
            href="/api/export/debts"
            label={
              form.businessType === 'property_manager' ? 'Unpaid rent' : 'Debts'
            }
          />
          {form.businessType === 'property_manager' ? (
            <>
              <ExportLink href="/api/export/tenants" label="Tenants" />
              <ExportLink href="/api/export/properties" label="Properties" />
            </>
          ) : (
            <ExportLink href="/api/export/customers" label="Customers" />
          )}
          <ExportLink href="/api/export/expenses" label="Expenses" />
        </div>
      </Section>

      {/* ─────────── Messaging shortcut ─────────── */}
      <Section
        icon={MessageSquare}
        title="Saved messages"
        description={
          form.businessType === 'property_manager'
            ? 'Re-use templates when you remind tenants about rent on WhatsApp.'
            : 'Re-use templates when you follow up on WhatsApp — so you don\'t type the same message twice.'
        }
      >
        <Link
          href="/templates"
          className="group flex items-center justify-between rounded-lg border border-border bg-white p-3 hover:border-brand-400 hover:bg-brand-50/40"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <MessageSquare size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">
                Manage message templates
              </span>
              <span className="block text-xs text-slate-500">
                Add, edit or delete saved WhatsApp messages.
              </span>
            </span>
          </span>
          <ExternalLink
            size={16}
            className="text-slate-400 transition group-hover:text-brand-600"
          />
        </Link>
      </Section>

      {/* ─────────── Account ─────────── */}
      <Section
        icon={LogOut}
        title="Account"
        description="Sign out of CashTraka on this device."
        tone="subtle"
      >
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={15} />
            Log out
          </button>
        </form>
      </Section>
    </div>
  );
}

/* ─────────────────── Building blocks ─────────────────── */

function Section({
  icon: Icon,
  title,
  description,
  children,
  tone = 'default',
}: {
  icon: typeof Store;
  title: string;
  description: string;
  children: React.ReactNode;
  tone?: 'default' | 'subtle';
}) {
  return (
    <section className="card overflow-hidden p-5 md:p-6">
      <header className="mb-5 flex items-start gap-3">
        <span
          className={
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' +
            (tone === 'subtle'
              ? 'bg-slate-100 text-slate-600'
              : 'bg-brand-50 text-brand-600')
          }
        >
          <Icon size={18} />
        </span>
        <div>
          <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-600 md:text-sm">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  optional,
  compact,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  compact?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-center justify-between text-sm font-semibold text-ink"
      >
        <span>{label}</span>
        {optional && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Optional
          </span>
        )}
      </label>
      <div className={compact ? 'mt-1' : 'mt-1.5'}>{children}</div>
      {error ? (
        <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function SolutionChoice({
  value,
  current,
  onPick,
  icon: Icon,
  label,
  sub,
}: {
  value: string;
  current: string;
  onPick: () => void;
  icon: typeof Store;
  label: string;
  sub: string;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={onPick}
      className={
        'flex items-start gap-2.5 rounded-lg border p-3 text-left transition ' +
        (active
          ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500'
          : 'border-border bg-white hover:border-brand-300 hover:bg-brand-50/20')
      }
    >
      <span
        className={
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' +
          (active ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500')
        }
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block text-xs text-slate-500">{sub}</span>
      </span>
      <span
        className={
          'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ' +
          (active ? 'border-brand-500 bg-brand-500' : 'border-slate-300')
        }
        aria-hidden
      >
        {active && <Check size={10} strokeWidth={4} className="text-white" />}
      </span>
    </button>
  );
}

function ExportLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700"
    >
      <span>{label} CSV</span>
      <Download size={14} className="text-slate-400 group-hover:text-brand-600" />
    </a>
  );
}
