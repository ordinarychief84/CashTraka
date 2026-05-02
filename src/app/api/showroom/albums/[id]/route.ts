import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, validationFail } from '@/lib/api-response';
import { Err } from '@/lib/errors';
import { hashPasscode } from '@/lib/album-passcode';

export const runtime = 'nodejs';

const patchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  isPublished: z.boolean().optional(),
  passcodeRequired: z.boolean().optional(),
  /// Cleartext passcode. Sending null clears it (also sets passcodeRequired=false).
  /// Sending a string updates the bcrypt hash. Omit to keep the current value.
  passcode: z.string().trim().min(4).max(64).nullable().optional(),
});

async function loadOwn(userId: string, id: string) {
  const album = await prisma.album.findFirst({ where: { id, userId } });
  if (!album) throw Err.notFound('Album not found');
  return album;
}

/** GET /api/showroom/albums/[id] — fetch the album with its products. */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const album = await prisma.album.findFirst({
      where: { id: ctx.params.id, userId: user.id },
      include: {
        products: {
          orderBy: { position: 'asc' },
          include: { product: { select: { id: true, name: true, price: true, images: true } } },
        },
      },
    });
    if (!album) throw Err.notFound('Album not found');
    return ok(album);
  });

/** PATCH /api/showroom/albums/[id] — update meta fields. */
export const PATCH = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    await loadOwn(user.id, ctx.params.id);

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const data: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.coverImageUrl !== undefined) data.coverImageUrl = parsed.data.coverImageUrl;
    if (parsed.data.isPublished !== undefined) data.isPublished = parsed.data.isPublished;

    // Passcode handling:
    //   passcodeRequired=true + passcode provided → store hash + flag on
    //   passcodeRequired=true + no passcode (kept current) → just flip flag on; old hash stays
    //   passcodeRequired=false → flag off, hash cleared
    //   passcode=null → clear hash (and force flag off)
    if (parsed.data.passcode === null) {
      data.passcodeHash = null;
      data.passcodeRequired = false;
    } else if (parsed.data.passcode) {
      data.passcodeHash = await hashPasscode(parsed.data.passcode);
    }
    if (parsed.data.passcodeRequired === false) {
      data.passcodeRequired = false;
      data.passcodeHash = null;
    } else if (parsed.data.passcodeRequired === true) {
      data.passcodeRequired = true;
    }

    const updated = await prisma.album.update({
      where: { id: ctx.params.id },
      data,
    });
    return ok(updated);
  });

/** DELETE /api/showroom/albums/[id] — remove an album (cascades to AlbumProduct). */
export const DELETE = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    await loadOwn(user.id, ctx.params.id);
    await prisma.album.delete({ where: { id: ctx.params.id } });
    return ok({ deleted: true });
  });
