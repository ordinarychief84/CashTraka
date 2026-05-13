import Link from 'next/link';
import { Mail, MessageCircle, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { FOOTER } from '@/lib/marketing-content';

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
                Talk to us
              </div>
              <h3 className="mt-1 text-xl font-bold text-ink md:text-2xl">
                Got a question or stuck on something? Send us a message.
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Email or open a chat. A real person reads every message.
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
        <div className="grid gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center">
              <Logo size="md" />
            </Link>
            <p className="mt-3 text-sm text-slate-600">{FOOTER.tagline}</p>
          </div>

          <Column title="Product">
            {FOOTER.columns.product.map((l) => (
              <FooterLink key={l.label} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
          </Column>

          <Column title="Solutions">
            {FOOTER.columns.solutions.map((l) => (
              <FooterLink key={l.label} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
          </Column>

          <Column title="Industries">
            {FOOTER.columns.industries.map((l) => (
              <FooterLink key={l.label} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
          </Column>

          <Column title="Company">
            {FOOTER.columns.company.map((l) => (
              <FooterLink key={l.label} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
            <FooterLink href="/contact">Contact</FooterLink>
            <FooterLink href="/privacy">Privacy Policy</FooterLink>
            <FooterLink href="/terms">Terms of Use</FooterLink>
          </Column>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border pt-6 text-xs text-slate-500 md:flex-row md:items-center">
          <div>&copy; {year} CashTraka. All rights reserved.</div>
          <div>Operational planning for small batch businesses in Nigeria & Africa.</div>
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
