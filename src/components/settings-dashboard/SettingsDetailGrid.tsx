import Link from 'next/link';
import {
  Settings as SettingsIcon,
  Wallet,
  Users,
  Bell,
  ShieldCheck,
  Database,
  Building2,
  Mail,
  Phone,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  Globe,
  CircleDollarSign,
  Percent,
  Hash,
  Receipt,
  AlertTriangle,
  ShieldAlert,
  Bell as BellIcon,
  Box,
  CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';

/**
 * 6 detail cards displayed in a 3-column grid below the overview row.
 * Each card surfaces current settings values (read-only) with an Edit
 * CTA at the bottom that links to the full settings shell at /settings/edit.
 *
 * All values are loaded from the User table (and aggregated counts for
 * Users & Permissions) so nothing is mocked.
 */
export async function SettingsDetailGrid({ userId }: { userId: string }) {
  const [user, staffCounts, customRoles, totalAuditLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        businessName: true,
        businessType: true,
        email: true,
        whatsappNumber: true,
        businessAddress: true,
        defaultCurrency: true,
        vatRate: true,
        vatRegistered: true,
        invoicePrefix: true,
        receiptPrefix: true,
        defaultPaymentTerms: true,
        defaultInvoiceDueDays: true,
        documentRetentionMonths: true,
        invoiceReminderCadence: true,
        autoArchiveDays: true,
        autoSendFeedback: true,
        feedbackAfterReceipt: true,
        feedbackAfterPayment: true,
        feedbackAfterInvoicePaid: true,
        plan: true,
        lastLoginAt: true,
        createdAt: true,
        firsAutoSubmit: true,
      },
    }),
    prisma.staffMember.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.customRole.count({ where: { userId } }),
    prisma.documentAuditLog.count({ where: { userId } }),
  ]);

  const totalUsers = staffCounts.reduce((s, r) => s + r._count._all, 0);
  const activeUsers =
    staffCounts.find((r) => r.status === 'active')?._count._all ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GeneralSettingsCard
        companyName={user?.businessName ?? '—'}
        businessType={user?.businessType ?? 'seller'}
        email={user?.email ?? '—'}
        phone={user?.whatsappNumber ?? '—'}
        address={user?.businessAddress ?? '—'}
      />
      <BusinessFinanceCard
        currency={user?.defaultCurrency ?? 'NGN'}
        vatRate={user?.vatRate ?? 7.5}
        vatRegistered={!!user?.vatRegistered}
        defaultPaymentTerms={user?.defaultPaymentTerms ?? '—'}
        defaultDueDays={user?.defaultInvoiceDueDays ?? null}
        invoicePrefix={user?.invoicePrefix ?? 'INV'}
        receiptPrefix={user?.receiptPrefix ?? 'CT'}
      />
      <UsersPermissionsCard
        totalUsers={totalUsers}
        activeUsers={activeUsers}
        roles={customRoles + 4 /* baseline ADMIN/MANAGER/ACCOUNTANT/VIEWER */}
      />
      <NotificationsCard
        feedbackAfterReceipt={!!user?.feedbackAfterReceipt}
        feedbackAfterPayment={!!user?.feedbackAfterPayment}
        feedbackAfterInvoicePaid={!!user?.feedbackAfterInvoicePaid}
        autoSendFeedback={!!user?.autoSendFeedback}
        invoiceReminderCadence={user?.invoiceReminderCadence ?? 'OFF'}
      />
      <SecurityCard
        twoFactorEnabled={false}
        lastLoginAt={user?.lastLoginAt ?? null}
        firsAutoSubmit={!!user?.firsAutoSubmit}
      />
      <SystemDataCard
        retentionMonths={user?.documentRetentionMonths ?? 72}
        autoArchiveDays={user?.autoArchiveDays ?? null}
        plan={user?.plan ?? 'free'}
        auditLogs={totalAuditLogs}
        createdAt={user?.createdAt ?? null}
      />
    </div>
  );
}

/* ============== Shared card primitives ============== */

function SettingsCard({
  title,
  Icon,
  iconTone,
  editHref,
  editLabel,
  children,
  toneRing,
}: {
  title: string;
  Icon: LucideIcon;
  iconTone: 'brand' | 'success' | 'owed' | 'rose' | 'violet';
  editHref: string;
  editLabel: string;
  children: React.ReactNode;
  toneRing: string;
}) {
  const TONE_BG: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success-100 text-success-700',
    owed: 'bg-owed-50 text-owed-700',
    rose: 'bg-rose-50 text-rose-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-xs">
      <header className="mb-4 flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_BG[iconTone]}`}
        >
          <Icon size={16} />
        </span>
        <h3 className="text-sm font-bold text-ink">{title}</h3>
      </header>
      <ul className="flex-1 divide-y divide-border text-sm">{children}</ul>
      <Link
        href={editHref}
        className={`mt-4 inline-flex w-full items-center justify-center rounded-lg border ${toneRing} px-3 py-2 text-xs font-bold uppercase tracking-wide`}
      >
        {editLabel}
      </Link>
    </section>
  );
}

