'use client';

import { useState } from 'react';
import { MessageCircle, Check, X, Copy, Mail } from 'lucide-react';

type Props = {
  id: string;
  status: string;
  whatsappLink: string;
  payUrl: string;
  customerEmail?: string | null;
};

export function PayLinkActions({ id, status, whatsappLink, payUrl, customerEmail }: Props) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState(customerEmail || '');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

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

  async function sendEmail() {
    if (!email || !email.includes('@')) {
      setEmailError('Enter a valid email');
      return;
    }
    setEmailSending(true);
    setEmailError('');
    try {
      const res = await fetch(`/api/paylinks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'email_sent', customerEmail: email }),
      });
      if (res.ok) {
        setEmailSent(true);
        setShowEmailInput(false);
        setTimeout(() => setEmailSent(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setEmailError(data.error || 'Failed to send');
      }
    } catch {
      setEmailError('Network error');
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {/* Copy link */}
        <button
          onClick={copyLink}
          title="Copy link"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
        </button>

        {/* Email send */}
        {['pending', 'viewed'].includes(status) && (
          <button
            onClick={() => setShowEmailInput(!showEmailInput)}
            title={emailSent ? 'Email sent!' : 'Send via Email'}
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              emailSent
                ? 'text-green-600 bg-green-50'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            {emailSent ? <Check size={14} /> : <Mail size={16} />}
          </button>
        )}

        {/* WhatsApp send */}
        {['pending', 'viewed'].includes(status) && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
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

      {/* Email input popover */}
      {showEmailInput && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
            placeholder="customer@email.com"
            className="w-48 rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter') sendEmail(); }}
          />
          <button
            onClick={sendEmail}
            disabled={emailSending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {emailSending ? 'Sending...' : 'Send'}
          </button>
          {emailError && <span className="text-xs text-red-500">{emailError}</span>}
        </div>
      )}
    </div>
  );
}
