'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, Pencil, Trash2, UserMinus, Send, Shield } from 'lucide-react';
import { RowMenu, type RowMenuAction } from './RowMenu';
import { StaffPayDialog } from './StaffPayDialog';
import { InviteStaffDialog } from './InviteStaffDialog';
import type { AccessRole } from '@/lib/rbac';

type StaffProp = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  accessRole: AccessRole;
  hasLoggedIn: boolean;
  payType: string;
  payAmount: number;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
};

/**
 * Row-level actions on the /team list.
 *
 *   - "Pay" opens the StaffPayDialog (salary / advance / bonus / etc.)
 *   - Menu: Invite / Manage access, Edit, Remove
 */
export function StaffRowActions({
  staff,
  canInvite,
  inviteDefaultRole,
}: {
  staff: StaffProp;
  canInvite: boolean;
  /**
   * Optional default role passed straight to InviteStaffDialog, used when
   * the owner clicked "Invite accountant" on the team page so the dialog
   * opens already pointing at ACCOUNTANT.
   */
  inviteDefaultRole?: AccessRole;
}) {
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const actions: RowMenuAction[] = [];

  if (canInvite) {
    actions.push({
      label:
        staff.accessRole === 'NONE'
          ? 'Invite to app'
          : 'Manage app access',
      icon: staff.accessRole === 'NONE' ? <Send size={16} /> : <Shield size={16} />,
      onClick: () => setInviteOpen(true),
    });
  }

  actions.push({
    label: 'Edit details',
    icon: <Pencil size={16} />,
    onClick: () => router.push(`/team/${staff.id}/edit`),
  });
  actions.push({
    label: 'Remove from team',
    icon: <UserMinus size={16} />,
    danger: true,
    onClick: async () => {
      if (!confirm(`Remove ${staff.name} from your team? Their history stays.`)) return;
      await fetch(`/api/team/${staff.id}`, { method: 'DELETE' });
      router.refresh();
    },
  });

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPayOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-brand-500 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-100"
        >
          <Banknote size={12} />
          Pay
        </button>
        <RowMenu actions={actions} />
      </div>
      <StaffPayDialog open={payOpen} onClose={() => setPayOpen(false)} staff={staff} />
      <InviteStaffDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        defaultRole={inviteDefaultRole}
        staff={{
          id: staff.id,
          name: staff.name,
          email: staff.email ?? null,
          phone: staff.phone ?? null,
          accessRole: staff.accessRole,
          hasLoggedIn: staff.hasLoggedIn,
        }}
      />
    </>
  );
}
