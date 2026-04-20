import { Check, Shield, AlertTriangle, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  verified: boolean;
  claimed?: boolean;
  method?: string | null;
  size?: 'sm' | 'md';
};

/**
 * Shows the verification state of a payment. We distinguish:
 *   • Bank-matched: strongest signal (auto-verified from a parsed alert)
 *   • Manually confirmed: seller asserted receipt without bank proof
 *   • Customer claimed: /pay/[code] was tapped by the customer, but not yet verified
 *   • Unverified: no signal at all — do NOT ship
 */
export function VerificationBadge({ verified, claimed, method, size = 'sm' }: Props) {
  const base =
    size === 'sm'
      ? 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold'
      : 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold';

  if (verified) {
    const bankMatched =
      method === 'REFERENCE_MATCH' || method === 'SENDER_MATCH' || method === 'BANK_ALERT';
    return (
      <span
        className={cn(
          base,
          bankMatched ? 'bg-success-50 text-success-700' : 'bg-brand-50 text-brand-700',
        )}
        title={bankMatched ? 'Bank alert confirmed' : 'Manually confirmed'}
      >
        {bankMatched ? <Shield size={size === 'sm' ? 10 : 12} /> : <Check size={size === 'sm' ? 10 : 12} />}
        {bankMatched ? 'Bank-verified' : 'Confirmed'}
      </span>
    );
  }
  if (claimed) {
    return (
      <span
        className={cn(base, 'bg-owed-50 text-owed-700')}
        title="Customer claims they paid — verify with your bank before shipping"
      >
        <Clock3 size={size === 'sm' ? 10 : 12} />
        Customer claimed
      </span>
    );
  }
  return (
    <span
      className={cn(base, 'bg-owed-50 text-owed-700')}
      title="Unverified — do not ship until bank alert confirms"
    >
      <AlertTriangle size={size === 'sm' ? 10 : 12} />
      Unverified
    </span>
  );
}
