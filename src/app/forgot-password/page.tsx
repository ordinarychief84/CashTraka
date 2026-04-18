import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ForgotPasswordForm } from './form';

export const metadata = { title: 'Forgot password · CashTraka' };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="container-app py-10">
        <Link href="/" className="mb-8 inline-flex items-center">
          <Logo size="md" />
        </Link>
        <div className="mx-auto max-w-md">
          <div className="card p-6">
            <h1 className="text-2xl font-bold text-ink">Forgot your password?</h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter the email you signed up with. We&apos;ll send you a link to
              set a new password. The link is good for 30 minutes.
            </p>

            <div className="mt-5">
              <ForgotPasswordForm />
            </div>

            <p className="mt-5 text-center text-sm text-slate-600">
              Remembered it?{' '}
              <Link href="/login" className="font-semibold text-brand-600 hover:underline">
                Back to log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
