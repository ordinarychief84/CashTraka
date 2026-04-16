'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Menu,
  X,
  Wallet,
  Clock3,
  Users,
  MessageCircle,
  ChevronDown,
  Shield,
  FileText,
  Home,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

const SOLUTIONS = [
  {
    icon: Shield,
    title: 'Bank-alert verification',
    body: 'Kill fake screenshots forever.',
    href: '/#solutions',
  },
  {
    icon: Wallet,
    title: 'Payments & receipts',
    body: 'Track, verify, receipt — one flow.',
    href: '/#solutions',
  },
  {
    icon: FileText,
    title: 'Invoices',
    body: 'Professional, shareable, paid faster.',
    href: '/#solutions',
  },
  {
    icon: Clock3,
    title: 'Debts & reminders',
    body: 'Chase unpaid money automatically.',
    href: '/#solutions',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp follow-ups',
    body: 'Reminders and templates in one tap.',
    href: '/#solutions',
  },
  {
    icon: Home,
    title: 'Property management',
    body: 'Rent tracker for landlords.',
    href: '/#property-manager',
  },
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

  // Close the solutions dropdown on outside click / Escape
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
              Solutions
              <ChevronDown
                size={14}
                className={cn(
                  'transition-transform duration-200',
                  solutionsOpen && 'rotate-180',
                )}
              />
            </button>

            {/* Dropdown */}
            <div
              role="menu"
              className={cn(
                'absolute left-1/2 top-full z-50 mt-2 w-[22rem] -translate-x-1/2 origin-top rounded-2xl border border-border bg-white p-3 shadow-lg transition-all duration-200',
                solutionsOpen
                  ? 'visible opacity-100 translate-y-0'
                  : 'invisible opacity-0 -translate-y-2',
              )}
            >
              <div className="grid grid-cols-1 gap-1">
                {SOLUTIONS.map((s) => (
                  <Link
                    key={s.title}
                    href={s.href}
                    onClick={close}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-brand-50"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <s.icon size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        {s.title}
                      </span>
                      <span className="block text-xs text-slate-500">{s.body}</span>
                    </span>
                  </Link>
                ))}
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
          open ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <nav className="container-app flex flex-col py-2">
          <details className="group py-1">
            <summary className="flex cursor-pointer items-center justify-between rounded-md px-3 py-3 text-base font-medium text-slate-800 hover:bg-slate-100">
              Solutions
              <ChevronDown size={18} className="text-slate-500 transition group-open:rotate-180" />
            </summary>
            <div className="mt-1 space-y-1 px-1 pb-2">
              {SOLUTIONS.map((s) => (
                <Link
                  key={s.title}
                  href={s.href}
                  onClick={close}
                  className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-brand-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <s.icon size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{s.title}</span>
                    <span className="block text-xs text-slate-500">{s.body}</span>
                  </span>
                </Link>
              ))}
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
