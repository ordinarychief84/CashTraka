'use client';

import { useState } from 'react';
import { Smile, Meh, Frown, Angry, Loader2, CheckCircle2 } from 'lucide-react';

type Rating = 'VERY_HAPPY' | 'HAPPY' | 'UNHAPPY' | 'VERY_UNHAPPY';
type Reason = 'DELAY' | 'WRONG_ITEM' | 'POOR_SERVICE' | 'PAYMENT_ISSUE' | 'OTHER';

const RATINGS: Array<{
  value: Rating;
  label: string;
  Icon: typeof Smile;
  tone: string;
  ring: string;
}> = [
  {
    value: 'VERY_HAPPY',
    label: 'Very happy',
    Icon: Smile,
    tone: 'text-success-600 bg-success-50',
    ring: 'ring-success-500',
  },
  {
    value: 'HAPPY',
    label: 'Happy',
    Icon: Smile,
    tone: 'text-brand-600 bg-brand-50',
    ring: 'ring-brand-500',
  },
  {
    value: 'UNHAPPY',
    label: 'Unhappy',
    Icon: Meh,
    tone: 'text-amber-700 bg-amber-50',
    ring: 'ring-amber-500',
  },
  {
    value: 'VERY_UNHAPPY',
    label: 'Very unhappy',
    Icon: Frown,
    tone: 'text-red-600 bg-red-50',
    ring: 'ring-red-500',
  },
];

const REASONS: Array<{ value: Reason; label: string }> = [
  { value: 'DELAY', label: 'Delay' },
  { value: 'WRONG_ITEM', label: 'Wrong item' },
  { value: 'POOR_SERVICE', label: 'Poor service' },
  { value: 'PAYMENT_ISSUE', label: 'Payment issue' },
  { value: 'OTHER', label: 'Other' },
];

function isNegative(rating: Rating | null): boolean {
  return rating === 'UNHAPPY' || rating === 'VERY_UNHAPPY';
}

type Props = {
  token: string;
  customerFirstName: string | null;
};

export function PublicFeedbackForm({ token, customerFirstName }: Props) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!rating) return;
    if (isNegative(rating) && !reason) {
      setError('Please pick what went wrong.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/feedback/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          reason: reason ?? undefined,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not save your feedback. Please try again.');
        return;
      }
      setDone(true);
    } catch {
      setError('Network problem. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-success-200 bg-success-50 p-5 text-center">
        <CheckCircle2 size={36} className="mx-auto text-success-600" />
        <h2 className="mt-2 text-lg font-bold text-ink">Thanks for your feedback</h2>
        <p className="mt-1 text-sm text-slate-700">
          Your response helps the business serve you better.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-ink">
          {customerFirstName
            ? `Hi ${customerFirstName}, how was your experience?`
            : 'How was your experience?'}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Tap an option below. It only takes a moment.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {RATINGS.map(({ value, label, Icon, tone, ring }) => {
          const selected = rating === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                setRating(value);
                if (!isNegative(value)) setReason(null);
                setError(null);
              }}
              className={
                'flex flex-col items-center gap-2 rounded-2xl border p-5 text-center transition active:scale-[0.99] ' +
                (selected
                  ? `border-transparent ring-2 ${ring} ${tone}`
                  : 'border-slate-200 bg-white hover:border-brand-300')
              }
            >
              <Icon
                size={36}
                strokeWidth={selected ? 2.4 : 2}
                className={selected ? '' : 'text-slate-500'}
              />
              <span
                className={
                  'text-sm font-semibold ' +
                  (selected ? 'text-ink' : 'text-slate-700')
                }
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {isNegative(rating) ? (
        <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div>
            <h3 className="text-sm font-bold text-ink">What went wrong?</h3>
            <p className="text-xs text-slate-600">Pick the closest reason.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => {
              const selected = reason === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => {
                    setReason(r.value);
                    setError(null);
                  }}
                  className={
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition ' +
                    (selected
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300')
                  }
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Anything else? (optional)
            </span>
            <textarea
              className="input min-h-[80px] w-full"
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell the business what to fix"
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              {comment.length}/500
            </span>
          </label>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={!rating || submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
        Send feedback
      </button>
    </div>
  );
}
