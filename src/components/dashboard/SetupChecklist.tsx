import Link from 'next/link';
import {
  Check,
  ArrowRight,
  User,
  Landmark,
  BookOpen,
  Banknote,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';

/**
 * Dismissible-by-completion checklist that lives at the top of the
 * seller dashboard. Surfaces the small handful of profile + setup
 * tasks that materially affect downstream UX (receipts that say
 * "Untitled Business", PayLinks that can't deposit money, margin
 * reports that read ₦0 because no recipes are wired up).
 *
 * Auto-hides once every step is checked, so it doesn't shout at
 * established tenants. The empty-catalogue case is owned by
 * `TemplateQuickStart` higher up in the dashboard; this only renders
 * when the catalogue has at least one item — at that point the user is
 * past the "what do I even sell?" question and into the "is my account
 * presentable?" question that this checklist answers.
 */

type StepDef = {
  key: string;
  /** True when the user has completed this step. */
  done: boolean;
  /** True when the dashboard should surface this step at all. Hidden
   *  steps don't count toward the progress bar denominator. */
  applicable: boolean;
  title: string;
  description: string;
  cta: string;
  href: string;
  Icon: LucideIcon;
};

export async function SetupChecklist({ userId }: { userId: string }) {
  // One round-trip: pull profile fields + every count we need in one
  // Promise.all so this card adds at most ~50ms to dashboard render.
  const [user, productCount, recipeCount, paidPaymentCount] = await Promise.all(
    [
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          businessName: true,
          whatsappNumber: true,
          bankAccountNumber: true,
          bankName: true,
        },
      }),
      prisma.product.count({ where: { userId, archived: false } }),
      prisma.recipe.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.payment.count({ where: { userId, status: 'PAID' } }),
    ],
  );

  // Empty-catalogue case → defer to `TemplateQuickStart`. Showing both
  // would be repetitive and the template hero is more actionable.
  if (productCount === 0) return null;

  const profileDone = Boolean(
    user?.businessName?.trim() && user.whatsappNumber?.trim(),
  );
  const bankDone = Boolean(
    user?.bankAccountNumber?.trim() && user.bankName?.trim(),
  );
  const recipeDone = recipeCount > 0;
  const saleDone = paidPaymentCount > 0;

  const steps: StepDef[] = [
    {
      key: 'profile',
      done: profileDone,
      applicable: true,
      title: 'Add your business name & WhatsApp',
      description:
        'Shown on every receipt and invoice so customers know who they paid.',
      cta: profileDone ? 'Edit profile' : 'Add now',
      // SettingsShell reads `?tab=` to select the active section. Land
      // the user directly on Profile, not the default landing tab.
      href: '/settings/edit?tab=profile',
      Icon: User,
    },
    {
      key: 'bank',
      done: bankDone,
      applicable: true,
      title: 'Add bank details',
      description:
        'Required for PayLinks and bank-transfer receipts. Customers see your account, not ours.',
      cta: bankDone ? 'Update bank' : 'Add now',
      // AccountTab owns bank fields — land directly on it instead of
      // the default Profile tab.
      href: '/settings/edit?tab=account',
      Icon: Landmark,
    },
    {
      key: 'recipe',
      done: recipeDone,
      applicable: productCount > 0,
      title: 'Create your first recipe',
      description:
        'Unlocks material consumption, batch costing, and the margin column on every production run.',
      cta: recipeDone ? 'Manage recipes' : 'Pick a product',
      href: '/recipes',
      Icon: BookOpen,
    },
    {
      key: 'sale',
      done: saleDone,
      applicable: true,
      title: 'Record your first paid sale',
      description:
        'Generates a receipt you can send on WhatsApp and seeds your revenue dashboard.',
      cta: saleDone ? 'Record another' : 'Record sale',
      href: '/payments/new',
      Icon: Banknote,
    },
  ];

  const applicable = steps.filter((s) => s.applicable);
  const completed = applicable.filter((s) => s.done).length;

  // Everything done → render nothing. This is intentional: the card
  // is meant to disappear quietly, not become a permanent fixture.
  if (completed === applicable.length) return null;

  const progressPct = Math.round((completed / applicable.length) * 100);

  return (
    <section className="mb-8 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/60 via-white to-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">Finish setting up</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            {completed} of {applicable.length} done — the rest take under a
            minute each.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-brand-700">
          <span className="num">{progressPct}%</span>
        </div>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${progressPct}%` }}
          aria-label={`${progressPct} percent complete`}
        />
      </div>

      <ul className="grid gap-2 md:grid-cols-2">
        {applicable.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3 transition',
                s.done
                  ? 'border-success-200 bg-success-50/40 hover:bg-success-50'
                  : 'border-border bg-white hover:border-brand-200 hover:bg-brand-50/40',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  s.done
                    ? 'bg-success-500 text-white'
                    : 'bg-slate-100 text-slate-500',
                )}
                aria-hidden
              >
                {s.done ? <Check size={14} strokeWidth={3} /> : <s.Icon size={14} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'truncate text-sm font-semibold',
                      s.done ? 'text-success-800' : 'text-ink',
                    )}
                  >
                    {s.title}
                  </span>
                  {!s.done && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-brand-700">
                      {s.cta}
                      <ArrowRight size={11} />
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'mt-0.5 line-clamp-2 text-xs',
                    s.done ? 'text-success-700/80' : 'text-slate-500',
                  )}
                >
                  {s.description}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
