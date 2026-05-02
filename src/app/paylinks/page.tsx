import Link from 'next/link';
import { Send, Plus, Clock, CheckCircle2, Eye, XCircle, ExternalLink } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { paylinkService, whatsappPayLink } from '@/lib/services/paylink.service';
import { formatNaira, formatDate } from '@/lib/format';
import { PayLinkActions } from '@/components/paylinks/PayLinkActions';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'text-owed-600 bg-owed-50', icon: Clock },
  viewed: { label: 'Viewed', color: 'text-brand-600 bg-brand-50', icon: Eye },
  claimed: { label: 'Claimed', color: 'text-purple-600 bg-purple-50', icon: CheckCircle2 },
  confirmed: { label: 'Confirmed', color: 'text-success-600 bg-success-50', icon: CheckCircle2 },
  expired: { label: 'Expired', color: 'text-slate-500 bg-slate-50', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-600 bg-red-50', icon: XCircle },
};

export default async function PayLinksPage() {
  const user = await guard();
  const [{ items, total }, stats] = await Promise.all([
    paylinkService.list(user.id, { take: 100 }),
    paylinkService.stats(user.id),
  ]);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">PayLinks</h1>
          <p className="text-sm text-slate-500">
            Send payment request links via WhatsApp or Email, customers tap to pay
          </p>
        </div>
        <Link
          href="/paylinks/new"
          className="inline-flex items-center gap-2 rounded-xl bg-success-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-success-700"
        >
          <Plus size={16} />
          New PayLink
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-owed-600">{stats.pending}</p>
          <p className="text-xs text-slate-500">Pending</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-purple-600">{stats.claimed}</p>
          <p className="text-xs text-slate-500">Claimed (needs confirmation)</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-success-600">{stats.confirmed}</p>
          <p className="text-xs text-slate-500">Confirmed</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{formatNaira(stats.collectedAmount)}</p>
          <p className="text-xs text-slate-500">Collected via PayLinks</p>
        </div>
      </div>

      {/* Link List */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Send size={18} className="text-slate-400" />
            Payment Links ({total})
          </h2>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Send size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500 mb-4">
              No payment links yet. Create one and share it via WhatsApp.
            </p>
            <Link
              href="/paylinks/new"
              className="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-semibold text-white hover:bg-success-700"
            >
              <Plus size={16} />
              Create your first PayLink
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((pl) => {
              const style = STATUS_STYLES[pl.status] || STATUS_STYLES.pending;
              const StatusIcon = style.icon;
              const waLink = whatsappPayLink({
                phone: pl.customerPhone,
                customerName: pl.customerName,
                amount: pl.amount,
                token: pl.token,
                businessName: user.businessName || user.name,
                description: pl.description || undefined,
              });
              const appUrl = process.env.APP_URL || 'https://cashtraka.co';
              const payUrl = `${appUrl}/pay/${pl.token}`;

              return (
                <div key={pl.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.color}`}>
                    <StatusIcon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">{pl.customerName}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${style.color}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {pl.linkNumber} · {formatNaira(pl.amount)} · {pl.customerPhone}
                    </p>
                    {pl.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{pl.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-slate-900">{formatNaira(pl.amount)}</p>
                    <p className="text-[11px] text-slate-400">{formatDate(pl.createdAt)}</p>
                  </div>
                  <PayLinkActions
                    id={pl.id}
                    status={pl.status}
                    whatsappLink={waLink}
                    payUrl={payUrl}
                    customerEmail={pl.customerEmail}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}