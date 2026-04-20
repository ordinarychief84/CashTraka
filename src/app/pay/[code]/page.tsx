import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PayPageClient } from '@/components/paylinks/PayPageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pl = await prisma.paymentRequest.findUnique({
    where: { token: code },
    select: { customerName: true, amount: true },
  });
  if (\!pl) return { title: 'Payment Not Found' };
  return {
    title: `Pay \u20a6${pl.amount.toLocaleString('en-NG')} \u2014 CashTraka`,
    description: `Payment request for ${pl.customerName}`,
  };
}

export default async function PayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pl = await prisma.paymentRequest.findUnique({
    where: { token: code },
    include: {
      user: {
        select: {
          name: true,
          businessName: true,
          businessAddress: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
        },
      },
    },
  });

  if (\!pl) notFound();

  if (\!pl.viewedAt) {
    await prisma.paymentRequest.update({
      where: { id: pl.id },
      data: { status: 'viewed', viewedAt: new Date() },
    });
  }

  const isExpired = pl.expiresAt && pl.expiresAt < new Date();
  const isClosed = ['confirmed', 'cancelled', 'expired'].includes(pl.status) || isExpired;

  return (
    <div className="min-h-screen bg-gradient-to-b from-success-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success-600">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">Payment request from</p>
          <h1 className="text-lg font-bold text-slate-900">
            {pl.user.businessName || pl.user.name}
          </h1>
          {pl.user.businessAddress && (
            <p className="mt-0.5 text-xs text-slate-400">{pl.user.businessAddress}</p>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-lg">
          <div className="mb-6 text-center">
            <p className="text-sm text-slate-500 mb-1">Amount Due</p>
            <p className="text-4xl font-extrabold text-slate-900">
              \u20a6{pl.amount.toLocaleString('en-NG')}
            </p>
            {pl.description && (
              <p className="mt-2 text-sm text-slate-600">{pl.description}</p>
            )}
          </div>

          <div className="mb-6 rounded-xl bg-slate-50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">To</span>
              <span className="font-medium text-slate-700">{pl.customerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Reference</span>
              <span className="font-mono text-xs text-slate-600">{pl.linkNumber}</span>
            </div>
            {pl.user.bankName && (
              <>
                <hr className="border-slate-200" />
                <p className="text-xs font-semibold text-slate-600 uppercase">Bank Transfer Details</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Bank</span>
                  <span className="font-medium text-slate-700">{pl.user.bankName}</span>
                </div>
                {pl.user.bankAccountNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Account No.</span>
                    <span className="font-mono font-medium text-slate-700">{pl.user.bankAccountNumber}</span>
                  </div>
                )}
                {pl.user.bankAccountName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Account Name</span>
                    <span className="font-medium text-slate-700">{pl.user.bankAccountName}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <PayPageClient
            token={code}
            status={isClosed ? (isExpired ? 'expired' : pl.status) : pl.status}
          />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by CashTraka \u00b7 Secure payment requests
        </p>
      </div>
    </div>
  );
}
