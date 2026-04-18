import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ResetPasswordForm } from './form';

export const metadata = { title: 'Reset password · CashTraka' };

export default function ResetPasswordPage({
  params,
}: {
  params: { token: string };
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="container-app py-10">
        <Link href="/" className="mb-8 inline-flex items-center">
          <Logo size="md" />
        </Link>
        <div className="mx-auto max-w-md">
          <div className="card p-6">
            <h1 className="text-2xl font-bold text-ink">Choose a new password</h1>
            <p className="mt-1 text-sm text-slate-600">
              Pick something at least 8 characters long. We&apos;ll log you in
              with it after you save.
            </p>

            <div className="mt-5">
              <ResetPasswordForm token={params.token} />
            </div>

            <p className="mt-5 text-center text-sm text-slate-600">
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
