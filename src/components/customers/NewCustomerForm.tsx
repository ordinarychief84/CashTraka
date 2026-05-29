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

export function NewCustomerForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // General
  const [name, setName] = useState('');
  const [vatNo, setVatNo] = useState('');
  const [lanNumber, setLanNumber] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState<'Open' | 'Barred'>('Open');

  // Settings
  // Currency is always NGN at create-time; see the comment in the
  // Settings card below.
  const currency = 'NGN';
  void currency;
  const [maxCredit, setMaxCredit] = useState('');
  const [language, setLanguage] = useState('English');
  const [paymentTerm, setPaymentTerm] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [vatZone, setVatZone] = useState('');
  const [generalDiscount, setGeneralDiscount] = useState('0.00');

  // Billing address
  const [billName, setBillName] = useState('');
  const [billStreet, setBillStreet] = useState('');
  const [billStreet2, setBillStreet2] = useState('');
  const [billPostcode, setBillPostcode] = useState('');
  const [billCity, setBillCity] = useState('');
  const [billCountry, setBillCountry] = useState('');

  // Delivery address
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [delName, setDelName] = useState('');
  const [delStreet, setDelStreet] = useState('');
  const [delStreet2, setDelStreet2] = useState('');
  const [delPostcode, setDelPostcode] = useState('');
  const [delCity, setDelCity] = useState('');
  const [delCountry, setDelCountry] = useState('');
  const [delPhone, setDelPhone] = useState('');
  const [delEmail, setDelEmail] = useState('');

  // Contact
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emailOffers, setEmailOffers] = useState('');
  const [emailOrders, setEmailOrders] = useState('');
  const [emailInvoices, setEmailInvoices] = useState('');

  // References / Layout
  const [ourReference, setOurReference] = useState('');
  const [layout, setLayout] = useState('Standard layout');

  function resetForm() {
    setName(''); setVatNo(''); setLanNumber(''); setGroup('');
    setBillName(''); setBillStreet(''); setBillStreet2(''); setBillPostcode(''); setBillCity(''); setBillCountry('');
    setDelName(''); setDelStreet(''); setDelStreet2(''); setDelPostcode(''); setDelCity(''); setDelCountry('');
    setDelPhone(''); setDelEmail('');
    setPhone(''); setEmail(''); setEmailOffers(''); setEmailOrders(''); setEmailInvoices('');
    setOurReference('');
  }

  async function submit(andNew: boolean) {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const address = [billStreet, billStreet2, billPostcode, billCity, billCountry].filter(Boolean).join(', ') || undefined;
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address,
          paymentTerms: paymentTerm || undefined,
          status: status === 'Open' ? 'ACTIVE' : 'INACTIVE',
          notes: ourReference || undefined,
        }),
      });
      if (res.ok) {
        if (andNew) {
          resetForm();
        } else {
          router.push('/customers');
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
        <h1 className="text-xl font-bold text-slate-900">Create customer</h1>
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
          Create customer
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

      {/* Two-column layout — stacks on mobile */}
      <div className="flex flex-col gap-5 items-start lg:flex-row">

        {/* ── Main form ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* General + Settings */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">

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
                      Customer name <span className="text-rose-500">*</span>
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
                    <label className={labelCls}>LAN number</label>
                    <input type="text" value={lanNumber} onChange={e => setLanNumber(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Group <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input type="text" value={group} onChange={e => setGroup(e.target.value)} className={inputCls + ' pr-8'} />
                      <ArrowUpDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-700">
                        <input type="radio" name="cust-status" value="Open" checked={status === 'Open'} onChange={() => setStatus('Open')} className="accent-brand-600" />
                        Open
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-700">
                        <input type="radio" name="cust-status" value="Barred" checked={status === 'Barred'} onChange={() => setStatus('Barred')} className="accent-brand-600" />
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
                  {/* Currency picker removed — 95% of Nigerian SMBs invoice
                       in Naira only. To bill a customer in a different
                       currency, enable that currency under Settings >
                       Currencies first, then pick it on the invoice. */}
                  <div>
                    <label className={labelCls}>Max credit</label>
                    <input type="number" min="0" step="0.01" value={maxCredit} onChange={e => setMaxCredit(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Language <span className="text-rose-500">*</span></label>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className={selectCls}>
                      <option>English</option>
                      <option>French</option>
                      <option>Arabic</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Payment term <span className="text-rose-500">*</span></label>
                    <select value={paymentTerm} onChange={e => setPaymentTerm(e.target.value)} className={selectCls}>
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
                    <label className={labelCls}>VAT zone <span className="text-rose-500">*</span></label>
                    <select value={vatZone} onChange={e => setVatZone(e.target.value)} className={selectCls}>
                      <option value="" />
                      <option>Domestic</option>
                      <option>EU</option>
                      <option>Non-EU</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>
                      General discount (%)
                      <span className="ml-1 inline-flex h-[14px] w-[14px] items-center justify-center rounded-full border border-slate-400 text-[9px] text-slate-500 cursor-help align-middle">?</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={generalDiscount}
                        onChange={e => setGeneralDiscount(e.target.value)}
                        className={inputCls + ' pr-8'}
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className={sectionHeadCls}>Billing address</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Name</label>
                <input type="text" value={billName} onChange={e => setBillName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Street</label>
                <input type="text" value={billStreet} onChange={e => setBillStreet(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Street 2</label>
                <input type="text" value={billStreet2} onChange={e => setBillStreet2(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Postcode</label>
                <input type="text" value={billPostcode} onChange={e => setBillPostcode(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input type="text" value={billCity} onChange={e => setBillCity(e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Country</label>
                <input type="text" value={billCountry} onChange={e => setBillCountry(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className={sectionHeadCls}>Delivery address</p>

            {/* Same as billing checkbox */}
            <label className="mb-4 flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={e => setSameAsBilling(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              Same as billing address
            </label>

            {!sameAsBilling && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Name</label>
                  <input type="text" value={delName} onChange={e => setDelName(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Street</label>
                  <input type="text" value={delStreet} onChange={e => setDelStreet(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Street 2</label>
                  <input type="text" value={delStreet2} onChange={e => setDelStreet2(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Postcode</label>
                  <input type="text" value={delPostcode} onChange={e => setDelPostcode(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" value={delCity} onChange={e => setDelCity(e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Country</label>
                  <input type="text" value={delCountry} onChange={e => setDelCountry(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={delPhone} onChange={e => setDelPhone(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>E-mail</label>
                  <input type="email" value={delEmail} onChange={e => setDelEmail(e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-full shrink-0 space-y-4 lg:w-60">

          {/* Contact information */}
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
              <div>
                <label className={labelCls}>E-mail for offers</label>
                <input type="email" value={emailOffers} onChange={e => setEmailOffers(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>E-mail for orders</label>
                <input type="email" value={emailOrders} onChange={e => setEmailOrders(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>E-mail for invoices</label>
                <input type="email" value={emailInvoices} onChange={e => setEmailInvoices(e.target.value)} className={inputCls} />
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
        </div>
      </div>
    </div>
  );
}
