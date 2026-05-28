'use client';

import { cn } from '@/lib/utils';

interface Props {
  value: 'STANDARD' | 'SCANNER';
  onChange: (v: 'STANDARD' | 'SCANNER') => void;
}

const OPTIONS: Array<{
  value: 'STANDARD' | 'SCANNER';
  title: string;
  description: string;
}> = [
  {
    value: 'STANDARD',
    title: 'Standard',
    description: 'Full access to the web and mobile applications. Cannot be used on a scanner.',
  },
  {
    value: 'SCANNER',
    title: 'Scanner',
    description: 'Can be used with a CashTraka scanner. Cannot be used with the web or mobile application.',
  },
];

export function UserTypeRadio({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-[12px] text-brand-900">
        The first two users are included in your plan, subsequent users will
        cost <strong>0 NGN</strong> per month.
      </div>
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex w-full items-start gap-3 rounded-xl border bg-white px-4 py-4 text-left transition-colors',
              active ? 'border-brand-500 ring-1 ring-brand-300' : 'border-slate-200 hover:border-slate-300',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                active ? 'border-brand-500' : 'border-slate-300',
              )}
            >
              {active && <span className="h-2 w-2 rounded-full bg-brand-500" />}
            </span>
            <span className="flex-1">
              <span className="block text-[14px] font-semibold text-slate-900">{o.title}</span>
              <span className="mt-0.5 block text-[12px] text-slate-600">{o.description}</span>
            </span>
            <span className={cn('shrink-0 text-[12px] font-semibold', active ? 'text-brand-700' : 'text-slate-700')}>
              Included
            </span>
          </button>
        );
      })}
    </div>
  );
}
