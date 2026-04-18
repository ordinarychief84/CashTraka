'use client';

import { useState } from 'react';
import { MessageCircle, Check, X, Copy, ExternalLink } from 'lucide-react';

type Props = {
  id: string;
  status: string;
  whatsappLink: string;
  payUrl: string;
};

export function PayLinkActions({ id, status, whatsappLink, payUrl }: Props) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleAction(action: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/paylinks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(payUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {/* Copy link */}
      <button
        onClick={copyLink}
        title="Copy link"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
      </button>

      {/* WhatsApp send */}
      {['pending', 'viewed'].includes(status) && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            // Mark WhatsApp as sent in background
            fetch(`/api/paylinks/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'whatsapp_sent' }),
            });
          }}
          title="Send via WhatsApp"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 hover:bg-green-50"
        >
          <MessageCircle size={16} />
        </a>
      )}

      {/* Confirm payment (when claimed) */}
      {status === 'claimed' && (
        <button
          onClick={() => handleAction('confirm')}
          disabled={loading}
          title="Confirm payment received"
          className="flex h-8 items-center gap-1 rounded-lg bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          <Check size={14} />
          Confirm
        </button>
      )}

      {/* Cancel */}
      {['pending', 'viewed'].includes(status) && (
        <button
          onClick={() => handleAction('cancel')}
          disabled={loading}
          title="Cancel link"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
