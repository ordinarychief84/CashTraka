import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';

/**
 * API key issuance + verification.
 *
 * Tokens are formatted as `ct_live_<24 random url-safe chars>` (or
 * `ct_test_…` for sandbox keys later). We store ONLY a SHA-256 hash
 * — the raw token is shown to the issuing user exactly once on
 * creation and never recoverable.
 *
 * The hash is the unique key in the DB, so authentication is a
 * single indexed lookup. Last four characters are kept in clear so
 * the list view can show "ct_live_…a3f7" without exposing the secret.
 */

const RAW_LENGTH_BYTES = 18; // → 24 base64url chars

function generateRawToken(prefix: string): string {
  const raw = crypto.randomBytes(RAW_LENGTH_BYTES).toString('base64url');
  return `${prefix}_${raw}`;
}

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export type ApiKeyCreateInput = {
  name: string;
  /** "live" | "test". Defaults to "live". */
  environment?: 'live' | 'test';
  /** Optional comma-separated scopes; empty = full access. */
  scopes?: string | null;
};

export const apiKeysService = {
  async listForUser(userId: string) {
    return prisma.apiKey.findMany({
      where: { userId },
      orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
    });
  },

  /**
   * Returns BOTH the persisted ApiKey row and the raw token. The
   * caller is responsible for showing the raw token to the user
   * exactly once and never re-fetching it.
   */
  async create(userId: string, input: ApiKeyCreateInput) {
    const name = input.name.trim();
    if (!name) throw Err.validation('Name is required.');
    if (name.length > 80) throw Err.validation('Name is too long (max 80 characters).');

    const prefix = `ct_${input.environment ?? 'live'}`;
    const raw = generateRawToken(prefix);
    const hash = sha256(raw);
    const lastFour = raw.slice(-4);

    const row = await prisma.apiKey.create({
      data: {
        userId,
        name,
        prefix,
        hash,
        lastFour,
        scopes: input.scopes?.trim() || null,
      },
    });

    return { apiKey: row, rawToken: raw };
  },

  async revoke(userId: string, id: string) {
    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw Err.notFound('API key not found.');
    }
    if (existing.revokedAt) {
      return existing; // idempotent
    }
    return prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  /**
   * Verify a raw token sent on an Authorization header. Returns the
   * owning `userId` on success, null on miss/revoked. Also bumps
   * `lastUsedAt` as a side-effect so the UI can show recency.
   */
  async verifyToken(raw: string): Promise<string | null> {
    if (!raw || raw.length < 10) return null;
    const hash = sha256(raw);
    const row = await prisma.apiKey.findUnique({ where: { hash } });
    if (!row || row.revokedAt) return null;
    // Fire-and-forget; we don't want auth to fail because the bump
    // failed.
    prisma.apiKey
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
    return row.userId;
  },
};
