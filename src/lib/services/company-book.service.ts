import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';

/**
 * Two thin CRUD services that back the General settings page's
 * "Addresses" and "Banking" tabs. Both:
 *   • are tenant-scoped via userId
 *   • soft-delete (deletedAt)
 *   • use Cascade on FK so user deletion cleans up
 *
 * Kept in one file because each service is small and they share a
 * lot of validation infrastructure.
 */

function cleanStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
}

function requireName(name: string | null | undefined, label: string) {
  const t = (name ?? '').trim();
  if (!t) throw Err.validation(`${label} name is required.`);
  if (t.length > 100) throw Err.validation(`${label} name is too long (max 100 characters).`);
  return t;
}

// ── Addresses ────────────────────────────────────────────────────

export type AddressInput = {
  name: string;
  street?: string | null;
  street2?: string | null;
  postcode?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  attention?: string | null;
  location?: string | null;
};

function normaliseAddress(input: AddressInput) {
  return {
    name: requireName(input.name, 'Address'),
    street: cleanStr(input.street),
    street2: cleanStr(input.street2),
    postcode: cleanStr(input.postcode),
    city: cleanStr(input.city),
    country: cleanStr(input.country),
    phone: cleanStr(input.phone),
    email: cleanStr(input.email),
    attention: cleanStr(input.attention),
    location: cleanStr(input.location),
  };
}

export const addressesService = {
  async listForUser(userId: string) {
    return prisma.businessAddress.findMany({
      where: { userId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  },

  async create(userId: string, input: AddressInput) {
    return prisma.businessAddress.create({
      data: { userId, ...normaliseAddress(input) },
    });
  },

  async update(userId: string, id: string, input: Partial<AddressInput>) {
    const existing = await prisma.businessAddress.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw Err.notFound('Address not found.');
    }
    const data: Record<string, unknown> = {};
    if (input.name != null) data.name = requireName(input.name, 'Address');
    for (const k of ['street','street2','postcode','city','country','phone','email','attention','location'] as const) {
      if (k in input) data[k] = cleanStr(input[k]);
    }
    return prisma.businessAddress.update({ where: { id }, data });
  },

  async softDelete(userId: string, id: string) {
    const existing = await prisma.businessAddress.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw Err.notFound('Address not found.');
    }
    return prisma.businessAddress.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};

// ── Bank accounts ────────────────────────────────────────────────

export type BankAccountInput = {
  name: string;
  bankName?: string | null;
  registrationNo?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  swift?: string | null;
  fiNumber?: string | null;
  isDefault?: boolean;
};

function normaliseBank(input: BankAccountInput) {
  return {
    name: requireName(input.name, 'Bank account'),
    bankName: cleanStr(input.bankName),
    registrationNo: cleanStr(input.registrationNo),
    accountNumber: cleanStr(input.accountNumber),
    iban: cleanStr(input.iban),
    swift: cleanStr(input.swift),
    fiNumber: cleanStr(input.fiNumber),
  };
}

export const bankAccountsService = {
  async listForUser(userId: string) {
    return prisma.bankAccount.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  },

  async create(userId: string, input: BankAccountInput) {
    const normalized = normaliseBank(input);
    return prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.bankAccount.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.bankAccount.create({
        data: { userId, ...normalized, isDefault: !!input.isDefault },
      });
    });
  },

  async update(userId: string, id: string, input: Partial<BankAccountInput>) {
    const existing = await prisma.bankAccount.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw Err.notFound('Bank account not found.');
    }
    const data: Record<string, unknown> = {};
    if (input.name != null) data.name = requireName(input.name, 'Bank account');
    for (const k of ['bankName','registrationNo','accountNumber','iban','swift','fiNumber'] as const) {
      if (k in input) data[k] = cleanStr(input[k]);
    }
    return prisma.$transaction(async (tx) => {
      if (input.isDefault === true) {
        await tx.bankAccount.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
        data.isDefault = true;
      } else if (input.isDefault === false) {
        data.isDefault = false;
      }
      return tx.bankAccount.update({ where: { id }, data });
    });
  },

  async softDelete(userId: string, id: string) {
    const existing = await prisma.bankAccount.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw Err.notFound('Bank account not found.');
    }
    return prisma.bankAccount.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
    });
  },
};
