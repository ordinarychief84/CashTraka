/**
 * Role + business-type string constants. Kept as plain strings (not a Prisma
 * enum) because the schema uses SQLite-compatible `String @default("USER")`.
 */

export const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const BUSINESS_TYPES = {
  SELLER: 'seller',
  PROPERTY_MANAGER: 'property_manager',
} as const;

export type BusinessType =
  (typeof BUSINESS_TYPES)[keyof typeof BUSINESS_TYPES];

export function isAdmin(role: string | null | undefined): boolean {
  return role === ROLES.ADMIN;
}
