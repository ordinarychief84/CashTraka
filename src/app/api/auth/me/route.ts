import { getAuthContext } from '@/lib/auth';
import { ok, unauthorized } from '@/lib/api-response';

/**
 * "Who am I?" probe. Returns the actual principal (owner OR staff) plus
 * their access role, so client components can gate UI.
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return unauthorized();
  return ok({
    kind: ctx.isOwner ? 'owner' : 'staff',
    id: ctx.principalId,
    name: ctx.principalName,
    accessRole: ctx.accessRole,
    businessType: ctx.owner.businessType,
    businessName: ctx.owner.businessName,
    // Preserve legacy fields that some consumers rely on.
    email: ctx.isOwner ? ctx.owner.email : ctx.staff?.email ?? null,
    role: ctx.isOwner ? ctx.owner.role : 'STAFF',
    plan: ctx.owner.plan,
    onboardingCompleted: ctx.owner.onboardingCompleted,
  });
}

export const dynamic = 'force-dynamic';
