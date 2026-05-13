'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

/**
 * Public navigation for the marketing site.
 *
 * After the pivot to an operational planning system the structure is:
 *   Product · Solutions · Industries · Pricing · FAQs · Login · Start Free
 *
 * Mobile uses a slide-down drawer; desktop is a single line of plain
 * links plus the two CTAs.
 */

const NAV_LINKS = [
  { label: 'Product', href: '/#features' },
  { label: 'Solutions', href: '/solutions' },
  { label: 'Industries', href: '/industries' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQs', href: '/faqs' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => setOpen(false);

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
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right-side CTAs (desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-700 hover:text-ink px-3 py-2"
          >
            Login
          </Link>
          <Link href="/contact?topic=demo" className="btn-secondary text-sm">
            Book demo
          </Link>
          <Link href="/signup" className="btn-primary text-sm">
            Start free
          </Link>
        </div>

        {/* Mobile right cluster */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/signup"
            className="btn-primary text-xs px-3 py-2"
            onClick={close}
          >
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
          open ? 'max-h-[90vh] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <nav className="container-app flex flex-col py-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={close}
              className="rounded-md px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={close}
            className="rounded-md px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            Login
          </Link>
          <Link
            href="/contact?topic=demo"
            onClick={close}
            className="mx-3 my-2 inline-flex items-center justify-center rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Book demo
          </Link>
        </nav>
      </div>
    </header>
  );
}
