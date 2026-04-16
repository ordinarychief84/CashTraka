import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { TemplateForm } from '@/components/TemplateForm';

export const dynamic = 'force-dynamic';

export default async function NewTemplatePage() {
  const user = await guard();
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="New template" backHref="/templates" />
      <div className="card p-5">
        <TemplateForm />
      </div>
    </AppShell>
  );
}
