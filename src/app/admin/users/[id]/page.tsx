import Link from 'next/link';
import { ArrowLeft, Wallet, Clock3, Users, FileText } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { SuspendButton } from '@/components/admin/SuspendButton';
import { AddNoteForm } from '@/components/admin/AddNoteForm';
import { PlanOverride } from '@/components/admin/PlanOverride';
import { adminService } from '@/lib/services/admin.service';
import { StatCard } from '@/components/StatCard';
import { formatNaira, formatDate, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  const { user, totals, recentActivity, notes } = await adminService.userDetail(params.id);

  return (
    <AdminShell adminName={admin.name}>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-ink"
      >
        <ArrowLeft size={14} />
        All users
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">
            {user.name}
            {user.role === 'ADMIN' && (
              <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 align-middle text-[10px] font-bold text-lime-400">
                ADMIN
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {user.email} · {user.businessName || <em className="text-slate-400">No business name</em>}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 capitalize">
              {user.businessType.replace('_', ' ')}
            </span>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
              {user.plan}
            </span>
            {user.isSuspended ? (
              <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                Suspended
              </span>
            ) : (
              <span className="rounded-full bg-success-50 px-2 py-0.5 font-semibold text-success-700">
                Active
              </span>
            )}
          </div>
        </div>
        {user.role !== 'ADMIN' && (
          <SuspendButton userId={user.id} isSuspended={user.isSuspended} />
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Revenue collected" value={formatNaira(totals.revenue)} tone="brand" />
        <StatCard
          label="Outstanding debt"
          value={formatNaira(totals.outstandingDebt)}
          tone="danger"
        />
        <StatCard label="Customers" value={String(user._count?.customers ?? 0)} />
        <StatCard label="Invoices" value={String(user._count?.invoices ?? 0)} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 text-xs">
        <Meta label="Joined" value={formatDate(user.createdAt)} />
        <Meta label="Last login" value={user.lastLoginAt ? timeAgo(user.lastLoginAt) : 'Never'} />
        <Meta label="Onboarding" value={user.onboardingCompleted ? 'Completed' : 'Incomplete'} />
        <Meta label="WhatsApp" value={user.whatsappNumber || '—'} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 text-xs">
        <Meta label="Subscription" value={(user.subscriptionStatus ?? 'free').replace('_', ' ')} />
        <Meta
          label="Trial ends"
          value={user.trialEndsAt ? formatDate(user.trialEndsAt) : '—'}
        />
        <Meta
          label="Period ends"
          value={user.currentPeriodEnd ? formatDate(user.currentPeriodEnd) : '—'}
        />
        <Meta label="Pending plan" value={user.pendingPlan || '—'} />
      </div>

      <div className="mb-6">
        {user.role !== 'ADMIN' && (
          <PlanOverride
            userId={user.id}
            currentPlan={user.plan}
            currentStatus={user.subscriptionStatus ?? 'free'}
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <Wallet size={16} className="text-brand-600" />
            Recent activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-500">No recorded payments.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {recentActivity.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">
                      {p.customerNameSnapshot}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {timeAgo(p.createdAt)} · {p.status}
                    </div>
                  </div>
                  <div className="num text-sm text-brand-700">{formatNaira(p.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <FileText size={16} className="text-slate-600" />
            Admin notes
          </h2>
          <AddNoteForm userId={user.id} />
          {notes.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">No notes yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {notes.map((n) => (
                <li key={n.id} className="py-2 text-xs">
                  <div className="whitespace-pre-wrap text-slate-700">{n.note}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    by {n.author.name} · {timeAgo(n.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}
