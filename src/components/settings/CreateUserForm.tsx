'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { UserTypeRadio } from './UserTypeRadio';

interface LanguageOption {
  code: string;
  name: string;
}

interface Props {
  languages: LanguageOption[];
}

const inputCls =
  'h-10 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300';
const labelCls = 'mb-1.5 block text-[13px] font-semibold text-slate-700';

export function CreateUserForm({ languages }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState(languages[0]?.code ?? 'EN');
  const [userType, setUserType] = useState<'STANDARD' | 'SCANNER'>('STANDARD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setEmail('');
    setPassword('');
    setUserType('STANDARD');
    setError(null);
  }

  async function submit(andNew: boolean) {
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, e-mail and password are all required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          language,
          userType,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error ?? 'Could not create user.');
        return;
      }
      if (andNew) {
        reset();
        router.refresh();
      } else {
        router.push('/settings/users');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="space-y-5">
        <div>
          <label className={labelCls}>
            Name <span className="text-rose-500">*</span>
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            E-mail <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            Password <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="Min. 8 characters, with letters and numbers"
          />
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

        {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            Create user
          </button>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={submitting}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Create and new
          </button>
        </div>
      </div>
    </div>
  );
}
