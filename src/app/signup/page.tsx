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
 * Signup page — reads `?type=seller | property_manager` from the URL so the
 * headline + subhead match whichever journey the visitor came from. The
 * inline AuthForm also presets the ICP picker to the same value.
 */
export default function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const hinted = (searchParams.type || searchParams.ic || '').toLowerCase();
  const isPm = hinted === 'property_manager';

  const headline = isPm
    ? 'Start with CashTraka for Landlords'
    : hinted === 'seller'
      ? 'Start with CashTraka for Business'
      : 'Create your CashTraka account';
  const sub = isPm
    ? 'Track rent across every property and tenant in minutes.'
    : hinted === 'seller'
      ? 'Track sales, debts, invoices and customers in minutes.'
      : 'Pick the solution that matches what you do. We\'ll tailor the rest.';

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="container-app py-10">
        <Link href="/" className="mb-8 inline-flex items-center">
          <Logo size="md" />
        </Link>
        <div className="mx-auto max-w-md">
          <div className="card p-6">
            <h1 className="text-2xl font-bold text-ink">{headline}</h1>
            <p className="mt-1 text-sm text-slate-600">{sub}</p>
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
