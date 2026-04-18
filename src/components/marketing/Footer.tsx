import Link from 'next/link';
import { Mail, MessageCircle, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/Logo';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-white">
      {/* Contact us banner */}
      <div className="border-b border-border bg-slate-50">
        <div className="container-app py-10">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                Contact us
              </div>
              <h3 className="mt-1 text-xl font-bold text-ink md:text-2xl">
                Questions, feedback, or a request? We'd love to hear from you.
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Email us or open a chat — we read every message.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href="mailto:Support@cashtraka.co" className="btn-secondary text-sm">
                <Mail size={16} />
                Support@cashtraka.co
              </a>
              <Link href="/contact" className="btn-primary text-sm">
                <MessageCircle size={16} />
                Contact us
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-app py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Column 1: brand */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center">
              <Logo size="md" />
            </Link>
            <p className="mt-3 text-sm text-slate-600">
              Track payments, know who owes you, and follow up fast.
            </p>
          </div>

          {/* Column 2: product */}
          <Column title="Product">
            <FooterLink href="/#solutions">Solutions</FooterLink>
            <FooterLink href="/#how-it-works">How it Works</FooterLink>
            <FooterLink href="/#pricing">Pricing</FooterLink>
            <FooterLink href="/#faq">FAQ</FooterLink>
            <FooterLink href="/about">About us</FooterLink>
          </Column>

          {/* Column 3: account */}
          <Column title="Account">
            <FooterLink href="/login">Sign in</FooterLink>
            <FooterLink href="/signup">Start free</FooterLink>
          </Column>

          {/* Column 4: contact / legal */}
          <Column title="Contact & Legal">
            <FooterLink href="/contact">Contact us</FooterLink>
            <FooterLink href="mailto:Support@cashtraka.co">Support@cashtraka.co</FooterLink>
            <FooterLink href="/privacy">Privacy Policy</FooterLink>
            <FooterLink href="/terms">Terms of Use</FooterLink>
          </Column>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border pt-6 text-xs text-slate-500 md:flex-row md:items-center">
          <div>© {year} CashTraka. All rights reserved.</div>
          <div>Built for small businesses and landlords in Nigeria.</div>
        </div>
      </div>
    </footer>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold text-ink">{title}</div>
      <ul className="mt-3 space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-slate-600 hover:text-ink">
        {children}
      </Link>
    </li>
  );
}
