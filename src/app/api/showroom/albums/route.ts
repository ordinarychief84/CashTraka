import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, validationFail } from '@/lib/api-response';
import { hashPasscode } from '@/lib/album-passcode';
import { validateSlug, normalizeSlug } from '@/lib/catalog';

export const runtime = 'nodejs';

const createSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    slug: z.string().trim().min(3).max(40),
    description: z.string().trim().max(500).optional(),
    coverImageUrl: z.string().url().optional(),
    passcodeRequired: z.boolean().default(false),
    /// Cleartext passcode. We bcrypt-hash before persisting; the cleartext
    /// is never stored. Required if passcodeRequired=true.
    passcode: z.string().trim().min(4).max(64).optional(),
    isPublished: z.boolean().default(true),
    productIds: z.array(z.string()).max(500).optional(),
  })
  .refine(
    (v) => !v.passcodeRequired || !!v.passcode,
    { message: 'A passcode is required when passcodeRequired=true', path: ['passcode'] },
  );

/** GET /api/showroom/albums — list this seller's albums. */
export const GET = () =>
  handled(async () => {
    const user = await requireUser();
    const albums = await prisma.album.findMany({
      where: { userId: user.id },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { products: true } } },
    });
    return ok(albums);
  });

/** POST /api/showroom/albums — create a new album. */
export const POST = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    // Slug must be kebab-cased + not collide with this seller's other albums.
    // We reuse the catalog slug rules (banned-list of route names is overkill
    // here since the slug is namespaced under /store/<seller>/album/, but
    // we still apply the kebab-case validation).
    const slug = normalizeSlug(parsed.data.slug);
    const v = validateSlug(slug);
    if (!v.ok) {
      return NextResponse.json({ error: v.reason }, { status: 400 });
    }
    const existing = await prisma.album.findFirst({
      where: { userId: user.id, slug },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'You already have an album with that slug.' },
        { status: 409 },
      );
    }

    const passcodeHash = parsed.data.passcode
      ? await hashPasscode(parsed.data.passcode)
      : null;

    // Compute next position so new albums append by default.
    const last = await prisma.album.findFirst({
      where: { userId: user.id },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const nextPosition = (last?.position ?? -1) + 1;

    // Validate that any productIds belong to this user.
    const productIds = parsed.data.productIds ?? [];
    if (productIds.length > 0) {
      const own = await prisma.product.findMany({
        where: { id: { in: productIds }, userId: user.id, archived: false },
        select: { id: true },
      });
      const ownSet = new Set(own.map((p) => p.id));
      for (const id of productIds) {
        if (!ownSet.has(id)) {
          return NextResponse.json({ error: `Product ${id} not found.` }, { status: 400 });
        }
      }
    }

    const album = await prisma.album.create({
      data: {
        userId: user.id,
        slug,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        coverImageUrl: parsed.data.coverImageUrl ?? null,
        passcodeRequired: parsed.data.passcodeRequired,
        passcodeHash,
        isPublished: parsed.data.isPublished,
        position: nextPosition,
        products: {
          create: productIds.map((productId, idx) => ({
            productId,
            position: idx,
          })),
        },
      },
      include: { _count: { select: { products: true } } },
    });

    return ok(album);
  });
