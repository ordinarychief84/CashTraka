import Link from 'next/link';
import { Suspense } from 'react';
import { Users2 } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="container-app py-10">
        <Link href="/" className="mb-8 inline-flex items-center">
          <Logo size="md" />
        </Link>
        <div className="mx-auto max-w-md">
          <div className="card p-6">
            <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-600">
              Log in to your CashTraka account.
            </p>

            <div className="mt-5">
              <Suspense>
                <AuthForm mode="login" />
              </Suspense>
            </div>

            {/* ── Staff hint ── */}
            <div className="mt-5 rounded-xl border border-border bg-slate-50/80 p-3 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <Users2 size={14} className="mt-0.5 shrink-0 text-brand-600" />
                <div>
                  <p className="font-semibold text-ink">
                    Team member? You log in here too.
                  </p>
                  <p className="mt-0.5">
                    Use the email your employer invited you with — the same
                    one you received the invite link on. If you haven&apos;t
                    received one, ask your employer to resend it from their
                    Team page.
                  </p>
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
