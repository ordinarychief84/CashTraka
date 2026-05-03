'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Send, Copy, CheckCircle2, UserMinus, Shield } from 'lucide-react';
import { ASSIGNABLE_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, type AccessRole } from '@/lib/rbac';
import { waLink } from '@/lib/whatsapp';

/**
 * Invite-to-team dialog.
 *
 * Shows custom roles first (if any exist), with a fallback to raw permission
 * levels. Collects the staff's email + chosen role, hits /api/team/:id/invite,
 * and renders the resulting invite URL with copy + WhatsApp send shortcuts.
 *
 * If the staff already has access, this dialog also lets the owner revoke
 * (which drops them back to accessRole=NONE).
 */

type CustomRole = {
  id: string;
  name: string;
  description: string | null;
  baseRole: string;
  color: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  staff: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    accessRole: AccessRole;
    hasLoggedIn: boolean;
  };
  /**
   * Optional default role for first-time invites. Used by the Tax+ team
   * page when the owner clicks "Invite accountant", so the dialog opens
   * already pointing at ACCOUNTANT instead of CASHIER.
   */
  defaultRole?: AccessRole;
};

export function InviteStaffDialog({ open, onClose, staff, defaultRole }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(staff.email ?? '');
  const [role, setRole] = useState<AccessRole>(
    staff.accessRole === 'NONE'
      ? (defaultRole ?? 'CASHIER')
      : staff.accessRole,
  );
  const [customRoleId, setCustomRoleId] = useState<string | null>(null);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch custom roles when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingRoles(true);
    fetch('/api/team/roles')
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setCustomRoles(d.data);
      })
      .catch(() => {})
      .finally(() => setLoadingRoles(false));
  }, [open]);

  if (!open) return null;

  function selectCustomRole(cr: CustomRole) {
    setCustomRoleId(cr.id);
    setRole(cr.baseRole as AccessRole);
  }

  function selectBaseRole(r: AccessRole) {
    setCustomRoleId(null);
    setRole(r);
  }

  async function sendInvite() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/${staff.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accessRole: role, customRoleId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not send invite');
      setInviteUrl(data.data.inviteUrl);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke() {
    if (!confirm(`Revoke app access for ${staff.name}?`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/team/${staff.id}/invite`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not revoke');
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke');
    } finally {
      setSubmitting(false);
    }
  }

  function copyLink() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(
      () => alert('Invite link copied'),
      () => prompt('Copy this link:', inviteUrl),
    );
  }

  function shareOnWa() {
    if (!inviteUrl || !staff.phone) return;
    const msg = `Hi ${staff.name}, you've been invited to join the team as ${ROLE_LABELS[role]}. Click to set your password: ${inviteUrl}`;
    window.open(waLink(staff.phone, msg), '_blank');
  }

  const isRevoke = staff.accessRole !== 'NONE' && !inviteUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md overflow-hidden rounded-t-2xl p-0 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-brand-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <Send size={18} />
            <span className="text-base font-bold">
              {inviteUrl ? 'Invite sent' : isRevoke ? `${staff.name}'s access` : `Invite ${staff.name}`}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {inviteUrl ? (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
                <CheckCircle2 size={22} className="shrink-0 text-brand-600" />
                <div>
                  <div className="text-sm font-bold text-ink">Link ready to share</div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Valid for 7 days. Send it to {staff.name}, they&apos;ll set their
                    password and can log in right away.
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-slate-50 p-3">
                <div className="break-all font-mono text-[11px] text-slate-700">
                  {inviteUrl}
                </div>
              </div>
              <div className="space-y-2">
                {staff.phone && (
                  <button
                    type="button"
                    onClick={shareOnWa}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#1fbd5b]"
                  >
                    <Send size={16} />
                    Send on WhatsApp
                  </button>
                )}
                <button type="button" onClick={copyLink} className="btn-secondary w-full">
                  <Copy size={14} />
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:text-ink"
                >
                  Done
                </button>
              </div>
            </>
          ) : (
            <>
              {isRevoke && (
                <div className="rounded-lg border border-owed-200 bg-owed-50 p-3 text-xs text-owed-700">
                  {staff.name} currently has <strong>{ROLE_LABELS[staff.accessRole]}</strong>{' '}
                  access{staff.hasLoggedIn ? ' and has logged in before.' : '.'} You can
                  change their role or revoke access.
                </div>
              )}

              <div>
                <label htmlFor="inv-email" className="label">
                  Login email
                </label>
                <input
                  id="inv-email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff-email@example.com"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  They&apos;ll use this to log in at /login.
                </p>
              </div>

              <div>
                <label className="label">Role</label>

                {/* Custom roles (if any) */}
                {loadingRoles ? (
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <div className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-transparent" />
                    Loading roles…
                  </div>
                ) : customRoles.length > 0 ? (
                  <>
                    <div className="mt-1 space-y-2">
                      {customRoles.map((cr) => (
                        <label
                          key={cr.id}
                          className={
                            'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ' +
                            (customRoleId === cr.id
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-border hover:bg-slate-50')
                          }
                        >
                          <input
                            type="radio"
                            name="role"
                            value={cr.id}
                            checked={customRoleId === cr.id}
                            onChange={() => selectCustomRole(cr)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {cr.color && (
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: cr.color }}
                                />
                              )}
                              <span className="text-sm font-bold text-ink">{cr.name}</span>
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                {ROLE_LABELS[cr.baseRole as AccessRole]}
                              </span>
                            </div>
                            {cr.description && (
                              <div className="text-[11px] text-slate-600">{cr.description}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="my-3 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">or assign directly</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  </>
                ) : null}

                {/* Base permission roles (always shown as fallback) */}
                <div className={customRoles.length > 0 ? 'space-y-2' : 'mt-1 space-y-2'}>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <label
                      key={r}
                      className={
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ' +
                        (role === r && !customRoleId
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-border hover:bg-slate-50')
                      }
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={role === r && !customRoleId}
                        onChange={() => selectBaseRole(r)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-bold text-ink">{ROLE_LABELS[r]}</div>
                        <div className="text-[11px] text-slate-600">
                          {ROLE_DESCRIPTIONS[r]}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={sendInvite}
                  disabled={submitting || !email}
                  className="btn-primary w-full"
                >
                  {submitting
                    ? 'Sending…'
                    : isRevoke
                      ? 'Update access & send new invite'
                      : 'Send invite'}
                </button>
                {isRevoke && (
                  <button
                    type="button"
                    onClick={revoke}
                    disabled={submitting}
                    className="btn-secondary w-full text-red-600"
                  >
                    <UserMinus size={14} />
                    Revoke access
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
