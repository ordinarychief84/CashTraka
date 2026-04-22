import { LegalLayout } from '@/components/marketing/LegalLayout';

export const metadata = { title: 'Terms of Use | CashTraka' };

/**
 * Terms of Use (Nigeria). Effective date tracks the Privacy Policy.
 */
export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Use"
      updated="16 April 2026"
      intro="By accessing or using CashTraka, you agree to these Terms of Use. If you do not agree, do not use the platform."
    >
      <h2>1. Agreement</h2>
      <p>
        By accessing or using CashTraka, you agree to these Terms of Use. If
        you do not agree, do not use the platform.
      </p>

      <h2>2. Description of Service</h2>
      <p>CashTraka provides tools to:</p>
      <ul>
        <li>track payments</li>
        <li>manage debts</li>
        <li>manage customer records</li>
        <li>generate receipts</li>
      </ul>
      <p>CashTraka is not a bank, payment processor, or accounting firm.</p>

      <h2>3. User Responsibilities</h2>
      <p>You agree to:</p>
      <ul>
        <li>provide accurate information</li>
        <li>use the platform lawfully</li>
        <li>protect your account credentials</li>
        <li>ensure the accuracy of your transaction records</li>
      </ul>
      <p>You are solely responsible for all activity under your account.</p>

      <h2>4. Data Responsibility</h2>
      <p>You are responsible for:</p>
      <ul>
        <li>all customer data entered</li>
        <li>all transaction records</li>
        <li>all communications sent to your customers</li>
      </ul>
      <p>
        You must comply with NDPR when handling personal data of your
        customers.
      </p>

      <h2>5. Payments and Subscriptions</h2>
      <p>If you subscribe to a paid plan:</p>
      <ul>
        <li>fees are billed as stated</li>
        <li>payments are non-refundable unless otherwise specified</li>
        <li>failure to pay may result in suspension or restricted access</li>
      </ul>

      <h2>6. Account Suspension</h2>
      <p>We may suspend or terminate your account if:</p>
      <ul>
        <li>you violate these Terms</li>
        <li>you engage in unlawful activity</li>
        <li>you misuse the platform</li>
      </ul>

      <h2>7. Intellectual Property</h2>
      <p>
        All rights to the CashTraka platform, including software and design,
        are owned by CashTraka. You may not:
      </p>
      <ul>
        <li>copy</li>
        <li>modify</li>
        <li>distribute</li>
        <li>reverse engineer</li>
      </ul>
      <p>any part of the platform without permission.</p>

      <h2>8. Limitation of Liability</h2>
      <p>CashTraka is provided &ldquo;as is&rdquo;. We are not liable for:</p>
      <ul>
        <li>financial losses</li>
        <li>inaccurate records</li>
        <li>business decisions made using the platform</li>
        <li>system interruptions or errors</li>
      </ul>

      <h2>9. No Professional Advice</h2>
      <p>CashTraka does not provide:</p>
      <ul>
        <li>financial advice</li>
        <li>legal advice</li>
        <li>accounting services</li>
      </ul>

      <h2>10. Termination</h2>
      <p>You may stop using the service at any time.</p>
      <p>We may terminate access if necessary to:</p>
      <ul>
        <li>enforce these Terms</li>
        <li>comply with legal obligations</li>
        <li>protect the platform</li>
      </ul>

      <h2>11. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the Federal Republic of
        Nigeria.
      </p>

      <h2>12. Changes to Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the
        platform means you accept the updated Terms.
      </p>

      <h2>13. Contact</h2>
      <p>
        For questions, email us at{' '}
        <a href="mailto:Support@cashtraka.co">Support@cashtraka.co</a>.
      </p>
    </LegalLayout>
  );
}
