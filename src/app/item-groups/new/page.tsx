'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ItemsSubNav } from '@/components/ItemsSubNav';

export default function CreateItemGroupPage() {
  const router = useRouter();
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [vatDomestic, setVatDomestic] = useState('7.50');
  const [vatEu, setVatEu] = useState('0.00');
  const [vatAbroad, setVatAbroad] = useState('0.00');
  const [vatDomesticExempt, setVatDomesticExempt] = useState('0.00');
  const [hasInventory, setHasInventory] = useState('yes');
  const [canBeSold, setCanBeSold] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (andNew = false) => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      // POST to API when endpoint is ready
      await new Promise((r) => setTimeout(r, 400));
      if (andNew) {
        setNumber('');
        setName('');
      } else {
        router.push('/item-groups');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-app py-5 md:py-8">
        <div className="flex min-h-[calc(100vh-8rem)] gap-6">
          <ItemsSubNav />

          <div className="flex-1 min-w-0 flex justify-end">
            <div className="w-full max-w-xl">
              {/* Title */}
              <h1 className="mb-4 text-xl font-bold text-ink">Create item group</h1>

              {/* Tab */}
              <div className="mb-5 border-b border-slate-200">
                <button
                  type="button"
                  className="border-b-2 border-brand-600 pb-2 text-[13px] font-semibold text-brand-700"
                >
                  Item group
                </button>
              </div>

              {/* Form card */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Number</label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                {/* VAT grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-600">VAT domestic</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={vatDomestic}
                        onChange={(e) => setVatDomestic(e.target.value)}
                        className="min-w-0 flex-1 rounded-l-md border border-r-0 border-slate-300 px-3 py-2 text-right text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      />
                      <span className="flex items-center rounded-r-md border border-slate-300 bg-slate-50 px-2.5 py-2 text-[13px] text-slate-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-600">VAT EU</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={vatEu}
                        onChange={(e) => setVatEu(e.target.value)}
                        className="min-w-0 flex-1 rounded-l-md border border-r-0 border-slate-300 px-3 py-2 text-right text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      />
                      <span className="flex items-center rounded-r-md border border-slate-300 bg-slate-50 px-2.5 py-2 text-[13px] text-slate-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-600">VAT abroad</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={vatAbroad}
                        onChange={(e) => setVatAbroad(e.target.value)}
                        className="min-w-0 flex-1 rounded-l-md border border-r-0 border-slate-300 px-3 py-2 text-right text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      />
                      <span className="flex items-center rounded-r-md border border-slate-300 bg-slate-50 px-2.5 py-2 text-[13px] text-slate-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-600">VAT domestic (exempt)</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={vatDomesticExempt}
                        onChange={(e) => setVatDomesticExempt(e.target.value)}
                        className="min-w-0 flex-1 rounded-l-md border border-r-0 border-slate-300 px-3 py-2 text-right text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      />
                      <span className="flex items-center rounded-r-md border border-slate-300 bg-slate-50 px-2.5 py-2 text-[13px] text-slate-500">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600">Has inventory</label>
                  <select
                    value={hasInventory}
                    onChange={(e) => setHasInventory(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={canBeSold}
                    onChange={(e) => setCanBeSold(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
                  />
                  Items in the group can be sold
                </label>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={submitting || !name.trim()}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating…' : 'Create item group'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={submitting || !name.trim()}
                    className="text-[13px] font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                  >
                    Create and new
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
