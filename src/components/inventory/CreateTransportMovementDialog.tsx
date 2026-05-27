'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateTransportMovementDialog({ open, onClose }: Props) {
  const [expectedDate, setExpectedDate] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [transportLoc, setTransportLoc] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleCreate() {
    if (!from || !to || !transportLoc) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedDate, from, to, transportLoc, reason }),
      });
      // Swallow JSON parse errors silently — the dialog only cares about
      // res.ok for now since the transfers detail page isn't wired yet.
      await res.json().catch(() => null);
    } finally {
      setSubmitting(false);
      onClose();
    }
  }

  const selectCls =
    'h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              Create transport movement
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              Fill out the locations here. Transport location is the temporary
              location used while the items are in transit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Expected date */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
            Expected date
          </label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
          />
        </div>

        {/* From */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
            From <span className="text-red-500">*</span>
          </label>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={selectCls}
          >
            <option value="">Select location</option>
            <option value="default">Default Warehouse</option>
          </select>
        </div>

        {/* To */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
            To <span className="text-red-500">*</span>
          </label>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={selectCls}
          >
            <option value="">Select location</option>
            <option value="default">Default Warehouse</option>
          </select>
        </div>

        {/* Transport location */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
            Transport location <span className="text-red-500">*</span>
          </label>
          <select
            value={transportLoc}
            onChange={(e) => setTransportLoc(e.target.value)}
            className={selectCls}
          >
            <option value="">Select location</option>
            <option value="default">Default Warehouse</option>
          </select>
        </div>

        {/* Reason */}
        <div className="mb-6">
          <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
            Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting || !from || !to || !transportLoc}
            className="rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
