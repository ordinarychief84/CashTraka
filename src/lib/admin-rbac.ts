/**
 * Admin platform RBAC — controls which sections of /admin each staff role can access.
 *
 * This is separate from the business-level RBAC in rbac.ts (Owner/Manager/Cashier/Viewer).
 * Admin RBAC controls platform-level access for CashTraka staff members.
 */

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'BLOG_MANAGER'
  | 'BILLING_MANAGER'
  | 'SUPPORT_AGENT'
  | 'PROPERTY_MANAGER'
  | 'REPORTS_VIEWER';

export type AdminSection =
  | 'dashboard'
  | 'users'
  | 'roles'
  | 'support'
  | 'refunds'
  | 'subscriptions'
  | 'notifications'
  | 'analytics'
  | 'emails'
  | 'blog'
  | 'audit'
  | 'settings'
  | 'invoices'
  | 'recurring'
  | 'firs'
  | 'docAudit'
  | 'feedback';

/** Which admin sections each role can access */
const ADMIN_MATRIX: Record<AdminRole, AdminSection[]> = {
  SUPER_ADMIN: [
    'dashboard', 'users', 'roles', 'support', 'refunds', 'subscriptions',
    'notifications', 'analytics', 'emails', 'blog', 'audit', 'settings',
    'invoices', 'recurring', 'firs', 'docAudit', 'feedback',
  ],
  BLOG_MANAGER: ['dashboard', 'blog'],
  BILLING_MANAGER: ['dashboard', 'refunds', 'subscriptions', 'analytics', 'invoices', 'firs'],
  SUPPORT_AGENT: ['dashboard', 'users', 'support', 'notifications', 'emails', 'invoices', 'docAudit'],
  PROPERTY_MANAGER: ['dashboard', 'users'],
  REPORTS_VIEWER: ['dashboard', 'analytics', 'audit', 'invoices', 'recurring', 'firs', 'docAudit', 'feedback'],
};

/** Check if a role can access a section */
export function adminCan(role: AdminRole, section: AdminSection): boolean {
  return ADMIN_MATRIX[role]?.includes(section) ?? false;
}

/** Get all sections a role can access */
export function adminSections(role: AdminRole): AdminSection[] {
  return ADMIN_MATRIX[role] ?? [];
}

/** Map admin paths to sections */
export const PATH_TO_SECTION: Record<string, AdminSection> = {
  '/admin/dashboard': 'dashboard',
  '/admin/users': 'users',
  '/admin/roles': 'roles',
  '/admin/support': 'support',
  '/admin/refunds': 'refunds',
  '/admin/subscriptions': 'subscriptions',
  '/admin/notifications': 'notifications',
  '/admin/analytics': 'analytics',
  '/admin/emails': 'emails',
  '/admin/blog': 'blog',
  '/admin/audit': 'audit',
  '/admin/settings': 'settings',
  '/admin/invoices': 'invoices',
  '/admin/recurring-invoices': 'recurring',
  '/admin/firs': 'firs',
  '/admin/document-audit': 'docAudit',
  '/admin/feedback': 'feedback',
};

/** Human-readable labels */
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  BLOG_MANAGER: 'Blog Manager',
  BILLING_MANAGER: 'Billing Manager',
  SUPPORT_AGENT: 'Support Agent',
  PROPERTY_MANAGER: 'Property Manager',
  REPORTS_VIEWER: 'Reports Viewer',
};

export const ADMIN_ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Full platform access. Can manage all sections, staff, and settings.',
  BLOG_MANAGER: 'Create, edit, and publish blog posts. No access to user data or settings.',
  BILLING_MANAGER: 'Manage refunds, view analytics, and handle billing issues.',
  SUPPORT_AGENT: 'Handle support tickets, manage users, send notifications and emails.',
  PROPERTY_MANAGER: 'Oversee property-related users and data.',
  REPORTS_VIEWER: 'View-only access to analytics, reports, and audit logs.',
};

/** Roles that can be assigned to new staff (SUPER_ADMIN is reserved for existing admins) */
export const ASSIGNABLE_ADMIN_ROLES: AdminRole[] = [
  'BLOG_MANAGER',
  'BILLING_MANAGER',
  'SUPPORT_AGENT',
  'PROPERTY_MANAGER',
  'REPORTS_VIEWER',
];

/** All admin roles including SUPER_ADMIN */
export const ALL_ADMIN_ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  ...ASSIGNABLE_ADMIN_ROLES,
];
