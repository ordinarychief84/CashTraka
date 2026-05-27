import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { apiKeysService } from '@/lib/services/api-keys.service';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  environment: z.enum(['live', 'test']).optional(),
  scopes: z.string().trim().max(500).nullable().optional(),
});

export async function GET() {
  return handled(async () => {
    const { owner: user } = await requireAuth();
    const rows = await apiKeysService.listForUser(user.id);
    // NEVER return the hash — only the metadata fields the UI shows.
    const safe = rows.map((r) => ({
      id: r.id,
      name: r.name,
      prefix: r.prefix,
      lastFour: r.lastFour,
      scopes: r.scopes,
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
      revokedAt: r.revokedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
    return ok({ apiKeys: safe });
  });
}

export async function POST(req: Request) {
  return handled(async () => {
    const { owner: user } = await requireAuth();
    const body = CreateSchema.parse(await req.json());
    const { apiKey, rawToken } = await apiKeysService.create(user.id, body);
    // The rawToken is included exactly once here — the UI MUST show
    // it immediately and warn the user it won't be recoverable.
    return ok(
      {
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          prefix: apiKey.prefix,
          lastFour: apiKey.lastFour,
          scopes: apiKey.scopes,
          createdAt: apiKey.createdAt.toISOString(),
        },
        rawToken,
      },
      201,
    );
  });
}
