/**
 * Catalog Service — public storefront read path + event logging.
 *
 * Public consumers (no auth):
 *   - `getStore(slug)`   →  business header + published products
 *   - `getProduct(slug, productId)` → single product detail
 *   - `logOrderClick(...)` → records a CatalogEvent for analytics
 *
 * Per the plan: clicking "Order on WhatsApp" never creates a Payment row.
 * The seller records payment manually when money lands → existing flow
 * auto-generates the receipt.
 */

import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { waLink, normalizeNigerianPhone } from '@/lib/whatsapp';
import {
  catalogOrderMessage,
  hashClientIp,
  productCatalogStatus,
  sanitizePublicText,
  CATALOG_LIMITS,
} from '@/lib/catalog';
import { rewriteImageUrl } from '@/lib/uploadcare/upload';

export type PublicProduct = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  sku: string | null;
  images: string[];
  status: 'AVAILABLE' | 'LOW_STOCK' | 'SOLD_OUT';
};

export type PublicAlbumCard = {
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  itemCount: number;
  passcodeRequired: boolean;
};

export type PublicStore = {
  business: string;
  tagline: string | null;
  logoUrl: string | null;
  whatsappNumber: string | null;
  products: PublicProduct[];
  albums: PublicAlbumCard[];
};

function shapeProduct(p: {
  id: string;
  name: string;
  price: number;
  description: string | null;
  sku: string | null;
  images: string[];
  trackStock: boolean;
  stock: number;
  lowStockAt: number;
  catalogStatus: string;
}): PublicProduct {
  // Rewrite legacy ucarecdn.com URLs to the project's configured CDN host.
  // Filter out empty strings so the UI can rely on `images[0]` truthiness.
  const images = (p.images || [])
    .map((u) => rewriteImageUrl(u))
    .filter((u): u is string => !!u);
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    description: p.description,
    sku: p.sku,
    images,
    status: productCatalogStatus(p),
  };
}

