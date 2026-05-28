import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { checkPasswordComplexity } from '@/lib/password-policy';

/**
 * Settings > Users CRUD — backed by the existing StaffMember model.
 *
 * The Rackbeat "Users" surface is intentionally simpler than the full
 * /team management page: it captures name + email + password +
 * language + userType (STANDARD/SCANNER) and surfaces the same
 * accessRole semantics the rest of the app already uses.
 */

export const USER_TYPES = ['STANDARD', 'SCANNER'] as const;
export type WorkspaceUserType = (typeof USER_TYPES)[number];

export type WorkspaceUserCreateInput = {
  name: string;
  email: string;
  password: string;
  language?: string;
  userType?: WorkspaceUserType;
};

export type WorkspaceUserUpdateInput = {
  name?: string;
  email?: string;
  language?: string;
  userType?: WorkspaceUserType;
  autoBookAdjustments?: boolean;
  autoBookMovements?: boolean;
  associatedEmployee?: string | null;
};

function cleanStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
}

function requireEmail(email: string) {
  const t = (email ?? '').trim().toLowerCase();
  if (!t) throw Err.validation('Email is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    throw Err.validation('Invalid email format.');
  }
  return t;
}

export const workspaceUsersService = {
  async listForUser(userId: string) {
    return prisma.staffMember.findMany({
      where: { userId, status: { not: 'deleted' } },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, email: true, language: true, userType: true,
        accessRole: true, status: true,
        autoBookAdjustments: true, autoBookMovements: true,
        associatedEmployee: true, lastLoginAt: true, createdAt: true,
      },
    });
  },

  async get(userId: string, id: string) {
    const row = await prisma.staffMember.findUnique({ where: { id } });
    if (!row || row.userId !== userId) {
      throw Err.notFound('User not found.');
    }
    return row;
  },

  async create(userId: string, input: WorkspaceUserCreateInput) {
    const name = (input.name ?? '').trim();
    if (!name) throw Err.validation('Name is required.');
    if (name.length > 100) throw Err.validation('Name is too long (max 100 characters).');

    const email = requireEmail(input.email);
    const userType: WorkspaceUserType = input.userType ?? 'STANDARD';
    if (!USER_TYPES.includes(userType)) throw Err.validation('Invalid user type.');

    // Reuse the project's existing password policy so the Settings
    // surface stays consistent with the staff-invite flow.
    const policyError = checkPasswordComplexity(input.password);
    if (policyError) throw Err.validation(policyError);

    // Dupe-check against the OWNER's auth e-mail and against other
    // staff e-mails for the same workspace.
    const ownerHit = await prisma.user.findUnique({ where: { email } });
    if (ownerHit && ownerHit.id === userId) {
      throw Err.validation('That e-mail is the workspace owner — pick a different e-mail for the staff member.');
    }
    const staffHit = await prisma.staffMember.findFirst({
      where: { userId, email, status: { not: 'deleted' } },
    });
    if (staffHit) throw Err.validation(`A user with the e-mail ${email} already exists.`);

    const passwordHash = await hash(input.password, 12);

    return prisma.staffMember.create({
      data: {
        userId,
        name,
        email,
        passwordHash,
        language: (input.language ?? 'EN').toUpperCase(),
        userType,
        accessRole: userType === 'SCANNER' ? 'SCANNER' : 'ADMIN',
        status: 'active',
      },
    });
  },

  async update(userId: string, id: string, input: WorkspaceUserUpdateInput) {
    const existing = await this.get(userId, id);

    const data: Record<string, unknown> = {};
    if (input.name != null) {
      const name = input.name.trim();
      if (!name) throw Err.validation('Name is required.');
      data.name = name;
    }
    if (input.email != null) {
      const email = requireEmail(input.email);
      if (email !== existing.email) {
        const conflict = await prisma.staffMember.findFirst({
          where: { userId, email, id: { not: id }, status: { not: 'deleted' } },
        });
        if (conflict) throw Err.validation(`A user with the e-mail ${email} already exists.`);
        data.email = email;
      }
    }
    if (input.language != null) data.language = input.language.toUpperCase();
    if (input.userType != null) {
      if (!USER_TYPES.includes(input.userType)) throw Err.validation('Invalid user type.');
      data.userType = input.userType;
      data.accessRole = input.userType === 'SCANNER' ? 'SCANNER' : 'ADMIN';
    }
    if (input.autoBookAdjustments != null) data.autoBookAdjustments = input.autoBookAdjustments;
    if (input.autoBookMovements != null) data.autoBookMovements = input.autoBookMovements;
    if ('associatedEmployee' in input) {
      data.associatedEmployee = cleanStr(input.associatedEmployee);
    }
    return prisma.staffMember.update({ where: { id }, data });
  },

  async changePassword(userId: string, id: string, _currentPassword: string, newPassword: string) {
    const existing = await this.get(userId, id);
    // Admin-side password change — we don't enforce the current
    // password because the workspace owner can always reset on
    // behalf of staff. (Self-service password change uses a
    // different endpoint with bcrypt.compare.)
    void existing;
    const policyError = checkPasswordComplexity(newPassword);
    if (policyError) throw Err.validation(policyError);
    const passwordHash = await hash(newPassword, 12);
    return prisma.staffMember.update({ where: { id }, data: { passwordHash } });
  },

  async softDelete(userId: string, id: string) {
    const existing = await this.get(userId, id);
    void existing;
    return prisma.staffMember.update({
      where: { id },
      data: { status: 'deleted' },
    });
  },
};
