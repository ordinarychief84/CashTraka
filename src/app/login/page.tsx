import Link from 'next/link';
import { Suspense } from 'react';
import { Users2, CheckCircle2 } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';
import { Logo } from '@/components/Logo';

type SearchParams = { reset?: string };

export default function LoginPage({ searchParams }: { searchParams: SearchParams; }) {
  const justReset = searchParams.reset === '1';

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="container-app py-10">
        <Link href="/" className="mb-8 inline-flex items-center">
          <Logo size="md" />
        </Link>
        <div className="mx-auto max-w-md">
          <div className="card p-6">
            <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-600">Log in to your CashTraka account.</p>

            {justReset && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-success-200 bg-success-50 px-3 py-2.5 text-sm text-success-800">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success-700" />
                <span>Password reset. Log in with your new password.</span>
              </div>
            )}

            <div className="mt-5">
              <Suspense>
                <AuthForm mode="login" />
              </Suspense>
            </div>

            <div className="mt-3 text-right">
              <Link href="/forgot-password" className="text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                Forgot password?
              </Link>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-slate-50/80 p-3 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <Users2 size={14} className="mt-0.5 shrink-0 text-brand-600" />
                <div>
                  <p className="font-semibold text-ink">Team member? You log in here too.</p>
                  <p className="mt-0.5">Use the email your employer invited you with, the same one you received the invite link on. If you haven&apos;t received one, ask your employer to resend it from their Team page.</p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-slate-600">
              New here?{' '}
              <Link href="/signup" className="font-semibold text-brand-600 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
