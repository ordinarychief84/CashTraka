'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Plus } from 'lucide-react';
import { waLink, followUpMessage, displayPhone } from '@/lib/whatsapp';

type CustomerOption = { id: string; name: string; phone: string };
type Template = { id: string; name: string; body: string };

type Props = {
  customers: CustomerOption[];
  templates: Template[];
  initialCustomerId?: string | null;
  /** Singular label for the dropdown — "Customer" (default) or "Tenant". */
  recipientLabel?: string;
};

export function FollowUpComposer({
  customers,
  templates,
  initialCustomerId,
  recipientLabel = 'Customer',
}: Props) {
  const [customerId, setCustomerId] = useState<string>(
    initialCustomerId && customers.find((c) => c.id === initialCustomerId)
      ? initialCustomerId
      : customers[0]?.id || '',
  );

  const selected = customers.find((c) => c.id === customerId);
  const defaultMessage = selected ? followUpMessage(selected.name) : followUpMessage('there');
  const [message, setMessage] = useState(defaultMessage);

  function handleSelectCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) setMessage(followUpMessage(c.name));
  }

  function applyTemplate(body: string) {
    const name = selected?.name ?? 'there';
    // Replace {name} placeholder (case-insensitive).
    setMessage(body.replace(/\{\s*name\s*\}/gi, name));
  }

  const href = useMemo(() => {
    if (!selected) return '#';
    return waLink(selected.phone, message);
  }, [selected, message]);

  if (customers.length === 0) {
    const lc = recipientLabel.toLowerCase();
    return (
      <div className="card p-6 text-center">
        <h2 className="font-semibold text-ink">No {lc}s yet</h2>
        <p className="mt-1 text-sm text-slate-600">
          {recipientLabel === 'Tenant'
            ? 'Add a property and a tenant to create your first recipient.'
            : 'Add a payment or debt to create your first customer.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="customer" className="label">{recipientLabel}</label>
        <select
          id="customer"
          className="input"
          value={customerId}
          onChange={(e) => handleSelectCustomer(e.target.value)}
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {displayPhone(c.phone)}
            </option>
          ))}
        </select>
      </div>

      {templates.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label mb-0">Use a template</label>
            <Link href="/templates" className="text-xs font-semibold text-brand-600 hover:underline">
              Manage
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t.body)}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {templates.length === 0 && (
        <Link
          href="/templates/new"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
        >
          <Plus size={14} />
          Save a reusable template
        </Link>
      )}

      <div>
        <label htmlFor="message" className="label">Message</label>
        <textarea
          id="message"
          rows={5}
          className="input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          This opens WhatsApp with the message prefilled. You still need to tap send inside WhatsApp.
        </p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-wa w-full"
        aria-disabled={!selected}
      >
        <MessageCircle size={18} />
        Open in WhatsApp
      </a>
    </div>
  );
}
