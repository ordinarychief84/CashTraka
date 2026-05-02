'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Menu,
  X,
  Banknote,
  Clock3,
  MessageCircle,
  ChevronDown,
  Shield,
  FileText,
  Home,
  Store,
  ArrowRight,
  GalleryHorizontalEnd,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

/**
 * Features-first navigation (Connecteam-style).
 *
 * The dropdown leads with our two ICP product pages "For Small Business" and
 * "For Landlords" presented as big primary cards. A secondary grid of
 * feature links sits underneath for visitors browsing by capability.
 */

type Solution = {
  icon: typeof Store;
  title: string;
  tagline: string;
  href: string;
  accent: 'brand' | 'success';
};

const ICP_SOLUTIONS: Solution[] = [
  {
    icon: Store,
    title: 'For Small Business',
    tagline:
      'Shops, food, services, tailors. Track payments, debts, invoices and receipts in one place.',
    href: '/for-business',
    accent: 'brand',
  },
  {
    icon: Home,
    title: 'For Landlords',
    tagline:
      'Track rent across every property and tenant, verify bank payments, auto-issue receipts.',
    href: '/for-landlords',
    accent: 'success',
  },
];

const FEATURES = [
  { icon: GalleryHorizontalEnd, title: 'Showroom (catalog albums)', href: '/#solutions' },
  { icon: Shield, title: 'Bank-alert verification', href: '/#solutions' },
  { icon: Banknote, title: 'Payments & receipts', href: '/#solutions' },
  { icon: FileText, title: 'Invoices', href: '/#solutions' },
  { icon: Clock3, title: 'Debts & reminders', href: '/#solutions' },
  { icon: MessageCircle, title: 'WhatsApp follow-ups', href: '/#solutions' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const solutionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!solutionsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!solutionsRef.current?.contains(e.target as Node)) setSolutionsOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setSolutionsOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [solutionsOpen]);

  const close = () => {
    setOpen(false);
    setSolutionsOpen(false);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'border-b border-border bg-white/90 backdrop-blur-md shadow-xs'
          : 'border-b border-transparent bg-white/60 backdrop-blur',
      )}
    >
      <div className="container-app flex h-16 items-center justify-between">
        <Link href="/" className="inline-flex items-center" onClick={close}>
          <Logo size="md" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <div className="relative" ref={solutionsRef}>
            <button
              type="button"
              aria-expanded={solutionsOpen}
              aria-haspopup="menu"
              onClick={() => setSolutionsOpen((v) => !v)}
              className={cn(
                'group inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition',
                solutionsOpen
                  ? 'bg-slate-100 text-ink'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-ink',
              )}
            >
              Features
              <ChevronDown
                size={14}
                className={cn(
                  'transition-transform duration-200',
                  solutionsOpen && 'rotate-180',
                )}
              />
            </button>

            {/* Mega dropdown */}
            <div
              role="menu"
              className={cn(
                'absolute left-1/2 top-full z-50 mt-2 w-[34rem] -translate-x-1/2 origin-top rounded-2xl border border-border bg-white p-4 shadow-xl transition-all duration-200',
                solutionsOpen
                  ? 'visible opacity-100 translate-y-0'
                  : 'invisible opacity-0 -translate-y-2',
              )}
            >
              {/* ICP solution cards */}
              <div className="grid grid-cols-2 gap-3">
                {ICP_SOLUTIONS.map((s) => (
                  <Link
                    key={s.title}
                    href={s.href}
                    onClick={close}
                    className={cn(
                      'group/card relative flex h-full flex-col gap-2 rounded-xl border p-4 transition',
                      s.accent === 'brand'
                        ? 'border-brand-100 bg-brand-50/50 hover:border-brand-300 hover:bg-brand-50'
                        : 'border-success-100 bg-success-50/40 hover:border-success-300 hover:bg-success-50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg text-white',
                        s.accent === 'brand' ? 'bg-brand-500' : 'bg-success-600',
                      )}
                    >
                      <s.icon size={18} />
                    </span>
                    <span className="block text-sm font-bold text-ink">{s.title}</span>
                    <span className="block text-xs leading-relaxed text-slate-600">
                      {s.tagline}
                    </span>
                    <span
                      className={cn(
                        'mt-auto inline-flex items-center gap-1 text-[11px] font-semibold',
                        s.accent === 'brand' ? 'text-brand-700' : 'text-success-700',
                      )}
                    >
                      Explore
                      <ArrowRight
                        size={12}
                        className="transition group-hover/card:translate-x-0.5"
                      />
                    </span>
                  </Link>
                ))}
              </div>

              {/* Secondary: feature links */}
              <div className="mt-4 border-t border-border pt-3">
                <p className="px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  By feature
                </p>
                <div className="mt-2 grid grid-cols-2 gap-0.5">
                  {FEATURES.map((f) => (
                    <Link
                      key={f.title}
                      href={f.href}
                      onClick={close}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-ink"
                    >
                      <f.icon size={14} className="text-brand-600" />
                      {f.title}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <a
            href="/#pricing"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-ink"
          >
            Pricing
          </a>
          <Link
            href="/about"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-ink"
          >
            About us
          </Link>
        </nav>

        {/* Right-side CTAs (desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-ink px-3 py-2">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary text-sm">
            Start free
          </Link>
        </div>

        {/* Mobile right cluster */}
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/signup" className="btn-primary text-xs px-3 py-2" onClick={close}>
            Start free
          </Link>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white text-slate-700"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          'overflow-hidden border-t border-border bg-white md:hidden transition-[max-height,opacity] duration-300 ease-out',
          open ? 'max-h-[90vh] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0',
        )}
      >
        <nav className="container-app flex flex-col py-2">
          <details className="group py-1" open>
            <summary className="flex cursor-pointer items-center justify-between rounded-md px-3 py-3 text-base font-medium text-slate-800 hover:bg-slate-100">
              Features
              <ChevronDown size={18} className="text-slate-500 transition group-open:rotate-180" />
            </summary>
            <div className="mt-1 space-y-2 px-1 pb-2">
              {ICP_SOLUTIONS.map((s) => (
                <Link
                  key={s.title}
                  href={s.href}
                  onClick={close}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3',
                    s.accent === 'brand'
                      ? 'border-brand-100 bg-brand-50/50'
                      : 'border-success-100 bg-success-50/40',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white',
                      s.accent === 'brand' ? 'bg-brand-500' : 'bg-success-600',
                    )}
                  >
                    <s.icon size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-ink">{s.title}</span>
                    <span className="block text-xs text-slate-600">{s.tagline}</span>
                  </span>
                </Link>
              ))}
              <div className="mt-2 border-t border-border pt-2">
                {FEATURES.map((f) => (
                  <Link
                    key={f.title}
                    href={f.href}
                    onClick={close}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <f.icon size={15} className="text-brand-600" />
                    {f.title}
                  </Link>
                ))}
              </div>
            </div>
          </details>
          <a
            href="/#pricing"
            onClick={close}
            className="rounded-md px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            Pricing
          </a>
          <Link
            href="/about"
            onClick={close}
            className="rounded-md px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            About us
          </Link>
          <Link
            href="/login"
            onClick={close}
            className="rounded-md px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
