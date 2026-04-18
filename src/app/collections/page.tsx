import {
  Target,
  AlertTriangle,
  ArrowUp,
  TrendingUp,
  Clock,
  MessageCircle,
  Send,
  Check,
  Phone,
} from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { getCollectionQueue } from '@/lib/services/collection.service';
import { formatNaira } from '@/lib/format';
import { CollectionActions } from '@/components/collections/CollectionActions';

export const dynamic = 'force-dynamic';

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: 'bg-red-50', text: 'text-red-700', label: 'Urgent' },
  high: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'High' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Medium' },
  low: { bg: 'bg-slate-50', text: 'text-slate-600', label: 'Low' },
};

export default async function CollectionsPage() {
  const user = await guard();
  const queue = await getCollectionQueue(user.id);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Collections</h1>
        <p className="text-sm text-slate-500">
          Smart queue of outstanding payments — prioritized by urgency
        </p>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border bg-white p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-slate-900">{formatNaira(queue.totalOutstanding)}</p>
          <p className="text-xs text-slate-500">Total Outstanding</p>
        </div>
        <div className="rounded-xl border bg-red-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-red-700">{queue.urgentCount}</p>
          <p className="text-xs text-red-600">Urgent</p>
        </div>
        <div className="rounded-xl border bg-amber-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-amber-700">{queue.highCount}</p>
          <p className="text-xs text-amber-600">High</p>
        </div>
        <div className="rounded-xl border bg-blue-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-blue-700">{queue.mediumCount}</p>
          <p className="text-xs text-blue-600">Medium</p>
        </div>
        <div className="rounded-xl border bg-slate-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-600">{queue.lowCount}</p>
          <p className="text-xs text-slate-500">Low</p>
        </div>
      </div>

      {/* Collection Queue */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Target size={18} className="text-slate-400" />
            Collection Queue ({queue.items.length} items)
          </h2>
        </div>

        {queue.items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Check size={32} className="mx-auto mb-3 text-green-400" />
            <p className="text-sm font-medium text-slate-700">All clear!</p>
            <p className="text-xs text-slate-500 mt-1">
              No outstanding collections at the moment.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {queue.items.map((item) => {
              const pri = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.low;
              return (
                <div key={`${item.type}-${item.id}`} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50">
                  {/* Priority indicator */}
                  <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${pri.bg}`}>
                    {item.priority === 'urgent' ? (
                      <AlertTriangle size={16} className={pri.text} />
                    ) : item.priority === 'high' ? (
                      <ArrowUp size={16} className={pri.text} />
                    ) : (
                      <Clock size={16} className={pri.text} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">
                        {item.customerName}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${pri.bg} ${pri.text}`}>
                        {pri.label}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {item.type === 'paylink' ? 'PayLink' : 'Debt'}
                      </span>
                      {item.status === 'claimed' && (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                          Claimed — confirm!
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.customerPhone}
                      {item.daysOverdue > 0 && ` · ${item.daysOverdue} day${item.daysOverdue > 1 ? 's' : ''} overdue`}
                      {item.amountPaid > 0 && ` · ${formatNaira(item.amountPaid)} paid`}
                    </p>
                    <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 inline-block rounded px-2 py-0.5">
                      {item.suggestedAction}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-slate-900">{formatNaira(item.remaining)}</p>
                    {item.amount !== item.remaining && (
                      <p className="text-[11px] text-slate-400">of {formatNaira(item.amount)}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <CollectionActions item={item} businessName={user.businessName || user.name} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
