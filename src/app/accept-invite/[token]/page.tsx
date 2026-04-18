import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Logo } from '@/components/Logo';
import { ROLE_LABELS, type AccessRole } from '@/lib/rbac';
import { AcceptInviteForm } from './form';

export const dynamic = 'force-dynamic';

/**
 * Public page staff reach from their WhatsApp invite link.
 * We resolve the token server-side so we can show them a friendly name +
 * business before they type a password.
 */
export default async function AcceptInvitePage({
  params,
}: {
  params: { token: string };
}) {
  const staff = await prisma.staffMember.findUnique({
    where: { inviteToken: params.token },
    include: { user: { select: { businessName: true, name: true } } },
  });

  const expired =
    !staff ||
    !staff.inviteExpiresAt ||
    staff.inviteExpiresAt.getTime() < Date.now();
  const bad = !staff || staff.accessRole === 'NONE';

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="container-app py-10">
        <Link href="/" className="mb-6 inline-flex items-center">
          <Logo size="md" />
        </Link>
        <div className="mx-auto max-w-md">
          <div className="card p-6">
            {bad || expired ? (
              <>
                <h1 className="text-xl font-bold text-ink">Invite not valid</h1>
                <p className="mt-2 text-sm text-slate-600">
                  {bad
                    ? 'This invite link is not active. Ask the owner to send a fresh one.'
                    : 'This invite link has expired. Ask the owner to send a fresh one.'}
                </p>
                <Link
                  href="/login"
                  className="btn-secondary mt-5 inline-flex"
                >
                  Go to login
                </Link>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold text-ink">
                  Join {staff!.user.businessName || 'the team'}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Hi <strong>{staff!.name}</strong>,{' '}
                  {staff!.user.name} has invited you to join as a{' '}
                  <strong>
                    {ROLE_LABELS[staff!.accessRole as AccessRole]}
                  </strong>
                  . Set a password to get started.
                </p>
                <AcceptInviteForm token={params.token} email={staff!.email ?? ''} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
