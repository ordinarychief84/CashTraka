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
  Gauge,
  Bell,
  Zap,
  Users,
} from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { getCollectionQueue } from '@/lib/services/collection.service';
import { collectionScoreService } from '@/lib/services/collection-score.service';
import { reminderService } from '@/lib/services/reminder.service';
import { behaviorService } from '@/lib/services/behavior.service';
import { formatNaira } from '@/lib/format';
import { CollectionActions } from '@/components/collections/CollectionActions';
import { limitsFor, effectivePlan } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: 'bg-red-50', text: 'text-red-700', label: 'Urgent' },
  high: { bg: 'bg-owed-50', text: 'text-owed-700', label: 'High' },
  medium: { bg: 'bg-brand-50', text: 'text-brand-700', label: 'Medium' },
  low: { bg: 'bg-slate-50', text: 'text-slate-600', label: 'Low' },
};

export default async function CollectionsPage() {
  const user = await guard();
  const eff = effectivePlan(user);
  const limits = limitsFor(eff.plan);
  const hasPaidFeatures = limits.collectionScore;

  const [queue, reminderStats, behaviorBreakdown, collectionScore] = await Promise.all([
    getCollectionQueue(user.id),
    reminderService.stats(user.id),
    hasPaidFeatures ? behaviorService.breakdown(user.id) : null,
    hasPaidFeatures ? collectionScoreService.getLatest(user.id) : null,
  ]);

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

      {/* Collection Score + Reminders banner (paid plans) */}
      {collectionScore && (
        <div className="mb-6 rounded-xl border bg-gradient-to-r from-success-50 to-success-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                <span className="text-2xl font-bold text-success-700">{collectionScore.score}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Collection Score</p>
                <p className="text-xs text-slate-500">
                  {collectionScore.trend === 'up' && '↑ Improving'}
                  {collectionScore.trend === 'down' && '↓ Declining'}
                  {collectionScore.trend === 'stable' && '→ Stable'}
                  {collectionScore.previousScore !== null && ` (was ${collectionScore.previousScore})`}
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-center text-xs">
              <div>
                <p className="text-lg font-bold text-slate-800">{collectionScore.onTimeRate}%</p>
                <p className="text-slate-500">On-time</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{collectionScore.avgCollectionDays}d</p>
                <p className="text-slate-500">Avg collect</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{reminderStats.activeRules}</p>
                <p className="text-slate-500">Active rules</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{reminderStats.last7Days}</p>
                <p className="text-slate-500">Sent (7d)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Behavior breakdown (paid plans) */}
      {behaviorBreakdown && behaviorBreakdown.total > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border bg-success-50 p-3 shadow-sm text-center">
            <p className="text-lg font-bold text-success-700">{behaviorBreakdown.fastPayer}</p>
            <p className="text-[10px] font-medium text-success-600">Fast Payers</p>
          </div>
          <div className="rounded-xl border bg-red-50 p-3 shadow-sm text-center">
            <p className="text-lg font-bold text-red-700">{behaviorBreakdown.latePayer}</p>
            <p className="text-[10px] font-medium text-red-600">Late Payers</p>
          </div>
          <div className="rounded-xl border bg-slate-50 p-3 shadow-sm text-center">
            <p className="text-lg font-bold text-slate-600">{behaviorBreakdown.dormant}</p>
            <p className="text-[10px] font-medium text-slate-500">Dormant</p>
          </div>
          <div className="rounded-xl border bg-purple-50 p-3 shadow-sm text-center">
            <p className="text-lg font-bold text-purple-700">{behaviorBreakdown.highValue}</p>
            <p className="text-[10px] font-medium text-purple-600">High Value</p>
          </div>
          <div className="rounded-xl border bg-brand-50 p-3 shadow-sm text-center">
            <p className="text-lg font-bold text-brand-700">{behaviorBreakdown.new}</p>
            <p className="text-[10px] font-medium text-brand-600">New</p>
          </div>
        </div>
      )}

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
        <div className="rounded-xl border bg-owed-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-owed-700">{queue.highCount}</p>
          <p className="text-xs text-owed-600">High</p>
        </div>
        <div className="rounded-xl border bg-brand-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-brand-700">{queue.mediumCount}</p>
          <p className="text-xs text-brand-600">Medium</p>
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
            <Check size={32} className="mx-auto mb-3 text-success-400" />
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
                        {item.type === 'paylink' ? 'PayLink' : item.type === 'promise' ? 'Promise' : 'Debt'}
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
                    <p className="mt-1.5 text-xs text-owed-700 bg-owed-50 inline-block rounded px-2 py-0.5">
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
