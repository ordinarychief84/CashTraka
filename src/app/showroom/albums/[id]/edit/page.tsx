import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { AlbumEditor } from '@/components/showroom/AlbumEditor';

export const dynamic = 'force-dynamic';

export default async function EditAlbumPage({ params }: { params: { id: string } }) {
  const user = await guard();

  const [album, products] = await Promise.all([
    prisma.album.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        products: {
          orderBy: { position: 'asc' },
          select: { productId: true },
        },
      },
    }),
    prisma.product.findMany({
      where: { userId: user.id, archived: false },
      orderBy: [{ updatedAt: 'desc' }],
      select: { id: true, name: true, price: true, images: true },
      take: 500,
    }),
  ]);
  if (!album) notFound();

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <AlbumEditor
        mode="edit"
        storefrontSlug={user.slug ?? null}
        appUrl={process.env.APP_URL || ''}
        catalog={products}
        initial={{
          id: album.id,
          title: album.title,
          slug: album.slug,
          description: album.description ?? '',
          coverImageUrl: album.coverImageUrl ?? '',
          passcodeRequired: album.passcodeRequired,
          // Cleartext passcode is never persisted; the field is for setting a NEW one.
          passcode: '',
          isPublished: album.isPublished,
          productIds: album.products.map((ap) => ap.productId),
        }}
      />
    </AppShell>
  );
}
