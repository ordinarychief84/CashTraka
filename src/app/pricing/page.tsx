import Link from 'next/link';
import { Check } from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { formatPriceNaira, PLAN_PRICING } from '@/lib/billing/pricing';

export const metadata = { title: 'Pricing — CashTraka' };

export default function PricingPage() {
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
                One recovered debt pays for a whole year. Start free, upgrade when your business is ready. No contracts, cancel anytime.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Plans */}
        <section className="py-12 md:py-16">
          <div className="container-app">
            <div className="mx-auto max-w-5xl">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Free Plan */}
                <div className="relative flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:shadow-md">
                  <h3 className="text-lg font-bold text-ink">Starter</h3>
                  <p className="mt-2 text-sm text-slate-600">Perfect for trying out CashTraka</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-ink">Free</span>
                  </div>
                  <Link
                    href="/signup?plan=free"
                    className="btn-secondary mt-6 w-full justify-center"
                  >
                    Start free
                  </Link>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    No card required
                  </p>
                  <ul className="mt-6 space-y-3">
                    <Feature>Up to 10 customers</Feature>
                    <Feature>Record payments</Feature>
                    <Feature>Track outstanding debts</Feature>
                    <Feature>WhatsApp reminders</Feature>
                    <Feature>Basic reports</Feature>
                  </ul>
                </div>

                {/* Business Plan */}
                <div className="relative flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:shadow-md">
                  <h3 className="text-lg font-bold text-ink">Business</h3>
                  <p className="mt-2 text-sm text-slate-600">For growing businesses</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-ink">
                      {formatPriceNaira(PLAN_PRICING.business.amountKobo)}
                    </span>
                    <span className="text-sm text-slate-600">/month</span>
                  </div>
                  <Link
                    href="/signup?plan=business"
                    className="btn-primary mt-6 w-full justify-center"
                  >
                    Start 14-day trial
                  </Link>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    No card required
                  </p>
                  <ul className="mt-6 space-y-3">
                    <Feature>Unlimited customers</Feature>
                    <Feature>Unlimited payments</Feature>
                    <Feature>Advanced reports</Feature>
                    <Feature>Payment requests (PayLink)</Feature>
                    <Feature>Email notifications</Feature>
                    <Feature>Data export</Feature>
                  </ul>
                </div>

                {/* Business Plus Plan */}
                <div className="relative flex flex-col rounded-2xl border-2 border-brand-500 bg-gradient-to-br from-brand-50 to-white p-6 shadow-md transition hover:shadow-lg">
                  <div className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                    Recommended
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-ink">Business Plus</h3>
                  <p className="mt-2 text-sm text-slate-600">Most popular for sellers</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-ink">
                      {formatPriceNaira(PLAN_PRICING.business_plus.amountKobo)}
                    </span>
                    <span className="text-sm text-slate-600">/month</span>
                  </div>
                  <Link
                    href="/signup?plan=business_plus"
                    className="btn-primary mt-6 w-full justify-center"
                  >
                    Start 14-day trial
                  </Link>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    No card required
                  </p>
                  <ul className="mt-6 space-y-3">
                    <Feature>Everything in Business</Feature>
                    <Feature>Bulk customer import</Feature>
                    <Feature>Customer segments & targeting</Feature>
                    <Feature>Scheduled follow-ups</Feature>
                    <Feature>API access</Feature>
                  </ul>
                </div>

                {/* Landlord Plan */}
                <div className="relative flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:shadow-md">
                  <h3 className="text-lg font-bold text-ink">Landlord</h3>
                  <p className="mt-2 text-sm text-slate-600">For property managers</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-ink">
                      {formatPriceNaira(PLAN_PRICING.landlord.amountKobo)}
                    </span>
                    <span className="text-sm text-slate-600">/month</span>
                  </div>
                  <Link
                    href="/signup?plan=landlord"
                    className="btn-primary mt-6 w-full justify-center"
                  >
                    Start 14-day trial
                  </Link>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    No card required
                  </p>
                  <ul className="mt-6 space-y-3">
                    <Feature>Everything in Business</Feature>
                    <Feature>Property & tenant tracking</Feature>
                    <Feature>Rent collection management</Feature>
                    <Feature>Multi-property dashboard</Feature>
                    <Feature>Automated rent reminders</Feature>
                    <Feature>Property reports</Feature>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="border-t border-border bg-slate-50 py-12 md:py-16">
          <div className="container-app">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-ink">Feature comparison</h2>
              <div className="mt-8 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left font-semibold text-ink">Feature</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">
                        Starter
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">
                        Business
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">
                        Business Plus
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">
                        Landlord
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <ComparisonRow
                      feature="Customers"
                      starter="Up to 10"
                      business="Unlimited"
                      businessPlus="Unlimited"
                      landlord="Unlimited"
                    />
                    <ComparisonRow
                      feature="Payment recording"
                      starter={true}
                      business={true}
                      businessPlus={true}
                      landlord={true}
                    />
                    <ComparisonRow
                      feature="Outstanding debts tracking"
                      starter={true}
                      business={true}
                      businessPlus={true}
                      landlord={true}
                    />
                    <ComparisonRow
                      feature="WhatsApp reminders"
                      starter={true}
                      business={true}
                      businessPlus={true}
                      landlord={true}
                    />
                    <ComparisonRow
                      feature="Payment requests (PayLink)"
                      starter={false}
                      business={true}
                      businessPlus={true}
                      landlord={true}
                    />
                    <ComparisonRow
                      feature="Advanced reports"
                      starter={false}
                      business={true}
                      businessPlus={true}
                      landlord={true}
                    />
                    <ComparisonRow
                      feature="Email notifications"
                      starter={false}
                      business={true}
                      businessPlus={true}
                      landlord={true}
                    />
                    <ComparisonRow
                      feature="Data export"
                      starter={false}
                      business={true}
                      businessPlus={true}
                      landlord={true}
                    />
                    <ComparisonRow
                      feature="Bulk customer import"
                      starter={false}
                      business={false}
                      businessPlus={true}
                      landlord={false}
                    />
                    <ComparisonRow
                      feature="Customer segments & targeting"
                      starter={false}
                      business={false}
                      businessPlus={true}
                      landlord={false}
                    />
                    <ComparisonRow
                      feature="Scheduled follow-ups"
                      starter={false}
                      business={false}
                      businessPlus={true}
                      landlord={false}
                    />
                    <ComparisonRow
                      feature="API access"
                      starter={false}
                      business={false}
                      businessPlus={true}
                      landlord={false}
                    />
                    <ComparisonRow
                      feature="Property tracking"
                      starter={false}
                      business={false}
                      businessPlus={false}
                      landlord={true}
                    />
                    <ComparisonRow
                      feature="Rent collection management"
                      starter={false}
                      business={false}
                      businessPlus={false}
                      landlord={true}
                    />
                    <ComparisonRow
                      feature="Multi-property dashboard"
                      starter={false}
                      business={false}
                      businessPlus={false}
                      landlord={true}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 md:py-16">
          <div className="container-app">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-ink">Frequently asked questions</h2>
              <div className="mt-8 space-y-6">
                <FAQItem
                  question="Can I try the paid plans for free?"
                  answer="Yes! Every paid plan comes with a 14-day free trial. You won't be charged until the trial ends, and you can cancel anytime before then."
                />
                <FAQItem
                  question="Can I change plans anytime?"
                  answer="Absolutely. You can upgrade or downgrade your plan at any time from your billing settings. Changes take effect at the start of your next billing cycle."
                />
                <FAQItem
                  question="What payment methods do you accept?"
                  answer="We use Paystack for all payments, which accepts Nigerian bank transfers, cards, and mobile money. Paystack handles all payment processing securely."
                />
                <FAQItem
                  question="Do you offer discounts for annual plans?"
                  answer="Currently, all plans are billed monthly. Contact us if you'd like to discuss custom billing arrangements for your business."
                />
                <FAQItem
                  question="What happens if I cancel my subscription?"
                  answer="Your access continues until the end of your current billing period. You won't be charged again, but you can still use all paid features until your period ends."
                />
                <FAQItem
                  question="Is there a contract or long-term commitment?"
                  answer="No. There are no contracts. You can cancel your subscription anytime, and you'll only be charged for the time you've used."
                />
                <FAQItem
                  question="Do you offer refunds?"
                  answer="We stand behind our product. If you're not satisfied within your first 7 days, we'll refund your payment. Contact support for more details."
                />
                <FAQItem
                  question="Which plan is right for my business?"
                  answer="Starter is perfect for trying CashTraka. Business is great for growing sellers with many customers. Business Plus adds advanced features like bulk imports and API access. Landlord is built for property managers managing multiple properties and tenants."
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

