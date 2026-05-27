'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Trash2, Star, MoreHorizontal, Loader2 } from 'lucide-react';

// ── Types matching the server-side shapes ───────────────────────

export interface GeneralProfile {
  // Numbers
  generalStartingNumber: number;
  nextOrderNumber: number;          // Sales orders
  nextInvoiceNumber: number;        // Sales invoices
  nextOfferNumber: number;          // Sales offers
  nextPurchaseOrderNumber: number;  // Purchase orders
  nextPurchaseInvoiceNumber: number;
  nextPurchaseReceiptNumber: number;

  // Information
  businessName: string;
  vatNumber: string;
  eanNumber: string;
  businessAddress: string; // street
  street2: string;
  postcode: string;
  city: string;
  country: string;
  phoneNumber: string;
  email: string;
  website: string;
}

export interface AddressRow {
  id: string;
  name: string;
  street: string | null;
  street2: string | null;
  postcode: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  attention: string | null;
  location: string | null;
}

export interface BankRow {
  id: string;
  name: string;
  bankName: string | null;
  registrationNo: string | null;
  accountNumber: string | null;
  iban: string | null;
  swift: string | null;
  fiNumber: string | null;
  isDefault: boolean;
}

interface Props {
  initialProfile: GeneralProfile;
  initialAddresses: AddressRow[];
  initialBanks: BankRow[];
}

type Tab = 'numbers' | 'information' | 'addresses' | 'banking';

const TABS: { id: Tab; label: string }[] = [
  { id: 'numbers',     label: 'Numbers' },
  { id: 'information', label: 'Information' },
  { id: 'addresses',   label: 'Addresses' },
  { id: 'banking',     label: 'Banking' },
];

// Shared input class so every form field on every tab looks the same.
const inputCls =
  'h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300';
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600';
const sectionCardCls = 'rounded-xl border border-slate-200 bg-white p-5';
const sectionHeadCls = 'mb-4 text-[14px] font-semibold text-brand-700';

export function GeneralSettingsTabs({ initialProfile, initialAddresses, initialBanks }: Props) {
  const [tab, setTab] = useState<Tab>('numbers');

  return (
    <div>
      {/* Tab strip */}
      <div className="mb-5 flex gap-1 border-b border-slate-200 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${
              tab === t.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'numbers' && <NumbersTab initialProfile={initialProfile} />}
      {tab === 'information' && <InformationTab initialProfile={initialProfile} />}
      {tab === 'addresses' && <AddressesTab initialRows={initialAddresses} />}
      {tab === 'banking' && <BankingTab initialRows={initialBanks} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Numbers tab — read-only next-numbers + editable starting anchor
// ────────────────────────────────────────────────────────────────

function NumbersTab({ initialProfile }: { initialProfile: GeneralProfile }) {
  const router = useRouter();
  const [startingNumber, setStartingNumber] = useState(String(initialProfile.generalStartingNumber));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const n = Number(startingNumber);
      if (!Number.isFinite(n) || n < 1) {
        setError('Starting number must be a positive integer.');
        return;
      }
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generalStartingNumber: n }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Could not save.');
        return;
      }
      setSavedAt(Date.now());
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={sectionCardCls}>
      <div className="mb-5">
        <label className={labelCls}>General starting number</label>
        <input
          type="number"
          min="1"
          value={startingNumber}
          onChange={(e) => setStartingNumber(e.target.value)}
          onBlur={save}
          className={`${inputCls} max-w-xs`}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Used as the seed for orders, invoices, offers and purchase documents
          when their tables are empty.
        </p>
        {error && <p className="mt-1 text-[12px] font-medium text-rose-600">{error}</p>}
        {savedAt && !error && (
          <p className="mt-1 text-[12px] text-success-700">Saved.</p>
        )}
        {saving && (
          <p className="mt-1 flex items-center gap-1 text-[12px] text-slate-500">
            <Loader2 size={11} className="animate-spin" /> Saving…
          </p>
        )}
      </div>

      <div className="mb-2 mt-6 text-[14px] font-semibold text-brand-700">Purchasing</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <NumberPreview label="Next order number"   value={initialProfile.nextPurchaseOrderNumber} />
        <NumberPreview label="Next invoice number" value={initialProfile.nextPurchaseInvoiceNumber} />
        <NumberPreview label="Next receipt number" value={initialProfile.nextPurchaseReceiptNumber} />
      </div>

      <div className="mb-2 mt-6 text-[14px] font-semibold text-brand-700">Sales</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <NumberPreview label="Next order number"   value={initialProfile.nextOrderNumber} />
        <NumberPreview label="Next invoice number" value={initialProfile.nextInvoiceNumber} />
        <NumberPreview label="Next offer number"   value={initialProfile.nextOfferNumber} />
      </div>

      <p className="mt-6 text-[11px] text-slate-400">
        Next-number values are computed from your existing records and update
        automatically as you create new documents. They're shown here for
        reference.
      </p>
    </div>
  );
}

