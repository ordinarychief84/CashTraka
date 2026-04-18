import { notFound } from 'next/navigation';
import { Check, Clock3, Copy, Shield } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Logo } from '@/components/Logo';
import { formatNaira, formatDateTime } from '@/lib/format';
import { ClaimButton } from '@/components/ClaimButton';
import { CopyButton } from '@/components/CopyButton';

export const dynamic = 'force-dynamic';

type Props = { params: { code: string } };

export default async function PayPage({ params }: Props) {
  const payment = await prisma.payment.findUnique({
    where: { referenceCode: params.code },
    include: {
      user: {
        select: {
          name: true,
          businessName: true,
          whatsappNumber: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
        },
      },
    },
  });
  if (!payment) notFound();

  const business = payment.user.businessName || payment.user.name;
  const hasBank =
    payment.user.bankName &&
    payment.user.bankAccountNumber &&
    payment.user.bankAccountName;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-md px-4">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-border">
          {/* Header */}
          <div className="border-b border-border px-6 py-5 text-center">
            <Logo size="md" className="mx-auto" />
            <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payment request
            </div>
            <h1 className="mt-1 text-xl font-bold text-ink">{business}</h1>
          </div>

          {/* Amount */}
          <div className="px-6 py-6 text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Amount to pay
            </div>
            <div className="num mt-1 text-4xl text-brand-600">
              {formatNaira(payment.amount)}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              for {payment.customerNameSnapshot}
            </div>
          </div>

          {/* Bank details */}
          {hasBank ? (
            <div className="mx-6 mb-5 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Send transfer to
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <Row label="Bank" value={payment.user.bankName!} />
                <Row
                  label="Account number"
                  value={payment.user.bankAccountNumber!}
                  copyable
                />
                <Row label="Account name" value={payment.user.bankAccountName!} />
              </div>
            </div>
          ) : (
            <div className="mx-6 mb-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Ask {business} on WhatsApp for bank details.
            </div>
          )}

          {/* Reference code callout */}
          <div className="mx-6 mb-6 rounded-xl border-2 border-dashed border-owed-500/60 bg-owed-50 p-4">
            <div className="flex items-start gap-2">
              <Shield size={18} className="mt-0.5 shrink-0 text-owed-600" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-owed-700">
                  Add this reference to your transfer
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-white px-3 py-2 text-center font-mono text-base font-bold text-ink">
                    {payment.referenceCode}
                  </code>
                  <CopyButton
                    value={payment.referenceCode!}
                    label="Copy code"
                    className="shrink-0"
                  />
                </div>
                <p className="mt-2 text-xs text-owed-700/90">
                  Type this code into the narration / remark field of your transfer.
                  Without it, {business} cannot match your payment to you.
                </p>
              </div>
            </div>
          </div>

          {/* Status + action */}
          <div className="border-t border-border px-6 py-5">
            {payment.verified ? (
              <div className="flex items-center gap-2 rounded-lg bg-success-50 px-3 py-3 text-sm font-semibold text-success-700">
                <Check size={16} />
                Payment received and confirmed by {business}.
              </div>
            ) : payment.claimedAt ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-3 text-sm text-slate-700">
                  <Clock3 size={16} />
                  You confirmed payment on{' '}
                  <span className="font-semibold">
                    {formatDateTime(payment.claimedAt)}
                  </span>
                  . {business} will verify with their bank and follow up.
                </div>
                <p className="text-xs text-slate-500">
                  Please keep your transfer receipt until {business} confirms receipt.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <ClaimButton code={payment.referenceCode!} />
                <p className="text-center text-xs text-slate-500">
                  Tap after you’ve sent the transfer. {business} will verify
                  against their bank alert before releasing goods.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Logo size="sm" />
          <span>Protected by CashTraka</span>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="flex items-center gap-2 font-semibold text-ink">
        <span className="font-mono">{value}</span>
        {copyable && <CopyButton value={value} label="Copy" small />}
      </span>
    </div>
  );
}
