'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, X } from 'lucide-react';

const inputCls =
  'h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300';
const selectCls =
  'h-9 w-full rounded-md border border-slate-300 px-3 pr-8 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300 bg-white';
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600';
const sectionHeadCls = 'mb-3 text-[13px] font-semibold text-slate-800';

export function NewSupplierForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // General
  const [name, setName] = useState('');
  const [vatNo, setVatNo] = useState('');
  const [group, setGroup] = useState('');
  const [markup, setMarkup] = useState('0.00');
  const [status, setStatus] = useState<'Open' | 'Barred'>('Open');

  // Settings
  const [vatZone, setVatZone] = useState('');
  const [language, setLanguage] = useState('English');
  const [paymentForm, setPaymentForm] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [deliveryDays, setDeliveryDays] = useState('0');

  // Address
  const [street, setStreet] = useState('');
  const [street2, setStreet2] = useState('');
  const [postcode, setPostcode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  // Contact
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // References / Layout
  const [ourReference, setOurReference] = useState('');
  const [layout, setLayout] = useState('Standard layout');

  async function submit(andNew: boolean) {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: [street, street2, postcode, city, country].filter(Boolean).join(', ') || undefined,
          paymentTerms: paymentForm || undefined,
          status: status === 'Open' ? 'ACTIVE' : 'INACTIVE',
          notes: ourReference || undefined,
        }),
      });
      if (res.ok) {
        if (andNew) {
          setName(''); setVatNo(''); setGroup(''); setMarkup('0.00');
          setStreet(''); setStreet2(''); setPostcode(''); setCity(''); setCountry('');
          setPhone(''); setEmail(''); setOurReference('');
        } else {
          router.push('/suppliers');
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Page title */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-slate-900">Create supplier</h1>
      </div>

      {/* Tab underline */}
      <div className="mb-5 flex border-b border-slate-200">
        <button
          type="button"
          className="border-b-2 border-brand-600 pb-2 pr-4 text-[13px] font-semibold text-brand-700"
        >
          Information
        </button>
      </div>

      {/* Action buttons */}
      <div className="mb-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={submitting || !name.trim()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Create supplier
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={submitting || !name.trim()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Create and new
        </button>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">

        {/* ── Main form ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* General + Settings */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-2 gap-8">

              {/* General */}
              <div>
                <p className={sectionHeadCls}>General</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Number</label>
                    <input type="text" readOnly placeholder="Auto" className={inputCls + ' bg-slate-50 cursor-not-allowed'} />
                  </div>
                  <div>
                    <label className={labelCls}>VAT no.</label>
                    <input type="text" value={vatNo} onChange={e => setVatNo(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Supplier name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        autoFocus
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className={inputCls + ' pr-8'}
                      />
                      <ArrowUpDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Group <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input type="text" value={group} onChange={e => setGroup(e.target.value)} className={inputCls + ' pr-8'} />
                      <ArrowUpDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>
                      Markup for the supplier&apos;s cost price (%)
                      <span className="ml-1 inline-flex h-[14px] w-[14px] items-center justify-center rounded-full border border-slate-400 text-[9px] text-slate-500 cursor-help align-middle">?</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={markup}
                        onChange={e => setMarkup(e.target.value)}
                        className={inputCls + ' pr-8'}
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-700">
                        <input type="radio" name="status" value="Open" checked={status === 'Open'} onChange={() => setStatus('Open')} className="accent-brand-600" />
                        Open
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-700">
                        <input type="radio" name="status" value="Barred" checked={status === 'Barred'} onChange={() => setStatus('Barred')} className="accent-brand-600" />
                        Barred
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div>
                <p className={sectionHeadCls}>Settings</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>VAT zone <span className="text-red-500">*</span></label>
                    <select value={vatZone} onChange={e => setVatZone(e.target.value)} className={selectCls}>
                      <option value="" />
                      <option>Domestic</option>
                      <option>EU</option>
                      <option>Non-EU</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Language <span className="text-red-500">*</span></label>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className={selectCls}>
                      <option>English</option>
                      <option>French</option>
                      <option>Arabic</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Payment form <span className="text-red-500">*</span></label>
                    <select value={paymentForm} onChange={e => setPaymentForm(e.target.value)} className={selectCls}>
                      <option value="" />
                      <option>Net 30</option>
                      <option>Net 60</option>
                      <option>Immediate</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Delivery terms</label>
                    <select value={deliveryTerms} onChange={e => setDeliveryTerms(e.target.value)} className={selectCls}>
                      <option value="" />
                      <option>EXW</option>
                      <option>FOB</option>
                      <option>CIF</option>
                      <option>DDP</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Default currency <span className="text-red-500">*</span></label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className={selectCls}>
                      <option>NGN</option>
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Expected delivery time (in days)</label>
                    <input
                      type="number"
                      min="0"
                      value={deliveryDays}
                      onChange={e => setDeliveryDays(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className={sectionHeadCls}>Address</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Street</label>
                <input type="text" value={street} onChange={e => setStreet(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Street 2</label>
                <input type="text" value={street2} onChange={e => setStreet2(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Postcode</label>
                <input type="text" value={postcode} onChange={e => setPostcode(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Country</label>
                <input type="text" value={country} onChange={e => setCountry(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-60 shrink-0 space-y-4">

          {/* Contact */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className={sectionHeadCls}>Contact information</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* References */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className={sectionHeadCls}>References</p>
            <div>
              <label className={labelCls}>Our reference</label>
              <div className="relative">
                <input type="text" value={ourReference} onChange={e => setOurReference(e.target.value)} className={inputCls + ' pr-8'} />
                <ArrowUpDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Layout */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className={sectionHeadCls}>Layout</p>
            <div className="relative">
              <input type="text" value={layout} onChange={e => setLayout(e.target.value)} className={inputCls + ' pr-8'} />
              <button
                type="button"
                onClick={() => setLayout('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Payment types */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className={sectionHeadCls}>Payment types</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Payment types</label>
                <div className="relative">
                  <input type="text" className={inputCls + ' pr-8'} />
                  <X size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Bank account</label>
                <input type="text" className={inputCls} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
