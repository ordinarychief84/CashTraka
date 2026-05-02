import Link from 'next/link';
import { Check } from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { formatPriceNaira, PLAN_PRICING } from '@/lib/billing/pricing';

export const metadata = { title: 'Pricing | CashTraka' };

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
                One paid plan. Pick how often you pay.
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                Quarterly, every six months, or once a year. Same features on every cycle.
                The longer you commit, the less you pay per month. Start with a 7-day free trial,
                no card required.
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
                  <p className="mt-2 text-sm text-slate-600">Pay every 3 months</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-ink">
                      {formatPriceNaira(quarterly.perMonthKobo)}
                    </span>
                    <span className="text-sm text-slate-600">/month</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatPriceNaira(quarterly.amountKobo)} every 3 months
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

                {/* Biannual, Recommended */}
                <div className="relative flex flex-col rounded-2xl border-2 border-brand-500 bg-gradient-to-br from-brand-50 to-white p-6 shadow-md transition hover:shadow-lg">
                  <div className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                    Best value
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-ink">Biannually</h3>
                  <p className="mt-2 text-sm text-slate-600">Pay every 6 months</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-ink">
                      {formatPriceNaira(biannual.perMonthKobo)}
                    </span>
                    <span className="text-sm text-slate-600">/month</span>
                  </div>
                  <p className="mt-1 text-xs text-brand-600 font-semibold">
                    Save {biannual.savingsPercent}% · {formatPriceNaira(biannual.amountKobo)} every 6 months
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
                  <p className="mt-2 text-sm text-slate-600">Pay once a year</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-ink">
                      {formatPriceNaira(yearly.perMonthKobo)}
                    </span>
                    <span className="text-sm text-slate-600">/month</span>
                  </div>
                  <p className="mt-1 text-xs text-brand-600 font-semibold">
                    Save {yearly.savingsPercent}% · {formatPriceNaira(yearly.amountKobo)}/year
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

              {/* Starter features */}
              <div className="mt-10 rounded-2xl border border-border bg-slate-50 p-8">
                <h3 className="text-lg font-bold text-ink text-center">
                  What you get on Starter
                </h3>
                <p className="mt-2 text-center text-sm text-slate-600">
                  Same features on every billing cycle. Pick the one that fits your cash flow.
                </p>

                <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                  {/* Get paid */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-brand-700">
                      Get paid
                    </h4>
                    <ul className="mt-4 space-y-3">
                      <Feature>Unlimited invoices, line items and tax</Feature>
                      <Feature>Public pay link via Paystack</Feature>
                      <Feature>Auto receipts on every paid invoice</Feature>
                      <Feature>Payment reminders on WhatsApp</Feature>
                      <Feature>Bank alert verification for transfers</Feature>
                      <Feature>Card and transfer through Paystack</Feature>
                    </ul>
                  </div>

                  {/* Stay tax compliant */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-brand-700">
                      Stay tax compliant
                    </h4>
                    <ul className="mt-4 space-y-3">
                      <Feature>Tax invoices with TIN and buyer details</Feature>
                      <Feature>FIRS submission with XML download</Feature>
                      <Feature>IRN and QR code on every receipt</Feature>
                      <Feature>Item codes and line-level tax breakdown</Feature>
                      <Feature>6-year document archive built in</Feature>
                      <Feature>Document audit log for accountants</Feature>
                    </ul>
                  </div>

                  {/* Run on autopilot */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-brand-700">
                      Run on autopilot
                    </h4>
                    <ul className="mt-4 space-y-3">
                      <Feature>Recurring invoices for retainer clients</Feature>
                      <Feature>Credit notes for cancelled sales</Feature>
                      <Feature>Delivery notes for goods shipped</Feature>
                      <Feature>Quotes and offers that convert to invoices</Feature>
                      <Feature>Auto-debit installment plans on stored cards</Feature>
                      <Feature>Daily business pulse email</Feature>
                    </ul>
                  </div>

                  {/* Sell and track */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-brand-700">
                      Sell and track
                    </h4>
                    <ul className="mt-4 space-y-3">
                      <Feature>Customers, debts, and Promise to Pay</Feature>
                      <Feature>Smart Collection Queue with priority actions</Feature>
                      <Feature>Expense tracking with profit and loss</Feature>
                      <Feature>Team, attendance, and payroll</Feature>
                      <Feature>Property and tenant management</Feature>
                      <Feature>Custom branding on invoices and receipts</Feature>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Free tier comparison */}
              <div className="mt-6 rounded-2xl border border-border bg-white p-8">
                <h3 className="text-lg font-bold text-ink text-center">
                  Free plan
                </h3>
                <p className="mt-2 text-center text-sm text-slate-600">
                  For tiny operations. No card, no expiry. Use it as long as you like.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Feature>Up to 50 payments per month</Feature>
                  <Feature>Up to 20 active debts</Feature>
                  <Feature>Up to 50 customers</Feature>
                  <Feature>1 property and 5 tenants</Feature>
                  <Feature>1 team member only</Feature>
                  <Feature>Bank alert verification</Feature>
                  <Feature>Expense tracking and CSV export</Feature>
                  <Feature>Basic reports</Feature>
                  <Feature>WhatsApp reminders</Feature>
                </div>
                <p className="mt-6 text-center text-xs text-slate-500">
                  Free does not include invoices, recurring billing, credit notes, offers, or FIRS features.
                  Switch to Starter when you need them.
                </p>
                <div className="mt-6 text-center">
                  <Link href="/signup?plan=free" className="btn-secondary inline-flex">
                    Sign up free
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="border-t border-border py-12 md:py-16">
          <div className="container-app">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-ink">Pricing questions, answered</h2>
              <div className="mt-8 space-y-6">
                <FAQItem
                  question="How does the 7-day free trial work?"
                  answer="Pick any paid cycle and you get 7 days of full Starter access with no card. On day 8, you decide whether to keep going. If you do, that is when Paystack charges your card. If you do not, your account drops to the free plan and your data stays put."
                />
                <FAQItem
                  question="Can I switch between quarterly, biannual, and yearly?"
                  answer="Yes. Change your billing cycle from settings any time. The new cycle starts when your current one ends, no double billing."
                />
                <FAQItem
                  question="What payment methods do you accept?"
                  answer="Paystack handles all payments, so you can pay with any Nigerian debit card, by bank transfer, or by USSD."
                />
                <FAQItem
                  question="What happens if I cancel?"
                  answer="Your Starter access runs to the end of the cycle you already paid for. After that, your account drops to the free plan. Nothing gets deleted."
                />
                <FAQItem
                  question="Do you give refunds?"
                  answer="If something goes wrong in the first 7 days of a paid plan, email Support@cashtraka.co and we will refund you in full. After that, refunds are case by case."
                />
                <FAQItem
                  question="What happens to my data if I downgrade to free?"
                  answer="Your invoices, customers, payments, and receipts all stay readable. You just cannot create new invoices, recurring schedules, or credit notes until you go back to Starter. Nothing is deleted."
                />
                <FAQItem
                  question="Is FIRS compliance really included?"
                  answer="Yes, on Starter. You get tax invoices with TIN and buyer details, IRN and QR on every receipt, an XML download for FIRS submission, and a 6-year document archive when they come asking."
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
                Free to start. ₦3,000 a month when you are ready.
              </h2>
              <p className="mt-3 text-slate-600">
                Send your first invoice today. Take your first Paystack payment this week.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className="btn-primary">
                  Start free
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
