'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { UserTypeRadio } from './UserTypeRadio';

interface LanguageOption {
  code: string;
  name: string;
}

export interface EditUserSeed {
  id: string;
  name: string;
  email: string;
  language: string;
  userType: 'STANDARD' | 'SCANNER';
  autoBookAdjustments: boolean;
  autoBookMovements: boolean;
  associatedEmployee: string | null;
}

interface Props {
  user: EditUserSeed;
  languages: LanguageOption[];
}

const inputCls =
  'h-10 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300';
const labelCls = 'mb-1.5 block text-[13px] font-semibold text-slate-700';

export function EditUserForm({ user, languages }: Props) {
  const router = useRouter();
  // Top-level form state
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [language, setLanguage] = useState(user.language);
  const [userType, setUserType] = useState<'STANDARD' | 'SCANNER'>(user.userType);
  const [autoBookAdjustments, setAutoBookAdjustments] = useState(user.autoBookAdjustments);
  const [autoBookMovements, setAutoBookMovements] = useState(user.autoBookMovements);
  const [associatedEmployee, setAssociatedEmployee] = useState(user.associatedEmployee ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Password card state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSavedAt, setPwSavedAt] = useState<number | null>(null);

  async function saveChanges() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          language,
          userType,
          autoBookAdjustments,
          autoBookMovements,
          associatedEmployee: associatedEmployee.trim() || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? 'Could not save changes.');
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword() {
    setPwError(null);
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`/api/settings/users/${user.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setPwError(json?.error ?? 'Could not update password.');
        return;
      }
      setPwSavedAt(Date.now());
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Top card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="space-y-5">
          <div>
            <label className={labelCls}>
              Name <span className="text-rose-500">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>
              E-mail <span className="text-rose-500">*</span>
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`${inputCls} bg-white pr-8`}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>
              User type <span className="text-rose-500">*</span>
            </label>
            <UserTypeRadio value={userType} onChange={setUserType} />
          </div>

          {/* Mobile settings — only relevant for STANDARD users */}
          {userType === 'STANDARD' && (
            <div>
              <label className={labelCls}>Mobile settings</label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-2 text-[13px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoBookAdjustments}
                    onChange={(e) => setAutoBookAdjustments(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
                  />
                  <span>
                    Automatically book adjustments
                    <span className="block text-[11px] text-slate-500">
                      Enabling this setting will automatically book new adjustments
                      created by this user in the mobile app.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-[13px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoBookMovements}
                    onChange={(e) => setAutoBookMovements(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
                  />
                  <span>
                    Automatically book movements
                    <span className="block text-[11px] text-slate-500">
                      Enabling this setting will automatically book new movements
                      created by this user in the mobile app.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Associated employee</label>
            <div className="relative">
              <input
                type="text"
                value={associatedEmployee}
                onChange={(e) => setAssociatedEmployee(e.target.value)}
                placeholder="Pick an HR record to attribute production work to"
                className={inputCls + ' pr-8'}
              />
              {associatedEmployee && (
                <button
                  type="button"
                  onClick={() => setAssociatedEmployee('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
          {savedAt && !error && (
            <p className="text-[12px] text-success-700">Changes saved.</p>
          )}

          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Save changes
          </button>
        </div>
      </div>

      {/* Change password card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-5 text-[16px] font-bold text-brand-700">Change password</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
              autoComplete="current-password"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Owners can reset any staff password without their current one —
              this field is optional.
            </p>
          </div>
          <div>
            <label className={labelCls}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={labelCls}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
              autoComplete="new-password"
            />
          </div>

          {pwError && <p className="text-[12px] font-medium text-rose-600">{pwError}</p>}
          {pwSavedAt && !pwError && (
            <p className="text-[12px] text-success-700">Password updated.</p>
          )}

          <button
            type="button"
            onClick={updatePassword}
            disabled={pwSaving || !newPassword}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {pwSaving && <Loader2 size={12} className="animate-spin" />}
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
