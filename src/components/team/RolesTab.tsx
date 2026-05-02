'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Shield, Users2, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { ROLE_LABELS, type AccessRole } from '@/lib/rbac';
import { RoleFormDialog } from './RoleFormDialog';

type CustomRole = {
  id: string;
  name: string;
  description: string | null;
  baseRole: string;
  color: string | null;
  _count: { staffMembers: number };
};

export function RolesTab() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/team/roles');
      const data = await res.json();
      if (res.ok && data.data) setRoles(data.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  function openCreate() {
    setEditingRole(null);
    setDialogOpen(true);
  }

  function openEdit(role: CustomRole) {
    setEditingRole(role);
    setDialogOpen(true);
    setMenuOpenId(null);
  }

  async function handleDelete(role: CustomRole) {
    const msg = role._count.staffMembers > 0
      ? `Delete "${role.name}"? ${role._count.staffMembers} member(s) will be unassigned from this role.`
      : `Delete "${role.name}"?`;
    if (!confirm(msg)) return;

    setDeleting(role.id);
    try {
      const res = await fetch(`/api/team/roles/${role.id}`, { method: 'DELETE' });
      if (res.ok) {
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(null);
      setMenuOpenId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Create roles to organize your team. Each role has a permission level that controls what members can do in the app.
        </p>
        <button onClick={openCreate} className="btn-primary shrink-0 ml-3">
          <Plus size={16} />
          New role
        </button>
      </div>

      {roles.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
            <Shield size={24} className="text-brand-600" />
          </div>
          <h3 className="text-base font-bold text-ink">No roles yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Create your first role, like &quot;Shop Attendant&quot; or &quot;Delivery Rider&quot;, then add team members to it.
          </p>
          <button onClick={openCreate} className="btn-primary mt-4">
            <Plus size={16} />
            Create your first role
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div key={role.id} className="card relative p-4">
              {/* Color stripe */}
              {role.color && (
                <div
                  className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
                  style={{ backgroundColor: role.color }}
                />
              )}

              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-bold text-ink">{role.name}</h3>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                      {ROLE_LABELS[role.baseRole as AccessRole] || role.baseRole}
                    </span>
                  </div>
                  {role.description && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">{role.description}</p>
                  )}
                </div>

                {/* Menu */}
                <div className="relative ml-2">
                  <button
                    type="button"
                    onClick={() => setMenuOpenId(menuOpenId === role.id ? null : role.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Role options"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {menuOpenId === role.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                      <div className="absolute right-0 top-8 z-50 w-36 rounded-lg border border-border bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => openEdit(role)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil size={14} />
                          Edit role
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(role)}
                          disabled={deleting === role.id}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          {deleting === role.id ? 'Deleting…' : 'Delete role'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Member count */}
              <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-slate-500">
                <Users2 size={14} />
                <span>
                  {role._count.staffMembers === 0
                    ? 'No members'
                    : role._count.staffMembers === 1
                      ? '1 member'
                      : `${role._count.staffMembers} members`}
                </span>
              </div>
            </div>
          ))}

          {/* Add role card */}
          <button
            onClick={openCreate}
            className="card flex flex-col items-center justify-center gap-2 border-dashed p-6 text-slate-400 transition hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-600"
          >
            <Plus size={20} />
            <span className="text-sm font-medium">Add role</span>
          </button>
        </div>
      )}

      <RoleFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingRole(null); }}
        onSaved={fetchRoles}
        editingRole={editingRole ? {
          id: editingRole.id,
          name: editingRole.name,
          description: editingRole.description || '',
          baseRole: editingRole.baseRole,
          color: editingRole.color,
        } : null}
      />
    </>
  );
}
