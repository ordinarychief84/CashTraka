import { Plus, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { TemplateRowActions } from '@/components/TemplateRowActions';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const user = await guard();
  const templates = await prisma.messageTemplate.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  });

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType}>
      <PageHeader
        title="Message templates"
        subtitle="Save the messages you send all day. Use them from the follow-up screen."
        action={
          <Link href="/templates/new" className="btn-primary">
            <Plus size={18} />
            New
          </Link>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No templates yet"
          description="Save common messages like “Delivery confirmation”, “Restock alert” or “Thank you”."
          actionHref="/templates/new"
          actionLabel="Create your first template"
        />
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li key={t.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{t.name}</div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">
                    {t.body}
                  </p>
                </div>
                <TemplateRowActions id={t.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
