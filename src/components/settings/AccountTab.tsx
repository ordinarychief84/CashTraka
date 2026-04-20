'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Landmark,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from 'lucide-react';

type Props = {
  initial: {
    email: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
  };
  businessType: string;
};

export function AccountTab({ initial, businessType }: Props) {
  const router = useRouter();

  // ── Email change ──
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Password change ──
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Bank details ──
  const [bank, setBank] = useState({
    bankName: initial.bankName,
    bankAccountNumber: initial.bankAccountNumber,
    bankAccountName: initial.bankAccountName,
  });
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMsg, setBankMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const bankDirty = useMemo(
    () =>
      bank.bankName !== initial.bankName ||
      bank.bankAccountNumber !== initial.bankAccountNumber ||
      bank.bankAccountName !== initial.bankAccountName,
    [bank, initial],
  );

  const accountNumberValid = bank.bankAccountNumber.length === 0 || bank.bankAccountNumber.length === 10;

  // Auto-dismiss messages
  useEffect(() => {
    if (!emailMsg) return;
    const t = setTimeout(() => setEmailMsg(null), 4000);
    return () => clearTimeout(t);
  }, [emailMsg]);

  useEffect(() => {
    if (!pwMsg) return;
    const t = setTimeout(() => setPwMsg(null), 4000);
    return () => clearTimeout(t);
  }, [pwMsg]);

  useEffect(() => {
    if (!bankMsg) return;
    const t = setTimeout(() => setBankMsg(null), 4000);
    return () => clearTimeout(t);
  }, [bankMsg]);

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setEmailMsg({ ok: false, text: 'Please enter a valid email address.' });
      return;
    }
    setEmailSaving(true);
    setEmailMsg(null);
    try {
      const res = await fetch('/api/user/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update email');
      setEmailMsg({ ok: true, text: 'Email updated successfully.' });
      setNewEmail('');
      router.refresh();
    } catch (err) {
      setEmailMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setEmailSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) {
      setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: 'Passwords do not match.' });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not change password');
      setPwMsg({ ok: true, text: 'Password changed successfully.' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setPwSaving(false);
    }
  }

  async function handleBankSave(e: React.FormEvent) {
    e.preventDefault();
    if (!accountNumberValid) {
      setBankMsg({ ok: false, text: 'Account number must be 10 digits.' });
      return;
    }
    setBankSaving(true);
    setBankMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: bank.bankName.trim(),
          bankAccountNumber: bank.bankAccountNumber.trim(),
          bankAccountName: bank.bankAccountName.toUpperCase().trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      setBankMsg({ ok: true, text: 'Bank details saved.' });
      router.refresh();
    } catch (err) {
      setBankMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setBankSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Email Section ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Mail size={18} className="text-slate-400" />
            Email Address
          </h2>
          <p className="text-sm text-slate-500">Update the email address associated with your account.</p>
        </div>
        <form onSubmit={handleEmailChange} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current email</label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              {initial.email}
            </div>
          </div>
          <div>
            <label htmlFor="newEmail" className="block text-sm font-semibold text-slate-700 mb-1.5">
              New email
            </label>
            <input
              id="newEmail"
              type="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500 focus:outline-none"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@example.com"
            />
          </div>
          <Feedback msg={emailMsg} />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={emailSaving || !newEmail}
              className="rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50"
            >
              {emailSaving ? 'Updating...' : 'Change email'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Password Section ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Lock size={18} className="text-slate-400" />
            Password
          </h2>
          <p className="text-sm text-slate-500">Change your password to keep your account secure.</p>
        </div>
        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
          <div className="relative">
            <label htmlFor="currentPw" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Current password
            </label>
            <div className="relative">
              <input
                id="currentPw"
                type={showCurrent ? 'text' : 'password'}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500 focus:outline-none"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="relative">
            <label htmlFor="newPw" className="block text-sm font-semibold text-slate-700 mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                id="newPw"
                type={showNew ? 'text' : 'password'}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500 focus:outline-none"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirmPw" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Confirm new password
            </label>
            <input
              id="confirmPw"
              type="password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500 focus:outline-none"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <Feedback msg={pwMsg} />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwSaving || !currentPw || !newPw || !confirmPw}
              className="rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50"
            >
              {pwSaving ? 'Changing...' : 'Reset password'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Bank Details Section ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Landmark size={18} className="text-slate-400" />
            Payment Details
          </h2>
          <p className="text-sm text-slate-500">
            {businessType === 'property_manager'
              ? 'Shown on rent invoices so tenants can pay into your account.'
              : 'Shown on payment links and invoices so customers can pay.'}
          </p>
        </div>
        <form onSubmit={handleBankSave} className="p-6 space-y-4">
          <div>
            <label htmlFor="bankName" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Bank
            </label>
            <input
              id="bankName"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-success-500 focus:ring-1 focus:ring-success-500 focus:outline-none"
              value={bank.bankName}
              onChange={(e) => setBank((b) => ({ ...b, bankName: e.target.value }))}
              placeholder="e.g. GTBank, Access, Kuda"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="acctNum" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Account number
              </label>
              <input
                id="acctNum"
                inputMode="numeric"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm tracking-wider focus:border-success-500 focus:ring-1 focus:ring-success-500 focus:outline-none"
                maxLength={10}
                value={bank.bankAccountNumber}
                onChange={(e) =>
                  setBank((b) => ({ ...b, bankAccountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))
                }
                placeholder="0123456789"
              />
              {!accountNumberValid && (
                <p className="mt-1 text-xs font-semibold text-red-600">Must be 10 digits</p>
              )}
            </div>
            <div>
              <label htmlFor="acctName" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Account name
              </label>
              <input
                id="acctName"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm uppercase focus:border-success-500 focus:ring-1 focus:ring-success-500 focus:outline-none"
                value={bank.bankAccountName}
                onChange={(e) => setBank((b) => ({ ...b, bankAccountName: e.target.value.toUpperCase() }))}
                placeholder="ADA EZE"
              />
            </div>
          </div>
          <Feedback msg={bankMsg} />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={bankSaving || !bankDirty}
              className="rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50"
            >
              {bankSaving ? 'Saving...' : 'Save bank details'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Logout ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-2">
          <LogOut size={18} className="text-slate-400" />
          Session
        </h2>
        <p className="text-sm text-slate-500 mb-4">Sign out of CashTraka on this device.</p>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut size={15} />
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}

function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <div className={'flex items-start gap-2 rounded-lg px-3 py-2 text-sm ' + (msg.ok ? 'bg-success-50 text-success-700' : 'bg-red-50 text-red-700')}>
      {msg.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
      {msg.text}
    </div>
  );
}
