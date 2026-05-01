import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateSlug, normalizeSlug } from '@/lib/catalog';

export const runtime = 'nodejs';

const bodySchema = z.object({
  slug: z.string().trim().min(1).max(64),
  catalogTagline: z.string().trim().max(140).nullable().optional(),
  catalogEnabled: z.boolean().optional(),
});

/** POST /api/settings/slug — set or update the storefront slug + catalog flags. */
export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const slug = normalizeSlug(parsed.data.slug);
  const v = validateSlug(slug);
  if (!v.ok) {
    return NextResponse.json({ error: v.reason }, { status: 400 });
  }

  // If the slug is already taken by someone else, reject.
  const clash = await prisma.user.findUnique({ where: { slug } });
  if (clash && clash.id !== user.id) {
    return NextResponse.json({ error: 'That slug is already taken.' }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      slug,
      catalogTagline:
        parsed.data.catalogTagline === undefined ? undefined : parsed.data.catalogTagline,
      catalogEnabled:
        parsed.data.catalogEnabled === undefined ? true : parsed.data.catalogEnabled,
    },
    select: { slug: true, catalogEnabled: true, catalogTagline: true },
  });
  return NextResponse.json({ success: true, data: updated });
}
