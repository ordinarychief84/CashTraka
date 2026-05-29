'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type Initial = {
  id?: string;
  name?: string;
  phone?: string;
  active?: boolean;
  address?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  webPage?: string | null;
  taxId?: string | null;
  notes?: string | null;
};

type Props = {
  initial?: Initial;
  redirectTo?: string;
};

/** Underline-only input — matches the Prodio "New Client" reference design. */
function ULine({
  label,
  required,
  type = 'text',
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="group">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={required ? `${label}*` : label}
        required={required}
        className={cn(
          'w-full border-0 border-b bg-transparent pb-2.5 pt-1 text-sm text-slate-800 placeholder:text-slate-400',
          'focus:outline-none focus:ring-0 transition-colors',
          'border-slate-200 focus:border-brand-500',
        )}
      />
    </div>
  );
}

export function CustomerForm({ initial, redirectTo = '/customers' }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [taxId, setTaxId] = useState(initial?.taxId ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [state, setState] = useState(initial?.state ?? '');
  const [country, setCountry] = useState(initial?.country ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '');
  const [webPage, setWebPage] = useState(initial?.webPage ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError(true); return; }
    setSubmitting(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      active,
      address: address.trim() || undefined,
      email: email.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      country: country.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      webPage: webPage.trim() || undefined,
      taxId: taxId.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      const url = editing ? `/api/customers/${initial!.id}` : '/api/customers';
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      toast.success(editing ? 'Customer updated' : 'Customer saved');
      router.push(editing ? `/customers/${initial!.id}` : redirectTo);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={handleSubmit} noValidate>
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">

          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-border px-8 py-5">
            <h2 className="text-lg font-bold text-slate-900">
              {editing ? 'Edit Client' : 'New Client'}
            </h2>
            <button
              type="button"
              onClick={() => router.push(redirectTo)}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Fields ── */}
          <div className="space-y-5 px-8 py-7">

            {/* Name* */}
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(false); }}
                placeholder="Name*"
                required
                className={cn(
                  'w-full border-0 border-b bg-transparent pb-2.5 pt-1 text-sm text-slate-800 placeholder:text-slate-400',
                  'focus:outline-none focus:ring-0 transition-colors',
                  nameError ? 'border-rose-400' : 'border-slate-200 focus:border-brand-500',
                )}
              />
              {nameError && (
                <p className="mt-1 text-xs text-rose-600">Name is required.</p>
              )}
            </div>

            {/* Active toggle — two discrete state buttons */}
            <div className="flex items-center gap-4 py-1">
              <span className="text-sm font-medium text-slate-500">Active</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActive(true)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 transition',
                    active
                      ? 'border-success-500 bg-success-500 text-white'
                      : 'border-slate-200 bg-white text-slate-300 hover:border-success-300',
                  )}
                  title="Active"
                >
                  <Check size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setActive(false)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 transition',
                    !active
                      ? 'border-slate-500 bg-slate-100 text-slate-600'
                      : 'border-slate-200 bg-white text-slate-300 hover:border-slate-400',
                  )}
                  title="Inactive"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <span className="text-xs text-slate-400">
                {active ? 'Active client' : 'Inactive / archived'}
              </span>
            </div>

            {/* Address */}
            <ULine label="Address" value={address} onChange={setAddress} />

            {/* Tax ID */}
            <ULine label="Tax identification number" value={taxId} onChange={setTaxId} />

            {/* City */}
            <ULine label="City" value={city} onChange={setCity} />

            {/* State/Province */}
            <ULine label="State/Province" value={state} onChange={setState} />

            {/* Country */}
            <ULine label="Country" value={country} onChange={setCountry} />

            {/* Email */}
            <ULine label="E-mail" type="email" value={email} onChange={setEmail} />

            {/* Phone */}
            <ULine label="Phone number" type="tel" value={phone} onChange={setPhone} />

            {/* Postal code */}
            <ULine label="Postal code" value={postalCode} onChange={setPostalCode} />

            {/* Web page */}
            <ULine label="Web page" type="url" value={webPage} onChange={setWebPage} placeholder="https://" />

            {/* Comments */}
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Comments"
                rows={4}
                className={cn(
                  'w-full resize-y border-0 border-b bg-transparent pb-2.5 pt-1 text-sm text-slate-800 placeholder:text-slate-400',
                  'focus:outline-none focus:ring-0 transition-colors border-slate-200 focus:border-brand-500',
                )}
              />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between border-t border-border bg-slate-50 px-8 py-5">
            <button
              type="button"
              onClick={() => router.push(redirectTo)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-success-500 px-8 py-2.5 text-sm font-semibold text-white shadow hover:bg-success-600 disabled:opacity-60 transition"
            >
              {submitting ? 'Saving…' : 'SAVE'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
