import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { apiKeysService } from '@/lib/services/api-keys.service';

export const dynamic = 'force-dynamic';

/**
 * Revoke an API key. We intentionally only support DELETE (-> revoke)
 * and never PATCH — a compromised key can't be "fixed", only retired.
 * The row stays in the DB after revocation so audit attribution
 * survives. Past keys appear in the list as `revokedAt != null`.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner: user } = await requireAuth();
    await apiKeysService.revoke(user.id, params.id);
    return ok({ revoked: true });
  });
}
