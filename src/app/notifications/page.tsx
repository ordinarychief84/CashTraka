import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { notificationService } from '@/lib/services/notification.service';
import { MarkAllReadButton } from '@/components/MarkAllReadButton';
import { StatusFilterNavSelect } from '@/components/ui/StatusFilterNavSelect';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

type SP = { filter?: string };

export default async function NotificationsPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const unreadOnly = searchParams.filter === 'unread';
  const { rows: notifications, total, unread } = await notificationService.listForUser(
    user.id,
    { unreadOnly, take: 200 },
  );

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Notifications"
        subtitle={`${total} notification${total === 1 ? '' : 's'}${unread > 0 ? ` · ${unread} unread` : ''}`}
        action={
          unread > 0 ? (
            <MarkAllReadButton />
          ) : undefined
        }
      />

      <div className="mb-4">
        <StatusFilterNavSelect
          label="Show"
          current={unreadOnly ? 'unread' : ''}
          baseHref="/notifications"
          paramName="filter"
          options={[
            { value: '', label: 'All notifications' },
            { value: 'unread', label: `Unread${unread > 0 ? ` (${unread})` : ''}` },
          ]}
        />
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          description={
            unreadOnly
              ? "You're all caught up."
              : "We'll let you know about low stock, completed production, payments, and other things that need attention."
          }
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const tone = typeTone(n.type);
            const Card = n.link ? Link : 'div';
            const cardProps = n.link ? { href: n.link } : {};
            return (
              <li key={n.id}>
                {/* @ts-expect-error - Card is conditionally Link or div */}
                <Card
                  {...cardProps}
                  className={`card flex items-start gap-3 p-4 transition ${n.link ? 'hover:-translate-y-0.5' : ''} ${!n.isRead ? 'border-brand-200 bg-brand-50/30' : ''}`}
                >
                  <span
                    aria-hidden
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-slate-300' : tone.dot}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{n.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(n.createdAt)} · {n.type}
                    </p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function typeTone(type: string): { dot: string } {
  const t = type.toUpperCase();
  if (t.includes('LOW') || t.includes('SHORTAGE')) return { dot: 'bg-amber-500' };
  if (t.includes('DELAY') || t.includes('OVERDUE')) return { dot: 'bg-rose-500' };
  if (t.includes('PAYMENT') || t.includes('SUCCESS')) return { dot: 'bg-emerald-500' };
  if (t.includes('ERROR') || t.includes('SUSPEND')) return { dot: 'bg-rose-500' };
  return { dot: 'bg-brand-500' };
}
