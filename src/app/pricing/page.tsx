import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Section } from '@/components/marketing/Section';
import { PricingCards } from '@/components/marketing/PricingCards';
import { FAQ } from '@/components/marketing/FAQ';
import { Reveal } from '@/components/marketing/Reveal';
import {
  PRICING_HEADING,
  PRICING_SUB,
  PRICING_FAQS,
} from '@/lib/marketing-content';

export const metadata: Metadata = {
  title: 'Pricing — Production Planning Software for Small Businesses',
  description:
    'Choose a CashTraka plan for customer orders, production planning, raw material tracking, inventory, invoices, receipts, purchase orders, and operational reports.',
  alternates: { canonical: 'https://www.cashtraka.co/pricing' },
  openGraph: {
    title: 'CashTraka Pricing | Production Planning Software for Small Businesses',
    description:
      'Simple pricing for growing production businesses. Every new account gets 30 days of Pro free — no card required.',
    url: 'https://www.cashtraka.co/pricing',
    siteName: 'CashTraka',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CashTraka Pricing',
    description:
      'Simple pricing for growing production businesses. Every new account gets 30 days of Pro free — no card required.',
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <Navbar />
      <main>
        <section className="container-app pt-14 pb-10 md:pt-20 md:pb-14">
          <Reveal from="up">
            <span className="inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
              Pricing
            </span>
          </Reveal>
          <Reveal from="up" delay={80}>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-ink md:text-5xl md:leading-[1.05]">
              {PRICING_HEADING}
            </h1>
          </Reveal>
          <Reveal from="up" delay={160}>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              {PRICING_SUB}
            </p>
          </Reveal>
        </section>

        <section className="container-app pb-16 md:pb-24">
          <PricingCards />
          <p className="mt-8 text-center text-xs text-slate-500">
            All plans are billed monthly · Cancel anytime · WhatsApp & email support
          </p>
        </section>

        <Section
          tone="muted"
          eyebrow="Pricing FAQs"
          title="What you'll want to know before choosing a plan."
        >
          <FAQ items={PRICING_FAQS} />
        </Section>

        <Section
          title="Ready to get organized?"
          subtitle="Start your 30-day Pro trial — shortage alerts, recipes, purchase orders, and the operational recap all included. No card required."
        >
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary text-sm">
              Start 30-day free trial
              <ArrowRight size={16} />
            </Link>
            <Link href="/contact?topic=sales" className="btn-secondary text-sm">
              Talk to sales
            </Link>
          </div>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
