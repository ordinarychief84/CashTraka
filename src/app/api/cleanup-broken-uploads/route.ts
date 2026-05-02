import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * One-shot cleanup for legacy image URLs that point at the wrong Uploadcare
 * host. The bug was: before commit 9a6232f, the upload helper hardcoded
 * `https://ucarecdn.com` as the CDN base. This project actually delivers
 * from a per-project subdomain (https://5jowdl24z8.ucarecd.net), so every
 * URL we saved to the DB serves 404 from the public CDN.
 *
 * This endpoint:
 *   - Strips entries that start with https://ucarecdn.com/ from
 *     Product.images[] (keeps the array, drops the bad URLs).
 *   - Nulls out Album.coverImageUrl when it points at the broken host.
 *   - Nulls out User.logoUrl when it points at the broken host.
 *
 * Idempotent: running it again is a no-op once cleanup is done.
 *
 * NOT cleaned (intentional):
 *   - Receipt.pdfUrl: the receipt streaming route (/api/receipts/[id])
 *     re-renders PDFs on demand from Prisma data when the stored URL
 *     fails, so a broken pdfUrl is non-fatal.
 *
 * Auth: same Bearer CRON_SECRET pattern as /api/migrate.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '');
  const qs = req.nextUrl.searchParams.get('secret');
  if (!secret || (bearer !== secret && qs !== secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const BROKEN_PREFIX = 'https://ucarecdn.com/';

  // 1) Product.images[]: drop broken entries while preserving the rest.
  //    Postgres lets us unnest the text[] and re-aggregate with a filter.
  const productsFixed: number = await prisma.$executeRawUnsafe(`
    UPDATE "Product"
    SET images = (
      SELECT COALESCE(array_agg(u), '{}'::text[])
      FROM unnest(images) u
      WHERE u NOT LIKE 'https://ucarecdn.com/%'
    )
    WHERE EXISTS (
      SELECT 1 FROM unnest(images) u WHERE u LIKE 'https://ucarecdn.com/%'
    )
  `);

  // 2) Album.coverImageUrl: clear broken values, the album falls back to
  //    the first product's first image automatically.
  const albumsCleared: number = await prisma.$executeRawUnsafe(`
    UPDATE "Album"
    SET "coverImageUrl" = NULL
    WHERE "coverImageUrl" LIKE 'https://ucarecdn.com/%'
  `);

  // 3) User.logoUrl: clear broken values.
  const usersCleared: number = await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "logoUrl" = NULL
    WHERE "logoUrl" LIKE 'https://ucarecdn.com/%'
  `);

  return NextResponse.json({
    success: true,
    cleaned: {
      productRowsUpdated: productsFixed,
      albumCoversCleared: albumsCleared,
      userLogosCleared: usersCleared,
    },
    brokenPrefix: BROKEN_PREFIX,
  });
}
