import Link from 'next/link';
import { Check } from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { formatPriceNaira, PLAN_PRICING } from '@/lib/billing/pricing';

export const metadata = { title: 'Pricing — CashTraka' };

export default function PricingPage() {
  const quarterly = PLAN_PRICING.starter_quarterly;
  const biannual = PLAN_PRICING.starter_biannually;
  const yearly = PLAN_PRICING.starter_yearly;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="py-14 md:py-20">
          <div className="container-app">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Simple, transparent pricing
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                One plan, full access, no feature gates. Pick the billing cycle that works for you. Start with a 7-day free trial — no card required.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Plans */}
        <section className="py-12 md:py-16">
          <div className="container-app">
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-6 md:grid-cols-3">
                {/* Quarterly */}
                <div className="relative flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:shadow-md">
                  <h3 className="text-lg font-bold text-ink">Quarterly</h3>
                  <p className="mt-2 text-sm text-slate-600">Billed every 3 months</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-ink">
                      {formatPriceNaira(quarterly.perMonthKobo)}
                    </span>
                    <span className="text-sm text-slate-600">/month</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatPriceNaira(quarterly.amountKobo)} billed quarterly
                  </p>
                  <Link
                    href="/signup?plan=starter_quarterly"
                    className="btn-secondary mt-6 w-full justify-center"
                  >
                    Start 7-day free trial
                  </Link>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    No card required
                  </p>
                </div>

                {/* Biannual — Recommended */}
                <div className="relative flex flex-col rounded-2xl border-2 border-brand-500 bg-gradient-to-br from-brand-50 to-white p-6 shadow-md transition hover:shadow-lg">
                  <div className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                    Best value
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-ink">Biannually</h3>
                  <p className="mt-2 text-sm text-slate-600">Billed every 6 months</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-ink">
                      {formatPriceNaira(biannual.perMonthKobo)}
                    </span>
                    <span className="text-sm text-slate-600">/month</span>
                  </div>
                  <p className="mt-1 text-xs text-brand-600 font-semibold">
                    Save {biannual.savingsPercent}% — {formatPriceNaira(biannual.amountKobo)} every 6 months
                  </p>
                  <Link
                    href="/signup?plan=starter_biannually"
                    className="btn-primary mt-6 w-full justify-center"
                  >
                    Start 7-day free trial
                  </Link>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    No card required
                  </p>
                </div>

                {/* Yearly */}
                <div className="relative flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:shadow-md">
                  <h3 className="text-lg font-bold text-ink">Yearly</h3>
                  <p className="mt-2 text-sm text-slate-600">Billed once a year</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-ink">
                      {formatPriceNaira(yearly.perMonthKobo)}
                    </span>
                    <span className="text-sm text-slate-600">/month</span>
                  </div>
                  <p className="mt-1 text-xs text-brand-600 font-semibold">
                    Save {yearly.savingsPercent}% — {formatPriceNaira(yearly.amountKobo)}/year
                  </p>
                  <Link
                    href="/signup?plan=starter_yearly"
                    className="btn-primary mt-6 w-full justify-center"
                  >
                    Start 7-day free trial
                  </Link>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    No card required
                  </p>
                </div>
              </div>

              {/* Feature list — shared across all frequencies */}
              <div className="mt-10 rounded-2xl border border-border bg-slate-50 p-8">
                <h3 className="text-lg font-bold text-ink text-center">
                  Every plan includes full access
                </h3>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Feature>Unlimited customers</Feature>
                  <Feature>Unlimited payments</Feature>
                  <Feature>Payment requests (PayLink)</Feature>
                  <Feature>WhatsApp reminders</Feature>
                  <Feature>Email notifications</Feature>
                  <Feature>Advanced reports &amp; export</Feature>
                  <Feature>Customer segments</Feature>
                  <Feature>Scheduled follow-ups</Feature>
                  <Feature>Invoices &amp; receipts</Feature>
                  <Feature>Collection score</Feature>
                  <Feature>Property &amp; tenant tracking</Feature>
                  <Feature>Team members &amp; roles</Feature>
                </div>
              </div>

              {/* Free tier note */}
              <div className="mt-6 rounded-xl border border-border bg-white p-6 text-center">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-ink">Just getting started?</span>{' '}
                  Use CashTraka free with up to 10 customers and core features. No trial, no expiry.{' '}
                  <Link href="/signup?plan=free" className="text-brand-600 font-semibold hover:underline">
                    Sign up free
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="border-t border-border py-12 md:py-16">
          <div className="container-app">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-ink">Frequently asked questions</h2>
              <div className="mt-8 space-y-6">
                <FAQItem
                  question="Can I try CashTraka for free?"
                  answer="Yes! Every paid plan comes with a 7-day free trial. You can also use the free tier forever with up to 10 customers."
                />
                <FAQItem
                  question="What's the difference between the billing cycles?"
                  answer="All three plans give you the exact same features — full access to everything. The only difference is how often you're billed and how much you save. Yearly billing saves you 25% compared to quarterly."
                />
                <FAQItem
                  question="Can I change my billing cycle anytime?"
                  answer="Absolutely. You can switch between quarterly, biannual, and yearly billing from your settings. Changes take effect at the start of your next billing cycle."
                />
                <FAQItem
                  question="What payment methods do you accept?"
                  answer="We use Paystack for all payments, which accepts Nigerian bank transfers, cards, and mobile money."
                />
                <FAQItem
                  question="What happens if I cancel?"
                  answer="Your access continues until the end of your current billing period. You won't be charged again, and you can always come back."
                />
                <FAQItem
                  question="Is there a contract or long-term commitment?"
                  answer="No contracts, ever. Cancel anytime. We keep things simple."
                />
                <FAQItem
                  question="Do you offer refunds?"
                  answer="If you're not satisfied within your first 7 days of a paid plan, contact support for a full refund."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border py-12 md:py-16">
          <div className="container-app">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-ink">
                Ready to stop guessing and start collecting?
              </h2>
              <p className="mt-3 text-slate-600">
                Join thousands of Nigerian businesses that recovered lost money with CashTraka.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className="btn-primary">
                  Start free trial
                </Link>
                <Link href="/" className="btn-secondary">
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Check
        size={18}
        className="mt-0.5 shrink-0 text-brand-600"
        strokeWidth={3}
      />
      <span className="text-sm text-slate-700">{children}</span>
    </li>
  );
}

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <h3 className="font-semibold text-ink">{question}</h3>
      <p className="mt-2 text-sm text-slate-600">{answer}</p>
    </div>
  );
}
