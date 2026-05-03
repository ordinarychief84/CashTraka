import Link from 'next/link';
import { Check } from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Reveal } from '@/components/marketing/Reveal';
import { formatPriceNaira, PLAN_PRICING } from '@/lib/billing/pricing';

export const metadata = { title: 'Pricing | CashTraka' };

export default function PricingPage() {
  const proQ = PLAN_PRICING.starter_quarterly;
  const proB = PLAN_PRICING.starter_biannually;
  const proY = PLAN_PRICING.starter_yearly;

  const taxQ = PLAN_PRICING.tax_plus_quarterly;
  const taxB = PLAN_PRICING.tax_plus_biannually;
  const taxY = PLAN_PRICING.tax_plus_yearly;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden py-14 md:py-20">
          {/* Ambient washes */}
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-brand-50/70 via-brand-50/20 to-transparent" />
          <div className="pointer-events-none absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-brand-100/40 blur-3xl" />
          <div className="container-app">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                  Three plans. Pick the one that fits.
                </h1>
                <p className="mt-4 text-lg text-slate-600">
                  Free for tiny businesses, Pro for growing ones, Tax+ for VAT-registered
                  businesses that want filing on autopilot. Pay monthly or yearly. Cancel anytime.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Three-tier cards */}
        <section className="pb-12 md:pb-16">
          <div className="container-app">
            <div className="mx-auto max-w-5xl">
              <div className="grid gap-6 md:grid-cols-3">
                {/* Free */}
                <Reveal>
                  <div className="relative flex h-full flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:shadow-md">
                    <h3 className="text-lg font-bold text-ink">Free</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-ink">₦0</span>
                      <span className="text-sm text-slate-600">/month</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Forever free. No card required.
                    </p>

                    <Link
                      href="/signup?plan=free"
                      className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-brand-500 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                    >
                      Sign up free
                    </Link>

                    <div className="mt-6 border-t border-border pt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        What you get
                      </p>
                      <ul className="mt-3 space-y-2.5">
                        <Feature>50 payments per month</Feature>
                        <Feature>Up to 50 customers</Feature>
                        <Feature>Up to 20 active debts</Feature>
                        <Feature>Receipts via WhatsApp</Feature>
                        <Feature>Bank alert verification</Feature>
                        <Feature>Basic reports</Feature>
                      </ul>
                    </div>
                  </div>
                </Reveal>

                {/* Pro, recommended */}
                <Reveal delay={80}>
                  <div className="relative flex h-full flex-col rounded-2xl border-2 border-brand-500 bg-white p-6 shadow-md transition hover:shadow-lg">
                    <div className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                      Most popular
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-ink">Pro</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-ink">
                        {formatPriceNaira(proQ.perMonthKobo)}
                      </span>
                      <span className="text-sm text-slate-600">/month</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Quarterly billing. Save more on yearly.
                    </p>

                    {/* Price chips */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <PriceChip
                        label="Quarterly"
                        amount={`${formatPriceNaira(proQ.perMonthKobo)}/mo`}
                      />
                      <PriceChip
                        label="Biannual"
                        amount={`${formatPriceNaira(proB.perMonthKobo)}/mo`}
                      />
                      <PriceChip
                        label="Yearly"
                        amount={`${formatPriceNaira(proY.perMonthKobo)}/mo`}
                        highlight
                      />
                    </div>
                    <p className="mt-2 text-xs text-brand-700 font-semibold">
                      Yearly saves {proY.savingsPercent}%
                    </p>

                    <Link
                      href="/signup?plan=starter_quarterly"
                      className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                    >
                      Start 7-day free trial
                    </Link>

                    <div className="mt-6 border-t border-border pt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Everything in Free, plus
                      </p>
                      <ul className="mt-3 space-y-2.5">
                        <Feature>Unlimited customers, payments, debts</Feature>
                        <Feature>Invoices, recurring, and credit notes</Feature>
                        <Feature>FIRS-ready tax invoices</Feature>
                        <Feature>Cash flow forecast</Feature>
                        <Feature>Customer credit score on every profile</Feature>
                        <Feature>Service Check feedback</Feature>
                        <Feature>Public pay link via Paystack</Feature>
                        <Feature>Custom branding on receipts</Feature>
                        <Feature>Priority email support</Feature>
                      </ul>
                    </div>
                  </div>
                </Reveal>

                {/* Tax+ */}
                <Reveal delay={160}>
                  <div className="relative flex h-full flex-col rounded-2xl border border-brand-200 bg-brand-50/50 p-6 shadow-sm transition hover:shadow-md">
                    <div className="absolute -top-3 left-6 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
                      For VAT-registered businesses
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-ink">Tax+</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-ink">
                        {formatPriceNaira(taxQ.perMonthKobo)}
                      </span>
                      <span className="text-sm text-slate-600">/month</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      For businesses that file VAT and want it on autopilot.
                    </p>

                    {/* Price chips */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <PriceChip
                        label="Quarterly"
                        amount={`${formatPriceNaira(taxQ.perMonthKobo)}/mo`}
                      />
                      <PriceChip
                        label="Biannual"
                        amount={`${formatPriceNaira(taxB.perMonthKobo)}/mo`}
                        note={`${taxB.savingsPercent}% off`}
                      />
                      <PriceChip
                        label="Yearly"
                        amount={`${formatPriceNaira(taxY.perMonthKobo)}/mo`}
                        note={`${taxY.savingsPercent}% off`}
                        highlight
                      />
                    </div>

                    <Link
                      href="/signup?plan=tax_plus_quarterly"
                      className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                    >
                      Start 7-day free trial
                    </Link>

                    <div className="mt-6 border-t border-brand-200 pt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Everything in Pro, plus
                      </p>
                      <ul className="mt-3 space-y-2.5">
                        <Feature>Auto VAT returns, monthly and quarterly</Feature>
                        <Feature>Year-end accountant export pack</Feature>
                        <Feature>Multi-user with audit trail</Feature>
                        <Feature>Bank statement sync (coming with Mono)</Feature>
                        <Feature>Virtual account per invoice (coming)</Feature>
                        <Feature>Priority WhatsApp support, response under 4 hours</Feature>
                      </ul>
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* All plans include strip */}
              <Reveal delay={120}>
                <div className="mt-10 rounded-2xl border border-border bg-slate-50 px-6 py-5">
                  <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    All plans include
                  </p>
                  <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-700">
                    <IncludeItem>WhatsApp first</IncludeItem>
                    <IncludeItem>Mobile first</IncludeItem>
                    <IncludeItem>Nigerian voice</IncludeItem>
                    <IncludeItem>No contract</IncludeItem>
                    <IncludeItem>Cancel anytime</IncludeItem>
                  </ul>
                </div>
              </Reveal>

              {/* Volume fee disclosure */}
              <Reveal>
                <div className="mt-6 rounded-2xl border border-border bg-white p-5">
                  <h3 className="text-sm font-bold text-ink">A note on the volume fee</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Optional 1% platform fee on Paystack invoice payments, capped at ₦5,000
                    per transaction. Off by default. Turn it on in Settings if you want to
                    support CashTraka.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border py-12 md:py-16">
          <div className="container-app">
            <div className="mx-auto max-w-3xl">
              <Reveal>
                <h2 className="text-2xl font-bold text-ink">Pricing questions, answered</h2>
              </Reveal>
              <div className="mt-8 space-y-4">
                <FAQItem
                  question="Can I try CashTraka for free?"
                  answer="Yes. The Free plan is forever free, no card needed. If you want to try Pro or Tax+, you get 7 days of full access first. Your card is only charged on day 8 if you decide to keep going."
                />
                <FAQItem
                  question="What is the difference between Pro and Tax+?"
                  answer="Pro gives you the full invoice engine, FIRS-ready tax invoices, recurring billing, credit notes, and customer credit scores. Tax+ adds the things VAT-registered businesses need: automatic VAT returns, a year-end accountant pack, multi-user with audit trail, bank sync, and a virtual account on every invoice."
                />
                <FAQItem
                  question="Do I need to be VAT-registered to use Tax+?"
                  answer="No, but Tax+ is built for businesses that already file VAT or are about to start. If you do not file VAT yet, Pro is the right plan. You can switch up to Tax+ later when you cross the FIRS threshold."
                />
                <FAQItem
                  question="Can I switch tiers anytime?"
                  answer="Yes. Move between Free, Pro, and Tax+ from your settings. When you upgrade, the change kicks in right away. When you downgrade, the new plan starts at the end of your current cycle so you do not lose what you already paid for."
                />
                <FAQItem
                  question="What payment methods do you accept?"
                  answer="Paystack handles all payments. You can pay with any Nigerian debit card, by bank transfer, or by USSD."
                />
                <FAQItem
                  question="What happens to my data if I downgrade?"
                  answer="Nothing gets deleted. Your invoices, customers, payments, and receipts all stay readable. You only lose the ability to create new items that need a paid feature, like recurring invoices or VAT returns. Upgrade again and everything works."
                />
                <FAQItem
                  question="Do you offer refunds?"
                  answer="If something goes wrong in the first 7 days of a paid plan, email Support@cashtraka.co and we will refund you in full. After that, refunds are case by case."
                />
                <FAQItem
                  question="How does the volume fee work?"
                  answer="If you turn it on in Settings, CashTraka takes 1% of every invoice payment that comes through Paystack, capped at ₦5,000 per transaction. It is off by default. Most sellers leave it off. We added it for the ones who asked how to support us beyond the subscription."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden border-t border-border py-12 md:py-16">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-72 bg-gradient-to-t from-brand-50/60 to-transparent" />
          <div className="container-app">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-2xl font-bold text-ink md:text-3xl">
                  Start with what fits, upgrade when you grow.
                </h2>
                <p className="mt-3 text-slate-600">
                  Sign up in two minutes. Send your first invoice today.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/signup?plan=free"
                    className="inline-flex items-center justify-center rounded-lg border border-brand-500 bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                  >
                    Sign up free
                  </Link>
                  <Link
                    href="/signup?plan=starter_quarterly"
                    className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    Start Pro trial
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check
        size={16}
        className="mt-0.5 shrink-0 text-brand-600"
        strokeWidth={3}
      />
      <span className="text-sm text-slate-700">{children}</span>
    </li>
  );
}

function PriceChip({
  label,
  amount,
  note,
  highlight = false,
}: {
  label: string;
  amount: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ' +
        (highlight
          ? 'bg-brand-500 text-white ring-brand-500'
          : 'bg-white text-slate-700 ring-border')
      }
    >
      <span className={highlight ? 'text-white/80' : 'text-slate-500'}>{label}</span>
      <span className="font-semibold">{amount}</span>
      {note ? (
        <span className={highlight ? 'text-white/80' : 'text-brand-700'}>
          ({note})
        </span>
      ) : null}
    </span>
  );
}

function IncludeItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check size={14} className="text-brand-600" strokeWidth={3} />
      <span>{children}</span>
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
