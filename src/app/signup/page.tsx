import Link from 'next/link';
import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { Logo } from '@/components/Logo';

type SearchParams = {
  type?: string;
  ic?: string;
  plan?: string;
};

/**
 * Signup page. Every new account is auto-enrolled in a 30-day Pro trial,
 * so the page leads with that promise. The ICP-specific variants
 * (?type=seller, ?type=property_manager) were retired during the
 * small-batch operational pivot.
 */
export default function SignupPage(_props: {
  searchParams: SearchParams;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="container-app py-10">
        <Link href="/" className="mb-8 inline-flex items-center">
          <Logo size="md" />
        </Link>
        <div className="mx-auto max-w-md">
          <div className="card p-6">
            <h1 className="text-2xl font-bold text-ink">Start your 30-day free trial</h1>
            <p className="mt-1 text-sm text-slate-600">
              Plan production, track materials, send invoices, and avoid shortages — every new
              account gets 30 days of Pro free. No card required.
            </p>
            <div className="mt-5">
              <Suspense>
                <AuthForm mode="signup" />
              </Suspense>
            </div>
            <p className="mt-5 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-brand-600 hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
