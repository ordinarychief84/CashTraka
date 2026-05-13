import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Section } from '@/components/marketing/Section';
import { Reveal } from '@/components/marketing/Reveal';
import { Stagger } from '@/components/marketing/Stagger';
import { INDUSTRIES, INDUSTRIES_PAGE } from '@/lib/marketing-content';

export const metadata: Metadata = {
  title: INDUSTRIES_PAGE.metaTitle,
  description: INDUSTRIES_PAGE.metaDescription,
  alternates: { canonical: 'https://www.cashtraka.co/industries' },
  openGraph: {
    title: INDUSTRIES_PAGE.metaTitle,
    description: INDUSTRIES_PAGE.metaDescription,
    url: 'https://www.cashtraka.co/industries',
    siteName: 'CashTraka',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: INDUSTRIES_PAGE.metaTitle,
    description: INDUSTRIES_PAGE.metaDescription,
  },
};

export default function IndustriesPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <Navbar />
      <main>
        <section className="container-app pt-14 pb-10 md:pt-20 md:pb-14">
          <Reveal from="up">
            <span className="inline-block rounded-full border border-success-200 bg-success-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-success-700">
              Industries
            </span>
          </Reveal>
          <Reveal from="up" delay={80}>
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-ink md:text-5xl md:leading-[1.05]">
              {INDUSTRIES_PAGE.h1}
            </h1>
          </Reveal>
          <Reveal from="up" delay={160}>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              {INDUSTRIES_PAGE.sub}
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
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {INDUSTRIES.map((ind) => (
                <article
                  key={ind.slug}
                  id={ind.slug}
                  className="card scroll-mt-20 flex h-full flex-col p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-50 text-success-700">
                    <ind.icon size={22} />
                  </span>
                  <h2 className="mt-4 text-xl font-bold text-ink">{ind.title}</h2>

                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                      The pain
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{ind.pain}</p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-700">
                      How CashTraka helps
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{ind.body}</p>
                  </div>

                  <Link
                    href="/signup"
                    className="mt-auto inline-flex items-center gap-1 pt-6 text-sm font-semibold text-brand-700 hover:underline"
                  >
                    Start free
                    <ArrowRight size={14} />
                  </Link>
                </article>
              ))}
            </div>
          </Stagger>
        </Section>

        <Section
          title="Different products, same daily problem."
          subtitle="Whatever you make, assemble, package, or process, the workflow stays the same: orders, materials, production, invoices, receipts."
        >
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary text-sm">
              Start free
              <ArrowRight size={16} />
            </Link>
            <Link href="/solutions" className="btn-secondary text-sm">
              Explore the workflow
            </Link>
          </div>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
