import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { catalogService } from '@/lib/services/catalog.service';
import {
  verifyPasscode,
  signAlbumToken,
  albumCookieName,
  ALBUM_COOKIE_TTL,
} from '@/lib/album-passcode';

export const runtime = 'nodejs';

const bodySchema = z.object({
  passcode: z.string().trim().min(1).max(64),
});

/**
 * POST /api/store/[slug]/album/[albumSlug]/unlock
 *
 * Public endpoint — verifies a passcode against the stored bcrypt hash and,
 * on success, sets a signed httpOnly cookie scoped to that album's id.
 * The cookie is good for 24h, after which the customer is asked again.
 *
 * Rate-limited at 10 attempts/IP/min to make brute-forcing impractical
 * for the typical 4-6 character Yupoo-style passcodes.
 */
export async function POST(
  req: Request,
  { params }: { params: { slug: string; albumSlug: string } },
) {
  const ip = clientIp(req);
  const rl = rateLimit(`album-unlock:${params.slug}:${params.albumSlug}`, ip, {
    max: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const album = await catalogService.getAlbumForUnlock(params.slug, params.albumSlug);
  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }
  if (!album.passcodeRequired || !album.passcodeHash) {
    // Already public — nothing to unlock. Treat as success so the client
    // can just reload and see the products.
    return NextResponse.json({ ok: true, alreadyPublic: true });
  }

  const ok = await verifyPasscode(parsed.data.passcode, album.passcodeHash);
  if (!ok) {
    return NextResponse.json({ error: 'Wrong passcode' }, { status: 401 });
  }

  const token = await signAlbumToken(album.albumId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(albumCookieName(album.albumId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ALBUM_COOKIE_TTL,
  });
  return res;
}