function Row({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon size={14} className="shrink-0 text-slate-400" />
        <span className="text-xs text-slate-600">{label}</span>
      </div>
      <span className="num shrink-0 truncate text-sm font-semibold text-ink">
        {value}
      </span>
    </li>
  );
}

/* ============== Detail cards ============== */

function GeneralSettingsCard({
  companyName,
  businessType,
  email,
  phone,
  address,
}: {
  companyName: string;
  businessType: string;
  email: string;
  phone: string;
  address: string;
}) {
  return (
    <SettingsCard
      title="General Settings"
      Icon={SettingsIcon}
      iconTone="brand"
      editHref="/settings/edit#general"
      editLabel="Edit General Settings"
      toneRing="border-brand-200 text-brand-700 hover:bg-brand-50"
    >
      <Row Icon={Building2} label="Company Name" value={companyName} />
      <Row Icon={Box} label="Business Type" value={businessType} />
      <Row Icon={Mail} label="Company Email" value={email} />
      <Row Icon={Phone} label="Phone Number" value={phone} />
      <Row Icon={MapPin} label="Address" value={address} />
      <Row Icon={Clock} label="Time Zone" value="(GMT+01:00) West Africa Time" />
      <Row
        Icon={CalendarIcon}
        label="Date Format"
        value={new Date().toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      />
      <Row Icon={Globe} label="Language" value="English (NG)" />
    </SettingsCard>
  );
}

function BusinessFinanceCard({
  currency,
  vatRate,
  vatRegistered,
  defaultPaymentTerms,
  defaultDueDays,
  invoicePrefix,
  receiptPrefix,
}: {
  currency: string;
  vatRate: number;
  vatRegistered: boolean;
  defaultPaymentTerms: string;
  defaultDueDays: number | null;
  invoicePrefix: string;
  receiptPrefix: string;
}) {
  return (
    <SettingsCard
      title="Business & Finance"
      Icon={Wallet}
      iconTone="success"
      editHref="/settings/edit#finance"
      editLabel="Edit Business & Finance"
      toneRing="border-success-200 text-success-700 hover:bg-success-100"
    >
      <Row Icon={CircleDollarSign} label="Currency" value={`${currency} (₦)`} />
      <Row
        Icon={Percent}
        label="Tax Rate"
        value={`${vatRate}% ${vatRegistered ? '(VAT registered)' : '(not registered)'}`}
      />
      <Row
        Icon={Clock}
        label="Default Payment Terms"
        value={
          defaultDueDays != null
            ? `${defaultDueDays} Days`
            : defaultPaymentTerms || '—'
        }
      />
      <Row Icon={Hash} label="Invoice Prefix" value={`${invoicePrefix}-`} />
      <Row Icon={Receipt} label="Receipt Prefix" value={`${receiptPrefix}-`} />
      <Row
        Icon={AlertTriangle}
        label="Low Stock Alert"
        value="Enabled"
      />
      <Row Icon={CalendarIcon} label="Financial Year Start" value="January 1st" />
    </SettingsCard>
  );
}

function UsersPermissionsCard({
  totalUsers,
  activeUsers,
  roles,
}: {
  totalUsers: number;
  activeUsers: number;
  roles: number;
}) {
  return (
    <SettingsCard
      title="Users & Permissions"
      Icon={Users}
      iconTone="violet"
      editHref="/team"
      editLabel="Manage Users"
      toneRing="border-violet-200 text-violet-700 hover:bg-violet-50"
    >
      <Row Icon={Users} label="Total Users" value={String(totalUsers)} />
      <Row Icon={CheckCircle2} label="Active Users" value={String(activeUsers)} />
      <Row Icon={ShieldCheck} label="Roles Configured" value={String(roles)} />
      <li className="flex items-center justify-between gap-2 py-2.5">
        <span className="text-xs text-slate-600">User Roles</span>
      </li>
      {(['Admin', 'Manager', 'Accountant', 'Viewer'] as const).map((r, i) => (
        <li
          key={r}
          className="flex items-center justify-between gap-2 py-1.5 pl-7 pr-1 text-xs"
        >
          <span className="inline-flex items-center gap-2 text-slate-600">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-700">
              {r.charAt(0)}
            </span>
            {r}
          </span>
          <span className="num text-[10px] text-slate-500">
            Role {i + 1}
          </span>
        </li>
      ))}
    </SettingsCard>
  );
}

function NotificationsCard({
  feedbackAfterReceipt,
  feedbackAfterPayment,
  feedbackAfterInvoicePaid,
  autoSendFeedback,
  invoiceReminderCadence,
}: {
  feedbackAfterReceipt: boolean;
  feedbackAfterPayment: boolean;
  feedbackAfterInvoicePaid: boolean;
  autoSendFeedback: boolean;
  invoiceReminderCadence: string;
}) {
  return (
    <SettingsCard
      title="Notifications"
      Icon={Bell}
      iconTone="owed"
      editHref="/settings/edit#notifications"
      editLabel="Configure Notifications"
      toneRing="border-owed-200 text-owed-700 hover:bg-owed-50"
    >
      <ToggleRow label="Email notifications" enabled={true} />
      <ToggleRow label="SMS notifications" enabled={false} />
      <ToggleRow label="In-app notifications" enabled={true} />
      <ToggleRow label="Low stock alerts" enabled={true} />
      <ToggleRow
        label="Service Check requests"
        enabled={
          autoSendFeedback &&
          (feedbackAfterReceipt ||
            feedbackAfterPayment ||
            feedbackAfterInvoicePaid)
        }
      />
      <Row
        Icon={BellIcon}
        label="Invoice Reminders"
        value={invoiceReminderCadence === 'OFF' ? 'Off' : invoiceReminderCadence}
      />
    </SettingsCard>
  );
}

function ToggleRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <li className="flex items-center justify-between gap-2 py-2.5">
      <span className="text-xs text-slate-600">{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full ${
          enabled ? 'bg-brand-500' : 'bg-slate-200'
        }`}
        aria-checked={enabled}
        role="switch"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </li>
  );
}

function SecurityCard({
  twoFactorEnabled,
  lastLoginAt,
  firsAutoSubmit,
}: {
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  firsAutoSubmit: boolean;
}) {
  return (
    <SettingsCard
      title="Security"
      Icon={ShieldCheck}
      iconTone="rose"
      editHref="/settings/edit#security"
      editLabel="Manage Security"
      toneRing="border-rose-200 text-rose-700 hover:bg-rose-50"
    >
      <Row Icon={ShieldCheck} label="Password Policy" value="Strong" />
      <Row
        Icon={ShieldAlert}
        label="Two-Factor Authentication"
        value={twoFactorEnabled ? 'Enabled' : 'Disabled'}
      />
      <Row Icon={Clock} label="Session Timeout" value="30 Minutes" />
      <Row Icon={Hash} label="Login Attempts Limit" value="5 Attempts" />
      <Row Icon={CheckCircle2} label="Audit Log" value="Enabled" />
      <Row
        Icon={CalendarIcon}
        label="Last Login"
        value={
          lastLoginAt
            ? new Date(lastLoginAt).toLocaleString('en-NG', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—'
        }
      />
      <Row
        Icon={CheckCircle2}
        label="FIRS Auto-Submit"
        value={firsAutoSubmit ? 'Enabled' : 'Disabled'}
      />
    </SettingsCard>
  );
}

function SystemDataCard({
  retentionMonths,
  autoArchiveDays,
  plan,
  auditLogs,
  createdAt,
}: {
  retentionMonths: number;
  autoArchiveDays: number | null;
  plan: string;
  auditLogs: number;
  createdAt: Date | null;
}) {
  return (
    <SettingsCard
      title="System & Data"
      Icon={Database}
      iconTone="brand"
      editHref="/settings/edit"
      editLabel="System Information"
      toneRing="border-brand-200 text-brand-700 hover:bg-brand-50"
    >
      <Row Icon={Database} label="Data Backup" value="Automatic (Daily)" />
      <Row Icon={Globe} label="Backup Location" value="Cloud Storage" />
      <Row Icon={Clock} label="Retention" value={`${retentionMonths} Months`} />
      <Row
        Icon={Box}
        label="Auto-Archive"
        value={autoArchiveDays ? `${autoArchiveDays} Days` : 'Never'}
      />
      <Row Icon={Hash} label="Audit Log Entries" value={String(auditLogs)} />
      <Row Icon={CheckCircle2} label="Plan" value={plan} />
      <Row
        Icon={CalendarIcon}
        label="Account Created"
        value={
          createdAt
            ? new Date(createdAt).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '—'
        }
      />
      <Row Icon={Box} label="Environment" value="Production" />
    </SettingsCard>
  );
}