export const catalogService = {
  /**
   * Look up a published storefront by slug.
   * Returns null when the slug is unknown, catalog is disabled, or the user is suspended.
   *
   * Returns BOTH `albums` (Yupoo-style) and `products` (flat fallback list).
   * The public homepage shows albums first; the flat list is also available
   * at /store/[slug]/all for sellers who don't organise into albums.
   */
  async getStore(slug: string): Promise<PublicStore | null> {
    const user = await prisma.user.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        businessName: true,
        catalogEnabled: true,
        catalogTagline: true,
        logoUrl: true,
        whatsappNumber: true,
        isSuspended: true,
      },
    });
    if (!user || !user.catalogEnabled || user.isSuspended) return null;

    const [products, albums] = await Promise.all([
      prisma.product.findMany({
        where: { userId: user.id, isPublished: true, archived: false },
        orderBy: [{ updatedAt: 'desc' }],
        take: 200,
      }),
      prisma.album.findMany({
        where: { userId: user.id, isPublished: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        include: {
          _count: { select: { products: true } },
          products: {
            take: 1,
            orderBy: { position: 'asc' },
            include: { product: { select: { images: true } } },
          },
        },
        take: 100,
      }),
    ]);

    const albumCards: PublicAlbumCard[] = albums.map((a) => {
      const cover =
        a.coverImageUrl || a.products[0]?.product?.images?.[0] || null;
      return {
        slug: a.slug,
        title: a.title,
        description: a.description,
        coverImageUrl: cover ? rewriteImageUrl(cover) || null : null,
        itemCount: a._count.products,
        passcodeRequired: a.passcodeRequired,
      };
    });

    return {
      business: user.businessName || user.name || 'Shop',
      tagline: user.catalogTagline,
      logoUrl: user.logoUrl,
      whatsappNumber: user.whatsappNumber,
      products: products.map(shapeProduct),
      albums: albumCards,
    };
  },

  /**
   * Look up an album by storefront slug + album slug. Returns both the
   * meta (title, description, passcode requirement) and the product list.
   * Caller is expected to gate access on the cookie / passcode for protected
   * albums BEFORE rendering the products.
   */
  async getAlbum(slug: string, albumSlug: string): Promise<{
    business: string;
    whatsappNumber: string | null;
    logoUrl: string | null;
    album: {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      coverImageUrl: string | null;
      passcodeRequired: boolean;
    };
    products: PublicProduct[];
  } | null> {
    const user = await prisma.user.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        businessName: true,
        catalogEnabled: true,
        logoUrl: true,
        whatsappNumber: true,
        isSuspended: true,
      },
    });
    if (!user || !user.catalogEnabled || user.isSuspended) return null;

    const album = await prisma.album.findFirst({
      where: { userId: user.id, slug: albumSlug, isPublished: true },
      include: {
        products: {
          orderBy: { position: 'asc' },
          include: { product: true },
        },
      },
    });
    if (!album) return null;

    // Album curation IS the publication signal here — once a seller adds
    // a product to a published album, it shows in that album even if the
    // product's storefront-homepage `isPublished` flag is still off. We
    // only hide archived (deleted) rows.
    const products = album.products
      .map((ap) => ap.product)
      .filter((p): p is NonNullable<typeof p> => !!p && !p.archived)
      .map(shapeProduct);

    return {
      business: user.businessName || user.name || 'Shop',
      whatsappNumber: user.whatsappNumber,
      logoUrl: user.logoUrl,
      album: {
        id: album.id,
        slug: album.slug,
        title: album.title,
        description: album.description,
        coverImageUrl: album.coverImageUrl
          ? rewriteImageUrl(album.coverImageUrl) || null
          : null,
        passcodeRequired: album.passcodeRequired,
      },
      products,
    };
  },

  /**
   * Verify a passcode submitted from the unlock page. Returns the album row
   * (just id + hash + meta) so the API route can issue a signed cookie.
   * Returns null when the slug+albumSlug doesn't resolve or the album is
   * unpublished. Throws 'NO_PASSCODE' when the album doesn't require one.
   */
  async getAlbumForUnlock(slug: string, albumSlug: string): Promise<{
    albumId: string;
    passcodeRequired: boolean;
    passcodeHash: string | null;
  } | null> {
    const user = await prisma.user.findUnique({
      where: { slug },
      select: { id: true, catalogEnabled: true, isSuspended: true },
    });
    if (!user || !user.catalogEnabled || user.isSuspended) return null;
    const album = await prisma.album.findFirst({
      where: { userId: user.id, slug: albumSlug, isPublished: true },
      select: { id: true, passcodeRequired: true, passcodeHash: true },
    });
    if (!album) return null;
    return {
      albumId: album.id,
      passcodeRequired: album.passcodeRequired,
      passcodeHash: album.passcodeHash,
    };
  },

  /** Fetch a single published product on a slug-mapped storefront. */
  async getProduct(slug: string, productId: string): Promise<{
    business: string;
    whatsappNumber: string | null;
    logoUrl: string | null;
    product: PublicProduct;
  } | null> {
    const user = await prisma.user.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        businessName: true,
        catalogEnabled: true,
        logoUrl: true,
        whatsappNumber: true,
        isSuspended: true,
      },
    });
    if (!user || !user.catalogEnabled || user.isSuspended) return null;

    const product = await prisma.product.findFirst({
      where: { id: productId, userId: user.id, isPublished: true, archived: false },
    });
    if (!product) return null;

    return {
      business: user.businessName || user.name || 'Shop',
      whatsappNumber: user.whatsappNumber,
      logoUrl: user.logoUrl,
      product: shapeProduct(product),
    };
  },

  /**
   * Log a "Order on WhatsApp" click. Returns a wa.me link the frontend can
   * redirect to. No Payment row is created — the seller records payment
   * manually after the chat resolves.
   */
  async logOrderClick(args: {
    slug: string;
    productId: string;
    customerName?: string | null;
    customerPhone?: string | null;
    note?: string | null;
    ipHash?: string | null;
    userAgent?: string | null;
    referrer?: string | null;
  }): Promise<{ waLink: string }> {
    const user = await prisma.user.findUnique({
      where: { slug: args.slug },
      select: {
        id: true,
        name: true,
        businessName: true,
        whatsappNumber: true,
        catalogEnabled: true,
        isSuspended: true,
      },
    });
    if (!user || !user.catalogEnabled || user.isSuspended) {
      throw Err.notFound('Storefront not found');
    }
    if (!user.whatsappNumber) {
      throw Err.validation('Seller has no WhatsApp number configured.');
    }

    const product = await prisma.product.findFirst({
      where: { id: args.productId, userId: user.id, isPublished: true, archived: false },
    });
    if (!product) throw Err.notFound('Product not found');

    const status = productCatalogStatus(product);
    if (status === 'SOLD_OUT') {
      throw Err.validation('This product is sold out.');
    }

    const customerName = sanitizePublicText(args.customerName, CATALOG_LIMITS.MAX_NAME);
    const note = sanitizePublicText(args.note, CATALOG_LIMITS.MAX_NOTE);
    const customerPhone = args.customerPhone
      ? normalizeNigerianPhone(args.customerPhone)
      : null;

    await prisma.catalogEvent.create({
      data: {
        userId: user.id,
        productId: product.id,
        type: 'WHATSAPP_ORDER',
        ipHash: args.ipHash ?? null,
        userAgent: args.userAgent?.slice(0, 200) ?? null,
        referrer: args.referrer?.slice(0, 500) ?? null,
        customerName,
        customerPhone,
        note,
      },
    });

    const business = user.businessName || user.name || 'Shop';
    const message = catalogOrderMessage({
      business,
      productName: product.name,
      price: product.price,
      customerName,
      note,
    });
    return { waLink: waLink(user.whatsappNumber, message) };
  },

  /** Fire-and-forget VIEW event (called from the public storefront page). */
  async logView(args: {
    slug: string;
    productId?: string | null;
    ipHash?: string | null;
    referrer?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { slug: args.slug },
      select: { id: true, catalogEnabled: true, isSuspended: true },
    });
    if (!user || !user.catalogEnabled || user.isSuspended) return;
    await prisma.catalogEvent
      .create({
        data: {
          userId: user.id,
          productId: args.productId ?? null,
          type: 'VIEW',
          ipHash: args.ipHash ?? null,
          referrer: args.referrer?.slice(0, 500) ?? null,
          userAgent: args.userAgent?.slice(0, 200) ?? null,
        },
      })
      .catch(() => null);
  },
};

// Re-export helper for callers that just need the IP hashing.
export { hashClientIp };
