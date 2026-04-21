'use client';

/**
 * ContactPickerButton — CashTraka
 *
 * Reusable button that opens the device contact picker where supported.
 * Falls back to hidden state on unsupported browsers. Always keeps
 * manual entry available — this is an enhancement, not a replacement.
 */

import { useState, useEffect } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import {
  isContactPickerSupported,
  pickContactWithPhoneChoice,
} from '@/lib/contact-picker';
import { normalizeNigerianPhone } from '@/lib/whatsapp';

type Props = {
  onContactPicked: (contact: { name: string; phone: string }) => void;
  /** Label override. Default: "Pick from contacts" */
  label?: string;
  className?: string;
};

export function ContactPickerButton({ onContactPicked, label, className }: Props) {
  const [supported, setSupported] = useState(false);
  const [picking, setPicking] = useState(false);
  const [phoneChoices, setPhoneChoices] = useState<{ name: string; phones: string[] } | null>(null);

  useEffect(() => {
    setSupported(isContactPickerSupported());
  }, []);

  if (!supported) return null;

  async function handlePick() {
    setPicking(true);
    try {
      const result = await pickContactWithPhoneChoice();
      if (!result) return;

      if (result.phones.length === 1) {
        onContactPicked({
          name: result.name,
          phone: normalizeNigerianPhone(result.phones[0]),
        });
      } else if (result.phones.length > 1) {
        setPhoneChoices(result);
      }
    } finally {
      setPicking(false);
    }
  }

  function handlePhoneSelect(phone: string) {
    if (!phoneChoices) return;
    onContactPicked({
      name: phoneChoices.name,
      phone: normalizeNigerianPhone(phone),
    });
    setPhoneChoices(null);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handlePick}
        disabled={picking}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100 active:bg-brand-200 disabled:opacity-50 transition-colors ${className || ''}`}
      >
        <Users size={14} />
        {picking ? 'Opening...' : label || 'Pick from contacts'}
      </button>

      {/* Phone number chooser popup */}
      {phoneChoices && phoneChoices.phones.length > 1 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border bg-white p-2 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-slate-700">
            {phoneChoices.name} has {phoneChoices.phones.length} numbers:
          </p>
          {phoneChoices.phones.map((phone, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePhoneSelect(phone)}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <span className="font-mono text-xs">{phone}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPhoneChoices(null)}
            className="mt-1 w-full rounded px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
