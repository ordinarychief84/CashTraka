import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { VerifyEmailForm } from '@/components/VerifyEmailForm';

export const dynamic = 'force-dynamic';

export default async function VerifyEmailPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.emailVerified) redirect('/onboarding');

  // Mask the email for display: "s****e@gmail.com"
  const [local, domain] = user.email.split('@');
  const masked =
    local.length <= 2
      ? local + '***'
      : local[0] + '•'.repeat(Math.min(local.length - 2, 4)) + local.slice(-1);
  const displayEmail = `${masked}@${domain}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="card p-6 md:p-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <svg
              className="h-7 w-7 text-brand-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-ink">Check your email</h1>
          <p className="mt-1 text-sm text-slate-600">
            We sent a 6-digit code to <strong>{displayEmail}</strong>. Enter it
            below to verify your account.
          </p>
          <div className="mt-6">
            <VerifyEmailForm />
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Didn't get the email? Check spam, or request a new code above.
        </p>
      </div>
    </div>
  );
}
