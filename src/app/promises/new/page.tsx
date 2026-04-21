import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { NewPromiseForm } from '@/components/promises/NewPromiseForm';

export const dynamic = 'force-dynamic';

export default async function NewPromisePage() {
  const user = await guard();

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-xl font-bold text-slate-900">Create Promise to Pay</h1>
        <NewPromiseForm />
      </div>
    </AppShell>
  );
}
