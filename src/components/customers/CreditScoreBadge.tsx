import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCustomerCreditScore,
  type CreditBand,
} from '@/lib/services/customer-credit.service';

type Props = {
  customerId: string;
  userId: string;
};

const BAND_STYLE: Record<CreditBand, { chip: string; advice: string }> = {
  'Excellent payer': {
    chip: 'bg-success-100 text-success-800 border-success-200',
    advice: 'Yes. Safe to sell on credit.',
  },
  Reliable: {
    chip: 'bg-brand-50 text-brand-700 border-brand-100',
    advice: 'Likely yes. Keep your usual credit terms.',
  },
  'Mixed history': {
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    advice: 'Maybe. Ask for a part payment up front.',
  },
  'High risk': {
    chip: 'bg-red-50 text-red-700 border-red-200',
    advice: 'No. Ask for full payment before delivery.',
  },
  New: {
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
    advice: 'No payment history yet.',
  },
};

/**
 * Small inline credit-score badge for the customer detail page. Server
 * component that runs the credit-score service directly so we avoid an extra
 * client fetch. v1 is read-only; the chip plus a one-line "Should I sell on
 * credit?" rationale below it.
 */
export async function CreditScoreBadge({ customerId, userId }: Props) {
  const result = await getCustomerCreditScore(customerId, userId).catch(() => null);
  if (!result) return null;

  const style = BAND_STYLE[result.band];
  const isNew = result.band === 'New';
  const { onTimeCount, lateCount } = result.signals;

  const rationale = isNew
    ? 'No payment history yet.'
    : `Paid ${onTimeCount} ${onTimeCount === 1 ? 'invoice' : 'invoices'} on time, ${lateCount} late.`;

  return (
    <div className="mt-2 inline-flex flex-col gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-[11px] font-semibold',
          style.chip,
        )}
      >
        <ShieldCheck size={12} />
        Credit score: {result.label}
        {!isNew && (
          <span className="text-[10px] font-bold opacity-70">{result.score}/100</span>
        )}
      </span>
      <span className="text-[11px] text-slate-500">
        Should I sell on credit? {style.advice}
      </span>
      <span className="text-[11px] text-slate-400">{rationale}</span>
    </div>
  );
}
