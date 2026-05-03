import { Lock, Clock3, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { PublicFeedbackForm } from '@/components/feedback/PublicFeedbackForm';
import { feedbackPublicService } from '@/lib/services/feedback-public.service';

export const dynamic = 'force-dynamic';

const RATING_LABELS: Record<string, string> = {
  VERY_HAPPY: 'Very happy',
  HAPPY: 'Happy',
  UNHAPPY: 'Unhappy',
  VERY_UNHAPPY: 'Very unhappy',
};

const REASON_LABELS: Record<string, string> = {
  DELAY: 'Delay',
  WRONG_ITEM: 'Wrong item',
  POOR_SERVICE: 'Poor service',
  PAYMENT_ISSUE: 'Payment issue',
  OTHER: 'Other',
};

/**
 * Public feedback page. No login required. Mobile-first. Server-renders the
 * branded header for fast first paint and delegates the interactive bits
 * (rating click, reasons, submit) to PublicFeedbackForm.
 */
export default async function PublicFeedbackPage({
  params,
}: {
  params: { token: string };
}) {
  const view = await feedbackPublicService.getPublicFeedback(params.token);

  if (!view) {
    return (
      <ShellWrap>
        <Frame>
          <h2 className="text-lg font-bold text-ink">Link not found</h2>
          <p className="mt-1 text-sm text-slate-600">
            This feedback link is invalid or has been removed.
          </p>
        </Frame>
      </ShellWrap>
    );
  }

  return (
    <ShellWrap>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border">
        <div className="bg-brand-500 px-5 py-5 text-white">
          <div className="flex items-center gap-3">
            {view.logoUrl ? (
              <img
                src={view.logoUrl}
                alt={view.business}
                className="h-12 w-12 rounded-md bg-white object-contain p-1"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/20 text-lg font-bold">
                {view.business.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-lg font-bold">{view.business}</div>
              {view.reference ? (
                <div className="text-xs opacity-90">
                  Ref: <span className="font-mono">{view.reference}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-7">
          {view.expired && !view.alreadySubmitted ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
              <Clock3 size={32} className="mx-auto text-slate-500" />
              <h2 className="mt-2 text-lg font-bold text-ink">
                This link has expired
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Please reach out to the business directly if you would like to share
                feedback.
              </p>
            </div>
          ) : view.alreadySubmitted ? (
            <div className="rounded-2xl border border-success-200 bg-success-50 p-5 text-center">
              <CheckCircle2 size={32} className="mx-auto text-success-600" />
              <h2 className="mt-2 text-lg font-bold text-ink">
                Thanks for your feedback
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                You rated this:{' '}
                <span className="font-semibold">
                  {view.rating ? RATING_LABELS[view.rating] : ''}
                </span>
                {view.reason ? (
                  <>
                    {' '}
                    -{' '}
                    <span className="font-semibold">{REASON_LABELS[view.reason]}</span>
                  </>
                ) : null}
                .
              </p>
              {view.comment ? (
                <p className="mt-2 text-sm text-slate-600">"{view.comment}"</p>
              ) : null}
            </div>
          ) : (
            <PublicFeedbackForm
              token={params.token}
              customerFirstName={view.customerFirstName}
            />
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Lock size={11} /> Private feedback link
      </div>
      <div className="mt-1 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Logo size="sm" />
        <span>Powered by CashTraka</span>
      </div>
    </ShellWrap>
  );
}

function ShellWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <div className="mx-auto max-w-md px-4">{children}</div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-border">
      {children}
    </div>
  );
}
