/**
 * Role-based access control.
 *
 * Four principal roles:
 *   - OWNER   — the account owner. Can do anything, including billing + settings.
 *   - MANAGER — full operational access. Cannot manage billing, settings, or team.
 *   - CASHIER — records payments, issues receipts, manages customers/debts.
 *               Read-only for the rest.
 *   - VIEWER  — read-only everywhere. Useful for accountants / partners.
 *   - NONE    — no login at all (staff is just a payroll record).
 *
 * Permissions are resolved by (role, action) lookup — no inheritance logic, so
 * it's easy to read off the truth table.
 */

export type AccessRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'VIEWER' | 'NONE';

export type Permission =
  | 'payments.read'
  | 'payments.write'
  | 'payments.delete'
  | 'payments.verify'
  | 'receipts.create'
  | 'debts.read'
  | 'debts.write'
  | 'customers.read'
  | 'customers.write'
  | 'products.read'
  | 'products.write'
  | 'expenses.read'
  | 'expenses.write'
  | 'invoices.read'
  | 'invoices.write'
  | 'reports.read'
  | 'tasks.read'
  | 'tasks.write'
  | 'checklists.read'
  | 'checklists.write'
  | 'team.read'
  | 'team.write'
  | 'team.invite'
  | 'attendance.write'
  | 'payroll.write'
  | 'settings.read'
  | 'settings.write'
  | 'billing.read'
  | 'billing.write';

type Matrix = Record<AccessRole, Permission[]>;

const OPERATIONAL_READS: Permission[] = [
  'payments.read',
  'debts.read',
  'customers.read',
  'products.read',
  'expenses.read',
  'invoices.read',
  'reports.read',
  'tasks.read',
  'checklists.read',
];

const MATRIX: Matrix = {
  // Owner has everything — the identity check is handled at the call site
  // (isOwner short-circuits to `true`), but keep an explicit list so
  // `can(principal, 'x')` is correct without special-casing.
  OWNER: [
    ...OPERATIONAL_READS,
    'payments.write',
    'payments.delete',
    'payments.verify',
    'receipts.create',
    'debts.write',
    'customers.write',
    'products.write',
    'expenses.write',
    'invoices.write',
    'tasks.write',
    'checklists.write',
    'team.read',
    'team.write',
    'team.invite',
    'attendance.write',
    'payroll.write',
    'settings.read',
    'settings.write',
    'billing.read',
    'billing.write',
  ],
  // Manager: runs operations day-to-day. No money changes around billing,
  // no sharing/permissions, no changing their own role.
  MANAGER: [
    ...OPERATIONAL_READS,
    'payments.write',
    'payments.delete',
    'payments.verify',
    'receipts.create',
    'debts.write',
    'customers.write',
    'products.write',
    'expenses.write',
    'invoices.write',
    'tasks.write',
    'checklists.write',
    'team.read',
    'attendance.write',
    'payroll.write',
  ],
  // Cashier: the shop-floor role. Can take money in, issue receipts,
  // handle customers & debts. Read-only elsewhere.
  CASHIER: [
    ...OPERATIONAL_READS,
    'payments.write',
    'receipts.create',
    'debts.write',
    'customers.write',
    'tasks.write', // cashier can tick off their own tasks
  ],
  // Viewer: read-only everywhere operational. No writes.
  VIEWER: [...OPERATIONAL_READS],
  NONE: [],
};

export function can(role: AccessRole, action: Permission): boolean {
  return MATRIX[role]?.includes(action) ?? false;
}

export function rolesAllowed(action: Permission): AccessRole[] {
  return (Object.keys(MATRIX) as AccessRole[]).filter((r) => can(r, action));
}

/** Human labels for UI display. */
export const ROLE_LABELS: Record<AccessRole, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
  VIEWER: 'Viewer',
  NONE: 'No app access',
};

export const ROLE_DESCRIPTIONS: Record<AccessRole, string> = {
  OWNER: 'Full access — only you.',
  MANAGER: 'Runs operations. No access to settings, billing, or team management.',
  CASHIER: 'Records payments, issues receipts, handles customers and debts.',
  VIEWER: 'Read-only across the business. No edits.',
  NONE: 'Tracked for payroll only. No app login.',
};

/** Roles the owner can assign via invite (OWNER is implicit, NONE is the default). */
export const ASSIGNABLE_ROLES: AccessRole[] = ['MANAGER', 'CASHIER', 'VIEWER'];
