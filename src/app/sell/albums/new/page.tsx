import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { AlbumEditor } from '@/components/sell/AlbumEditor';

export const dynamic = 'force-dynamic';

export default async function NewAlbumPage() {
  const user = await guard();
  const products = await prisma.product.findMany({
    where: { userId: user.id, archived: false },
    orderBy: [{ updatedAt: 'desc' }],
    select: { id: true, name: true, price: true, images: true },
    take: 500,
  });

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="New album"
        subtitle="Group products into a shareable collection."
      />
      <AlbumEditor
        mode="new"
        storefrontSlug={user.slug ?? null}
        appUrl={process.env.APP_URL || ''}
        catalog={products}
        initial={{
          title: '',
          slug: '',
          description: '',
          coverImageUrl: '',
          passcodeRequired: false,
          passcode: '',
          isPublished: true,
          productIds: [],
        }}
      />
    </AppShell>
  );
}
