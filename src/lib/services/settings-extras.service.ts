import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';

/**
 * Four thin CRUD services that back the Settings sub-pages introduced
 * in this batch — Adjustment categories, Languages, Projects — plus
 * an extension to PaymentTermDef so it carries a Rackbeat-style
 * `type` field ("Net", "Current month", "Paid in cash", "Prepayment",
 * "Due date", "Factoring", "Current week, starting Monday").
 *
 * They share the same shape:
 *   • tenant-scoped via userId
 *   • soft-deletable via deletedAt
 *   • case-insensitive duplicate-name guard within the active set
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

// ── Payment term types ──────────────────────────────────────────

export const PAYMENT_TERM_TYPES = [
  'NET',
  'CURRENT_MONTH',
  'PAID_IN_CASH',
  'PREPAYMENT',
  'DUE_DATE',
  'FACTORING',
  'CURRENT_WEEK_MONDAY',
] as const;
export type PaymentTermType = (typeof PAYMENT_TERM_TYPES)[number];

export const PAYMENT_TERM_TYPE_LABELS: Record<PaymentTermType, string> = {
  NET: 'Net',
  CURRENT_MONTH: 'Current month',
  PAID_IN_CASH: 'Paid in cash',
  PREPAYMENT: 'Prepayment',
  DUE_DATE: 'Due date',
  FACTORING: 'Factoring',
  CURRENT_WEEK_MONDAY: 'Current week, starting Monday',
};

// ── Adjustment categories ───────────────────────────────────────

export type AdjustmentCategoryInput = {
  name: string;
  type?: string | null;
};

export const adjustmentCategoriesService = {
  async listForUser(userId: string) {
    return prisma.adjustmentCategory.findMany({
      where: { userId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  },

  async create(userId: string, input: AdjustmentCategoryInput) {
    const name = requireName(input.name, 'Adjustment category');
    const type = cleanStr(input.type);

    const existing = await prisma.adjustmentCategory.findFirst({
      where: {
        userId,
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw Err.validation(`An adjustment category named "${name}" already exists.`);
    }
    return prisma.adjustmentCategory.create({
      data: { userId, name, type },
    });
  },

  async update(userId: string, id: string, input: Partial<AdjustmentCategoryInput>) {
    const existing = await prisma.adjustmentCategory.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw Err.notFound('Adjustment category not found.');
    }
    const data: Record<string, unknown> = {};
    if (input.name != null) data.name = requireName(input.name, 'Adjustment category');
    if ('type' in input) data.type = cleanStr(input.type);
    return prisma.adjustmentCategory.update({ where: { id }, data });
  },

  async softDelete(userId: string, id: string) {
    const existing = await prisma.adjustmentCategory.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw Err.notFound('Adjustment category not found.');
    }
    return prisma.adjustmentCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};

// ── Languages ───────────────────────────────────────────────────

export type LanguageInput = {
  name: string;
  code: string;
};

function validateCode(code: string) {
  const t = code.trim().toUpperCase();
  if (!t) throw Err.validation('Language code is required.');
  if (t.length > 8) throw Err.validation('Language code is too long (max 8 characters).');
  if (!/^[A-Z][A-Z0-9_-]{0,7}$/.test(t)) {
    throw Err.validation('Language code must be uppercase letters / numbers / dash / underscore (e.g. EN, FR, EN-US).');
  }
  return t;
}

export const languagesService = {
  async listForUser(userId: string) {
    let rows = await prisma.languageDef.findMany({
      where: { userId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    if (rows.length === 0) {
      // Africa-first default: English + French. Many CashTraka
      // customers operate across both Anglophone (Nigeria, Ghana, …)
      // and Francophone (Senegal, Côte d'Ivoire, Mali, …) markets.
      const en = await prisma.languageDef.create({
        data: { userId, name: 'English', code: 'EN' },
      });
      const fr = await prisma.languageDef.create({
        data: { userId, name: 'Français', code: 'FR' },
      });
      rows = [en, fr];
    }
    return rows;
  },

  async create(userId: string, input: LanguageInput) {
    const name = requireName(input.name, 'Language');
    const code = validateCode(input.code);
    const existing = await prisma.languageDef.findFirst({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { code: { equals: code, mode: 'insensitive' } },
        ],
      },
    });
    if (existing) {
      throw Err.validation(`A language with that name or code already exists.`);
    }
    return prisma.languageDef.create({ data: { userId, name, code } });
  },

  async update(userId: string, id: string, input: Partial<LanguageInput>) {
    const existing = await prisma.languageDef.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw Err.notFound('Language not found.');
    }
    const data: Record<string, unknown> = {};
    if (input.name != null) data.name = requireName(input.name, 'Language');
    if (input.code != null) data.code = validateCode(input.code);
    return prisma.languageDef.update({ where: { id }, data });
  },

  async softDelete(userId: string, id: string) {
    const existing = await prisma.languageDef.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw Err.notFound('Language not found.');
    }
    return prisma.languageDef.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};

// ── Projects ────────────────────────────────────────────────────

export type ProjectInput = {
  number: string;
  name: string;
  description?: string | null;
};

export const projectsService = {
  async listForUser(userId: string) {
    return prisma.projectDef.findMany({
      where: { userId, deletedAt: null },
      orderBy: { number: 'asc' },
    });
  },

  async create(userId: string, input: ProjectInput) {
    const number = (input.number ?? '').trim();
    if (!number) throw Err.validation('Project number is required.');
    if (number.length > 32) throw Err.validation('Project number is too long (max 32 characters).');
    const name = requireName(input.name, 'Project');
    const description = cleanStr(input.description);

    const existing = await prisma.projectDef.findFirst({
      where: {
        userId,
        deletedAt: null,
        number: { equals: number, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw Err.validation(`A project with number "${number}" already exists.`);
    }
    return prisma.projectDef.create({
      data: { userId, number, name, description },
    });
  },

  async update(userId: string, id: string, input: Partial<ProjectInput>) {
    const existing = await prisma.projectDef.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw Err.notFound('Project not found.');
    }
    const data: Record<string, unknown> = {};
    if (input.number != null) {
      const n = input.number.trim();
      if (!n) throw Err.validation('Project number is required.');
      data.number = n;
    }
    if (input.name != null) data.name = requireName(input.name, 'Project');
    if ('description' in input) data.description = cleanStr(input.description);
    return prisma.projectDef.update({ where: { id }, data });
  },

  async softDelete(userId: string, id: string) {
    const existing = await prisma.projectDef.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw Err.notFound('Project not found.');
    }
    return prisma.projectDef.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
