'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

type InviteInfo = {
  name: string;
  email: string;
  adminRole: string;
};

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'success'>('loading');
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/staff/accept-invite?token=${token}`);
        if (res.status === 410) { setStatus('expired'); return; }
        if (!res.ok) { setStatus('invalid'); return; }
        const data = await res.json();
        setInvite(data.staff);
        setStatus('valid');
      } catch {
        setStatus('invalid');
      }
    }
    validate();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/staff/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to activate account');
      setStatus('success');
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = (role: string) =>
    role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center">
            <Logo size="lg" />
          </Link>
        </div>

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 size={32} className="mx-auto animate-spin text-slate-400" />
              <p className="mt-3 text-sm text-slate-500">Validating your invitation...</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center py-8">
              <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
              <h2 className="text-lg font-bold text-slate-900">Invalid Invitation</h2>
              <p className="mt-2 text-sm text-slate-500">
                This invitation link is invalid or has already been used.
              </p>
              <Link href="/login" className="btn-primary mt-6 inline-block text-sm">
                Go to Login
              </Link>
            </div>
          )}

          {status === 'expired' && (
            <div className="text-center py-8">
              <AlertCircle size={40} className="mx-auto text-owed-400 mb-3" />
              <h2 className="text-lg font-bold text-slate-900">Invitation Expired</h2>
              <p className="mt-2 text-sm text-slate-500">
                This invitation has expired. Please ask your admin to resend it.
              </p>
              <Link href="/login" className="btn-primary mt-6 inline-block text-sm">
                Go to Login
              </Link>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <CheckCircle size={40} className="mx-auto text-success-500 mb-3" />
              <h2 className="text-lg font-bold text-slate-900">Account Activated</h2>
              <p className="mt-2 text-sm text-slate-500">
                Your account is ready. Redirecting you to login...
              </p>
              <Link href="/login" className="btn-primary mt-6 inline-block text-sm">
                Log in now
              </Link>
            </div>
          )}

          {status === 'valid' && invite && (
            <>
              <div className="text-center mb-6">
                <ShieldCheck size={32} className="mx-auto text-success-500 mb-2" />
                <h2 className="text-lg font-bold text-slate-900">Welcome to CashTraka</h2>
                <p className="mt-1 text-sm text-slate-500">Set your password to activate your account</p>
              </div>

              <div className="rounded-lg bg-slate-50 border p-4 mb-6">
                <div className="text-sm">
                  <div className="text-slate-500">Name</div>
                  <div className="font-semibold text-slate-900">{invite.name}</div>
                </div>
                <div className="text-sm mt-2">
                  <div className="text-slate-500">Email</div>
                  <div className="font-semibold text-slate-900">{invite.email}</div>
                </div>
                <div className="text-sm mt-2">
                  <div className="text-slate-500">Role</div>
                  <div className="font-semibold text-slate-900">{roleLabel(invite.adminRole)}</div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Create Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="input pr-10"
                      required
                      minLength={8}
                    />
                    <button type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="input"
                    required
                  />
                </div>

                <button type="submit" disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                  {submitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Activating...</>
                  ) : (
                    <><CheckCircle size={16} /> Activate Account</>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
