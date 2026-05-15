import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { RawMaterialForm } from '@/components/ops/RawMaterialForm';
import { suppliersService } from '@/lib/services/suppliers.service';

export const dynamic = 'force-dynamic';

export default async function NewMaterialPage() {
  const user = await guard();
  const { rows: suppliers } = await suppliersService.listForUser(user.id, { take: 200 });
  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader title="Add raw material" backHref="/materials" />
      <div className="mx-auto max-w-3xl">
        <div className="card p-5">
          <RawMaterialForm
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
