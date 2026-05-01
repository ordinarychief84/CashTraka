import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ShareCatalogActions } from '@/components/sell/ShareCatalogActions';

export const dynamic = 'force-dynamic';

export default async function ShareCatalogPage() {
  const user = await guard();
  const slug = user.slug ?? null;
  const baseUrl = process.env.APP_URL || '';
  const url = slug ? `${baseUrl}/store/${slug}` : null;

  if (!slug || !user.catalogEnabled || !url) {
    return (
      <AppShell
        businessName={user.businessName}
        userName={user.name}
        businessType={user.businessType}
        accessRole={user.accessRole}
        principalName={user.principalName}
      >
        <PageHeader
          title="Share your catalog"
          subtitle="Set up your storefront before sharing."
        />
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            You need to pick a storefront slug and enable the catalog first.
          </p>
          <Link href="/settings?tab=storefront" className="btn-primary mt-3 inline-flex">
            Set up storefront
          </Link>
        </div>
      </AppShell>
    );
  }

  const businessName = user.businessName || user.name || 'Shop';

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Share your catalog"
        subtitle="Send the link in chat groups, status updates, or printed materials."
        action={
          <Link href={url} target="_blank" className="btn-secondary inline-flex items-center gap-2">
            <ExternalLink size={16} /> Open
          </Link>
        }
      />

      <div className="rounded-xl border border-border bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Your public link
        </div>
        <div className="mt-1 break-all font-mono text-sm text-brand-600">{url}</div>
        <ShareCatalogActions url={url} businessName={businessName} />
      </div>
    </AppShell>
  );
}