function NumberPreview({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="text"
        readOnly
        value={value}
        className={`${inputCls} cursor-not-allowed bg-slate-50`}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Information tab — company profile + contact information
// ────────────────────────────────────────────────────────────────

function InformationTab({ initialProfile }: { initialProfile: GeneralProfile }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  function set<K extends keyof GeneralProfile>(key: K, value: GeneralProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: profile.businessName,
          vatNumber: profile.vatNumber,
          eanNumber: profile.eanNumber,
          businessAddress: profile.businessAddress,
          street2: profile.street2,
          postcode: profile.postcode,
          city: profile.city,
          country: profile.country,
          phoneNumber: profile.phoneNumber,
          website: profile.website,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Could not save.');
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
      {/* Your company */}
      <div className={sectionCardCls}>
        <p className={sectionHeadCls}>Your company</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Name">
            <input
              type="text"
              value={profile.businessName}
              onChange={(e) => set('businessName', e.target.value)}
              onBlur={save}
              className={inputCls}
            />
          </Field>
          <Field label="VAT no.">
            <input
              type="text"
              value={profile.vatNumber}
              onChange={(e) => set('vatNumber', e.target.value)}
              onBlur={save}
              className={inputCls}
            />
          </Field>
          <Field label="EAN number">
            <input
              type="text"
              value={profile.eanNumber}
              onChange={(e) => set('eanNumber', e.target.value)}
              onBlur={save}
              className={inputCls}
            />
          </Field>
          <Field label="Street">
            <input
              type="text"
              value={profile.businessAddress}
              onChange={(e) => set('businessAddress', e.target.value)}
              onBlur={save}
              className={inputCls}
            />
          </Field>
          <Field label="Street 2">
            <input
              type="text"
              value={profile.street2}
              onChange={(e) => set('street2', e.target.value)}
              onBlur={save}
              className={inputCls}
            />
          </Field>
          <Field label="Postcode">
            <input
              type="text"
              value={profile.postcode}
              onChange={(e) => set('postcode', e.target.value)}
              onBlur={save}
              className={inputCls}
            />
          </Field>
          <Field label="City">
            <input
              type="text"
              value={profile.city}
              onChange={(e) => set('city', e.target.value)}
              onBlur={save}
              className={inputCls}
            />
          </Field>
          <Field label="Country">
            <input
              type="text"
              value={profile.country}
              onChange={(e) => set('country', e.target.value)}
              onBlur={save}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Contact */}
      <div className={sectionCardCls}>
        <p className={sectionHeadCls}>Contact information</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Phone">
            <input
              type="tel"
              value={profile.phoneNumber}
              onChange={(e) => set('phoneNumber', e.target.value)}
              onBlur={save}
              className={inputCls}
            />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              readOnly
              value={profile.email}
              className={`${inputCls} cursor-not-allowed bg-slate-50`}
              title="Change your sign-in e-mail under your profile."
            />
          </Field>
          <Field label="Website">
            <input
              type="url"
              value={profile.website}
              onChange={(e) => set('website', e.target.value)}
              onBlur={save}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Status line */}
      <div className="flex items-center gap-2 text-[12px]">
        {saving && (
          <span className="flex items-center gap-1 text-slate-500">
            <Loader2 size={11} className="animate-spin" /> Saving…
          </span>
        )}
        {savedAt && !saving && !error && (
          <span className="text-success-700">Saved.</span>
        )}
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

// ────────────────────────────────────────────────────────────────
// Addresses tab — list + create modal
// ────────────────────────────────────────────────────────────────

function AddressesTab({ initialRows }: { initialRows: AddressRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<AddressRow[]>(initialRows);
  const [openCreate, setOpenCreate] = useState(false);
  const [, startTransition] = useTransition();

  async function handleDelete(id: string) {
    if (!confirm('Delete this address?')) return;
    const res = await fetch(`/api/settings/addresses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      startTransition(() => router.refresh());
    }
  }

  function onCreated(row: AddressRow) {
    setRows((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    setOpenCreate(false);
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={13} />
          Create new
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13px] text-slate-500">
            No addresses yet. Create one to use as a billing or pickup address on
            invoices and orders.
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">City</th>
                <th className="px-4 py-2.5">Country</th>
                <th className="px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5">E-mail</th>
                <th className="w-12 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.city ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.country ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.email ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      title="Delete address"
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openCreate && (
        <CreateAddressModal
          onClose={() => setOpenCreate(false)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}

function CreateAddressModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (row: AddressRow) => void;
}) {
  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [street2, setStreet2] = useState('');
  const [postcode, setPostcode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [attention, setAttention] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          street: street.trim() || null,
          street2: street2.trim() || null,
          postcode: postcode.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          attention: attention.trim() || null,
          location: location.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error ?? 'Could not create address.');
        return;
      }
      onCreated(json.data.address);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-3 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h3 className="text-[15px] font-semibold text-slate-900">Create a new address</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <Field label="Name">
            <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Street">
              <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Street 2">
              <input type="text" value={street2} onChange={(e) => setStreet2(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Postcode">
              <input type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)} className={inputCls} />
            </Field>
            <Field label="City">
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Country">
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Attention">
              <input type="text" value={attention} onChange={(e) => setAttention(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </Field>
            <Field label="E-mail">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Location">
                <input
                  type="text"
                  placeholder="Select location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            Create address
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Banking tab — list + create modal
// ────────────────────────────────────────────────────────────────

function BankingTab({ initialRows }: { initialRows: BankRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<BankRow[]>(initialRows);
  const [openCreate, setOpenCreate] = useState(false);
  const [, startTransition] = useTransition();

  async function handleDelete(id: string) {
    if (!confirm('Delete this bank account?')) return;
    const res = await fetch(`/api/settings/bank-accounts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      startTransition(() => router.refresh());
    }
  }

  async function setAsDefault(id: string) {
    const res = await fetch(`/api/settings/bank-accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      setRows((prev) => prev.map((r) => ({ ...r, isDefault: r.id === id })));
      startTransition(() => router.refresh());
    }
  }

  function onCreated(row: BankRow) {
    setRows((prev) => {
      // If new row is default, unflag others locally too.
      const next = row.isDefault ? prev.map((r) => ({ ...r, isDefault: false })) : [...prev];
      next.push(row);
      return next.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || a.name.localeCompare(b.name));
    });
    setOpenCreate(false);
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={13} />
          Create new
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13px] text-slate-500">
            No bank accounts yet. Add one to print payment instructions on
            invoices and receipts.
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Name of bank</th>
                <th className="px-4 py-2.5">Account no.</th>
                <th className="px-4 py-2.5">IBAN</th>
                <th className="px-4 py-2.5">FI number</th>
                <th className="px-4 py-2.5">Default</th>
                <th className="w-12 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.bankName ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-slate-600">
                    {r.accountNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-slate-600">{r.iban ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.fiNumber ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                        <Star size={10} fill="currentColor" />
                        Default
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAsDefault(r.id)}
                        className="text-[11px] text-slate-400 hover:text-brand-600 hover:underline"
                      >
                        Set as default
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      title="Delete bank account"
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openCreate && <CreateBankModal onClose={() => setOpenCreate(false)} onCreated={onCreated} />}
    </div>
  );
}

function CreateBankModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (row: BankRow) => void;
}) {
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [swift, setSwift] = useState('');
  const [fiNumber, setFiNumber] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          bankName: bankName.trim() || null,
          registrationNo: registrationNo.trim() || null,
          accountNumber: accountNumber.trim() || null,
          iban: iban.trim() || null,
          swift: swift.trim() || null,
          fiNumber: fiNumber.trim() || null,
          isDefault,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error ?? 'Could not create bank account.');
        return;
      }
      onCreated(json.data.bankAccount);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-3 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h3 className="text-[15px] font-semibold text-slate-900">Create bank account</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <Field label="Name">
            <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Name of bank">
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reg. No.">
              <input type="text" value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Account no.">
              <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inputCls} />
            </Field>
            <Field label="IBAN">
              <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} className={inputCls} />
            </Field>
            <Field label="SWIFT">
              <input type="text" value={swift} onChange={(e) => setSwift(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="FI number">
            <input type="text" value={fiNumber} onChange={(e) => setFiNumber(e.target.value)} className={inputCls} />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-700">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-brand-600"
            />
            Set as the default bank account on new invoices
          </label>

          {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
