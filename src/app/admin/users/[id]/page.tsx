import Link from 'next/link';
import { ArrowLeft, Banknote, Users, FileText, Mail, Phone, Calendar, CreditCard, Shield, Activity, BarChart3 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { SuspendButton } from '@/components/admin/SuspendButton';
import { DeleteUserButton } from '@/components/admin/DeleteUserButton';
import { AddNoteForm } from '@/components/admin/AddNoteForm';
import { PlanOverride } from '@/components/admin/PlanOverride';
import { adminService } from '@/lib/services/admin.service';
import { formatNaira, formatDate, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  const { user, totals, recentActivity, notes } = await adminService.userDetail(params.id);
  const subscriptionLabel = (user.subscriptionStatus ?? 'free').replace('_', ' ');

  return (
    <AdminShell adminName={admin.name} activePath="/admin/users">
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-ink">
        <ArrowLeft size={14} /> Back to Users
      </Link>

      <div className="mb-6 rounded-xl border border-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-ink">{user.name}</h1>
                {user.role === 'ADMIN' && (<span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-success-400">ADMIN</span>)}
                {user.isSuspended ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Suspended</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-[11px] font-bold text-success-700"><span className="h-1.5 w-1.5 rounded-full bg-success-500" />Active</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1"><Mail size={13} /> {user.email}</span>
                {user.whatsappNumber && (<span className="inline-flex items-center gap-1"><Phone size={13} /> {user.whatsappNumber}</span>)}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold capitalize text-slate-700">{user.businessType.replace('_', ' ')}</span>
                <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize', user.plan === 'free' ? 'bg-slate-100 text-slate-600' : 'bg-brand-50 text-brand-700')}>{user.plan.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
          {user.role !== 'ADMIN' && (
            <div className="flex flex-wrap gap-2">
              <SuspendButton userId={user.id} isSuspended={user.isSuspended} />
              <DeleteUserButton userId={user.id} userName={user.name} userEmail={user.email} />
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MC icon={Banknote} label="Revenue collected" value={formatNaira(totals.revenue)} color="brand" />
        <MC icon={BarChart3} label="Outstanding debt" value={formatNaira(totals.outstandingDebt)} color="danger" />
        <MC icon={Users} label="Customers" value={String(user._count?.customers ?? 0)} />
        <MC icon={FileText} label="Invoices" value={String(user._count?.invoices ?? 0)} />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Calendar size={15} className="text-slate-500" /> Account info</h3>
          <div className="space-y-2 text-sm">
            <IR label="Joined" value={formatDate(user.createdAt)} />
            <IR label="Last login" value={user.lastLoginAt ? timeAgo(user.lastLoginAt) : 'Never'} />
            <IR label="Onboarding" value={user.onboardingCompleted ? 'Completed' : 'Incomplete'} />
            <IR label="Business" value={user.businessName || 'Not set'} muted={!user.businessName} />
            <IR label="Address" value={user.businessAddress || 'Not set'} muted={!user.businessAddress} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><CreditCard size={15} className="text-brand-600" /> Subscription</h3>
          <div className="space-y-2 text-sm">
            <IR label="Status" value={subscriptionLabel} />
            <IR label="Trial ends" value={user.trialEndsAt ? formatDate(user.trialEndsAt) : 'N/A'} muted={!user.trialEndsAt} />
            <IR label="Period ends" value={user.currentPeriodEnd ? formatDate(user.currentPeriodEnd) : 'N/A'} muted={!user.currentPeriodEnd} />
            <IR label="Pending plan" value={user.pendingPlan || 'None'} muted={!user.pendingPlan} />
          </div>
        </div>
      </div>

      {user.role !== 'ADMIN' && (
        <div className="mb-6"><PlanOverride userId={user.id} currentPlan={user.plan} currentStatus={user.subscriptionStatus ?? 'free'} /></div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Activity size={16} className="text-brand-600" /> Recent activity</h2>
          {recentActivity.length === 0 ? (
            <div className="py-6 text-center"><Activity size={24} className="mx-auto mb-2 text-slate-300" /><p className="text-xs text-slate-500">No recorded payments yet</p></div>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {recentActivity.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{p.customerNameSnapshot}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{timeAgo(p.createdAt)}</span>
                      <span className={cn('rounded px-1.5 py-0.5 font-bold uppercase', p.status === 'PAID' ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-600')}>{p.status}</span>
                    </div>
                  </div>
                  <div className="num text-sm font-bold text-brand-700">{formatNaira(p.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><FileText size={16} className="text-slate-600" /> Admin notes</h2>
          <AddNoteForm userId={user.id} />
          {notes.length === 0 ? (
            <div className="mt-4 py-4 text-center"><FileText size={24} className="mx-auto mb-2 text-slate-300" /><p className="text-xs text-slate-500">No notes yet</p></div>
          ) : (
            <ul className="mt-4 max-h-80 divide-y divide-border overflow-y-auto">
              {notes.map((n) => (
                <li key={n.id} className="py-2.5 text-xs">
                  <div className="whitespace-pre-wrap text-slate-700">{n.note}</div>
                  <div className="mt-1 text-[10px] text-slate-400">by {n.author.name} &middot; {timeAgo(n.createdAt)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function MC({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string; color?: 'brand' | 'danger' }) {
  const c = color === 'brand' ? 'text-brand-600' : color === 'danger' ? 'text-red-500' : 'text-slate-500';
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-1 flex items-center gap-2"><Icon size={16} className={c} /><span className="text-[11px] font-medium text-slate-500">{label}</span></div>
      <div className="text-lg font-black text-ink">{value}</div>
    </div>
  );
}

function IR({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={cn('text-right font-medium', muted ? 'text-slate-400' : 'text-ink')}>{value}</span>
    </div>
  );
}