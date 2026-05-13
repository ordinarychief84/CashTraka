import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Section } from '@/components/marketing/Section';
import { Reveal } from '@/components/marketing/Reveal';
import { Stagger } from '@/components/marketing/Stagger';
import { SOLUTIONS_PAGE } from '@/lib/marketing-content';

export const metadata: Metadata = {
  title: SOLUTIONS_PAGE.metaTitle,
  description: SOLUTIONS_PAGE.metaDescription,
  alternates: { canonical: 'https://www.cashtraka.co/solutions' },
  openGraph: {
    title: SOLUTIONS_PAGE.metaTitle,
    description: SOLUTIONS_PAGE.metaDescription,
    url: 'https://www.cashtraka.co/solutions',
    siteName: 'CashTraka',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SOLUTIONS_PAGE.metaTitle,
    description: SOLUTIONS_PAGE.metaDescription,
  },
};

const ANCHORS = [
  'orders',
  'production',
  'materials',
  'shortages',
  'purchases',
  'invoices',
  'reports',
] as const;

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <Navbar />
      <main>
        <section className="container-app pt-14 pb-10 md:pt-20 md:pb-14">
          <Reveal from="up">
            <span className="inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
              Solutions
            </span>
          </Reveal>
          <Reveal from="up" delay={80}>
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-ink md:text-5xl md:leading-[1.05]">
              {SOLUTIONS_PAGE.h1}
            </h1>
          </Reveal>
          <Reveal from="up" delay={160}>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              {SOLUTIONS_PAGE.sub}
            </p>
          </Reveal>
          <Reveal from="up" delay={240}>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary text-sm">
                Start free
                <ArrowRight size={16} />
              </Link>
              <Link href="/contact?topic=demo" className="btn-secondary text-sm">
                Book demo
              </Link>
            </div>
          </Reveal>
        </section>

        <Section tone="muted">
          <Stagger from="up" step={70}>
            <div className="grid gap-5 md:grid-cols-2">
              {SOLUTIONS_PAGE.sections.map((s, i) => (
                <article
                  key={s.title}
                  id={ANCHORS[i]}
                  className="card scroll-mt-20 p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <s.icon size={22} />
                  </span>
                  <h2 className="mt-4 text-xl font-bold text-ink">{s.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </article>
              ))}
            </div>
          </Stagger>
        </Section>

        <Section
          title="One workflow. Less software."
          subtitle="Customer orders, production, materials, inventory, purchases, invoices, and receipts — connected end to end."
        >
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary text-sm">
              Start free
              <ArrowRight size={16} />
            </Link>
            <Link href="/pricing" className="btn-secondary text-sm">
              View pricing
            </Link>
            <Link href="/industries" className="btn-secondary text-sm">
              Browse industries
            </Link>
          </div>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
