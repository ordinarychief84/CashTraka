import { getAuthContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EndImpersonationButton } from './EndImpersonationButton';

/**
 * Server component mounted in the root layout. Renders a bright, sticky
 * banner whenever the current session is an impersonation, so the admin
 * is always reminded who they're acting as. Renders nothing for normal
 * sessions, so non-admins never see it.
 */
export async function ImpersonationBanner() {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.impersonation) return null;

  const { adminId, adminKind, startedAt } = ctx.impersonation;
  const target = ctx.owner;

  let adminLabel = 'admin';
  if (adminKind === 'owner') {
    const u = await prisma.user.findUnique({
      where: { id: adminId },
      select: { name: true, email: true },
    });
    if (u) adminLabel = `${u.name} (${u.email})`;
  } else {
    const s = await prisma.adminStaff.findUnique({
      where: { id: adminId },
      select: { name: true, email: true },
    });
    if (s) adminLabel = `${s.name} (${s.email})`;
  }

  const expiresAtMs = startedAt + 60 * 60 * 1000;

  return (
    <div className="sticky top-0 z-[1000] flex flex-wrap items-center justify-between gap-3 border-b-2 border-amber-500 bg-amber-100 px-4 py-2 text-sm text-amber-900 shadow-sm">
      <div className="flex items-center gap-2">
        <span aria-hidden className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-amber-600" />
        <span>
          <strong>Impersonating</strong> {target.name}{' '}
          <span className="text-amber-700">&lt;{target.email}&gt;</span>
          <span className="ml-2 text-amber-700">— admin: {adminLabel}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-amber-700" suppressHydrationWarning>
          expires {new Date(expiresAtMs).toLocaleTimeString()}
        </span>
        <EndImpersonationButton userId={target.id} />
      </div>
    </div>
  );
}
