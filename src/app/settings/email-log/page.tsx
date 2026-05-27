import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { EmailLogTable, type EmailLogRow } from '@/components/settings/EmailLogTable';
import { listEmailLogsForUser } from '@/lib/services/email-log.service';

export const dynamic = 'force-dynamic';

export default async function SettingsEmailLogPage() {
  const user = await guardWithPermission('settings.read');
  const rows = await listEmailLogsForUser(user.id, { take: 100 });
  const initial: EmailLogRow[] = rows.map((r) => ({
    id: r.id,
    toEmail: r.toEmail,
    fromEmail: r.fromEmail,
    subject: r.subject,
    status: r.status,
    category: r.category,
    errorReason: r.errorReason,
    sentAt: r.sentAt.toISOString(),
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <SettingsSubNav />
        <div className="flex-1 min-w-0">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-ink">E-mail log</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Delivery history for receipts, invoices and reminders sent via
              Resend. Status updates flow in via the Resend webhook
              ({' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-700">
                POST /api/webhooks/resend
              </code>
              {' '}).
            </p>
          </div>

          <EmailLogTable initialRows={initial} />
        </div>
      </div>
    </AppShell>
  );
}
