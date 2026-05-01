import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default async function PreviewCatalogPage() {
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
          title="Catalog preview"
          subtitle="Set a slug and enable the catalog to see a live preview."
        />
        <Link href="/settings?tab=storefront" className="btn-primary inline-flex">
          Set up storefront
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Catalog preview"
        subtitle="What customers see when they open your link."
        action={
          <Link href={url} target="_blank" className="btn-secondary inline-flex items-center gap-2">
            <ExternalLink size={16} /> Open in new tab
          </Link>
        }
      />

      <div className="rounded-2xl border border-border bg-slate-100 p-3">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <iframe
            src={url}
            title="Catalog preview"
            className="h-[80vh] w-full border-0"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>
    </AppShell>
  );
}