function ComparisonRow({
  feature,
  starter,
  business,
  businessPlus,
  landlord,
}: {
  feature: string;
  starter?: boolean | string;
  business?: boolean | string;
  businessPlus?: boolean | string;
  landlord?: boolean | string;
}) {
  return (
    <tr>
      <td className="px-4 py-3 font-medium text-ink">{feature}</td>
      <td className="px-4 py-3 text-center">
        {typeof starter === 'string' ? (
          <span className="text-slate-600">{starter}</span>
        ) : starter ? (
          <Check
            size={18}
            className="mx-auto text-brand-600"
            strokeWidth={3}
          />
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {typeof business === 'string' ? (
          <span className="text-slate-600">{business}</span>
        ) : business ? (
          <Check
            size={18}
            className="mx-auto text-brand-600"
            strokeWidth={3}
          />
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {typeof businessPlus === 'string' ? (
          <span className="text-slate-600">{businessPlus}</span>
        ) : businessPlus ? (
          <Check
            size={18}
            className="mx-auto text-brand-600"
            strokeWidth={3}
          />
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {typeof landlord === 'string' ? (
          <span className="text-slate-600">{landlord}</span>
        ) : landlord ? (
          <Check
            size={18}
            className="mx-auto text-brand-600"
            strokeWidth={3}
          />
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
    </tr>
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
