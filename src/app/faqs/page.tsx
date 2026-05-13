import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Section } from '@/components/marketing/Section';
import { FAQ } from '@/components/marketing/FAQ';
import { Reveal } from '@/components/marketing/Reveal';
import { FAQ_ITEMS } from '@/lib/marketing-content';

export const metadata: Metadata = {
  title: 'FAQs — Production Planning Software for Small Businesses',
  description:
    'Answers to common questions about CashTraka — production planning, material tracking, inventory, invoices, receipts, and operational reports for small batch businesses.',
  alternates: { canonical: 'https://www.cashtraka.co/faqs' },
  openGraph: {
    title: 'CashTraka FAQs | Production Planning Software for Small Businesses',
    description:
      'Common questions about production planning, materials, inventory, invoices, and receipts for small batch businesses.',
    url: 'https://www.cashtraka.co/faqs',
    siteName: 'CashTraka',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CashTraka FAQs',
    description:
      'Common questions about production planning, materials, inventory, invoices, and receipts.',
  },
};

export default function FAQsPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-white text-ink">
      <Navbar />
      <main>
        <section className="container-app pt-14 pb-10 md:pt-20 md:pb-14">
          <Reveal from="up">
            <span className="inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
              FAQs
            </span>
          </Reveal>
          <Reveal from="up" delay={80}>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-ink md:text-5xl md:leading-[1.05]">
              Frequently asked questions
            </h1>
          </Reveal>
          <Reveal from="up" delay={160}>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              Straight answers about what CashTraka does, who it is for, and how
              it fits a small batch production business.
            </p>
          </Reveal>
        </section>

        <Section tone="muted">
          <FAQ items={FAQ_ITEMS} />
        </Section>

        <Section
          title="Still have a question?"
          subtitle="Email or chat with us. A real person reads every message."
        >
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="btn-primary text-sm">
              Contact us
              <ArrowRight size={16} />
            </Link>
            <Link href="/signup" className="btn-secondary text-sm">
              Start free
            </Link>
          </div>
        </Section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </div>
  );
}
