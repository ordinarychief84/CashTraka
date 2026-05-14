import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { certificatesService } from '@/lib/services/certificates.service';
import { CertificateVault } from '@/components/settings/CertificateVault';

export const dynamic = 'force-dynamic';

/**
 * /settings/certificates — regulatory + trust document vault.
 *
 * NAFDAC, CAC, TIN, FDA, SON, halal, organic — everything a small batch
 * maker needs to prove authenticity to distributors and customers.
 *
 * Each cert produces a public /c/[token] page the business can share via
 * WhatsApp/print on labels. Expiry dates feed the 30/60/90-day reminder
 * cron (the cron job lives in a follow-up).
 */
export default async function CertificatesSettingsPage() {
  const user = await guard();
  const certs = await certificatesService.listForUser(user.id);
  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Certificates & trust documents"
        subtitle="NAFDAC, CAC, TIN — uploaded once, share via a public link, get reminded before they expire."
        action={
          <Link href="/settings" className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={14} />
            Settings
          </Link>
        }
      />
      <CertificateVault
        initial={certs.map((c) => ({
          id: c.id,
          kind: c.kind,
          label: c.label,
          certificateNumber: c.certificateNumber,
          issuedAt: c.issuedAt?.toISOString() ?? null,
          expiresAt: c.expiresAt?.toISOString() ?? null,
          fileUrl: c.fileUrl,
          mimeType: c.mimeType,
          publicToken: c.publicToken,
          productName: c.product?.name ?? null,
        }))}
      />
    </AppShell>
  );
}
