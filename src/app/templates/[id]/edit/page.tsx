import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { TemplateForm } from '@/components/TemplateForm';

export const dynamic = 'force-dynamic';

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
  const user = await guard();
  const template = await prisma.messageTemplate.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!template) notFound();

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Edit template" backHref="/templates" />
      <div className="card p-5">
        <TemplateForm
          initial={{ id: template.id, name: template.name, body: template.body }}
        />
      </div>
    </AppShell>
  );
}
