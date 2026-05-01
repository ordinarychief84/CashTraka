import { NextResponse } from 'next/server';
import { catalogService } from '@/lib/services/catalog.service';

export const runtime = 'nodejs';
export const revalidate = 60; // light caching — public listing

/** GET /api/store/[slug]/products — public product list for a storefront. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const store = await catalogService.getStore(params.slug);
  if (!store) return NextResponse.json({ error: 'Storefront not found' }, { status: 404 });
  return NextResponse.json({
    business: store.business,
    tagline: store.tagline,
    logoUrl: store.logoUrl,
    products: store.products,
  });
}
