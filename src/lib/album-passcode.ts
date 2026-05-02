/**
 * Album passcode helpers — short-lived signed cookie that grants access to a
 * specific album after the buyer enters the right code. Hashes use bcrypt
 * (already in deps); session tokens are JWTs signed with AUTH_SECRET (jose,
 * already in deps).
 */

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const COOKIE_NAME = 'cashtraka_album';
const TTL_SECONDS = 60 * 60 * 24; // 24h

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(raw);
}

/** Hash a passcode with bcrypt. Returns the hash to persist on Album.passcodeHash. */
export async function hashPasscode(passcode: string): Promise<string> {
  return bcrypt.hash(passcode, 10);
}

/** Verify a candidate passcode against a stored bcrypt hash. */
export async function verifyPasscode(
  candidate: string,
  hash: string,
): Promise<boolean> {
  if (!candidate || !hash) return false;
  return bcrypt.compare(candidate, hash);
}

/** Mint a JWT scoped to a single album, valid for TTL_SECONDS. */
export async function signAlbumToken(albumId: string): Promise<string> {
  return new SignJWT({ albumId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Verify a JWT and return the unlocked albumId, or null if the token is
 * missing / wrong / expired / scoped to a different album.
 */
export async function verifyAlbumToken(
  token: string | null | undefined,
  expectedAlbumId: string,
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.albumId === expectedAlbumId;
  } catch {
    return false;
  }
}

/** Cookie name we set after a successful unlock. Per-album scope is encoded in the JWT. */
export function albumCookieName(albumId: string): string {
  // One cookie per album so two unlocked albums don't fight for storage.
  // Length-cap on cookie name is generous; albumIds are cuids (~25 chars).
  return `${COOKIE_NAME}_${albumId}`;
}

export const ALBUM_COOKIE_TTL = TTL_SECONDS;
