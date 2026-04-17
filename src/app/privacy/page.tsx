import { LegalLayout } from '@/components/marketing/LegalLayout';

export const metadata = { title: 'Privacy Policy — CashTraka' };

/**
 * NDPR-compliant Privacy Policy.
 * Effective Date kept in sync with the Terms page.
 */
export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="16 April 2026"
      intro="This Privacy Policy explains how CashTraka collects, uses, and protects your personal data in compliance with the Nigeria Data Protection Regulation (NDPR) and applicable Nigerian laws. By using CashTraka, you agree to the terms of this policy."
    >
      <h2>1. Introduction</h2>
      <p>
        This Privacy Policy explains how CashTraka (&ldquo;we&rdquo;,
        &ldquo;our&rdquo;, &ldquo;us&rdquo;) collects, uses, and protects your
        personal data. By using CashTraka, you agree to the terms of this
        policy.
      </p>

      <h2>2. Information We Collect</h2>
      <h3>A. Personal Information</h3>
      <ul>
        <li>Full name</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Business name (if provided)</li>
      </ul>
      <h3>B. Business Data</h3>
      <ul>
        <li>Customer names and phone numbers</li>
        <li>Payment records</li>
        <li>Debt records</li>
        <li>Transaction details</li>
      </ul>
      <h3>C. Technical Data</h3>
      <ul>
        <li>IP address</li>
        <li>Device and browser information</li>
        <li>Usage activity (logins, actions performed)</li>
      </ul>

      <h2>3. Lawful Basis for Processing</h2>
      <p>We process your data based on:</p>
      <ul>
        <li>
          <strong>Consent</strong> — when you sign up and use the platform.
        </li>
        <li>
          <strong>Contractual necessity</strong> — to provide the CashTraka
          service.
        </li>
        <li>
          <strong>Legitimate interest</strong> — to improve security and
          performance.
        </li>
      </ul>

      <h2>4. How We Use Your Data</h2>
      <p>We use your data to:</p>
      <ul>
        <li>provide and maintain the platform</li>
        <li>store and organize payment and debt records</li>
        <li>generate and deliver receipts</li>
        <li>communicate with you (emails, notifications)</li>
        <li>improve product performance and user experience</li>
        <li>provide customer support</li>
      </ul>

      <h2>5. Data Ownership</h2>
      <p>
        You retain full ownership of your data. CashTraka does not sell, rent,
        or trade your personal or business data.
      </p>

      <h2>6. Data Sharing</h2>
      <p>
        We may share your data only with trusted third-party providers
        necessary to operate the service, including:
      </p>
      <ul>
        <li>cloud hosting providers</li>
        <li>email delivery services</li>
        <li>file storage services</li>
      </ul>
      <p>
        All third parties are required to comply with NDPR and maintain data
        confidentiality.
      </p>

      <h2>7. Data Security</h2>
      <p>
        We implement appropriate technical and organizational measures,
        including:
      </p>
      <ul>
        <li>encrypted connections (HTTPS)</li>
        <li>secure authentication systems</li>
        <li>access control and role-based permissions</li>
      </ul>
      <p>
        However, no system is completely secure, and we cannot guarantee
        absolute protection.
      </p>

      <h2>8. Data Retention</h2>
      <p>We retain your data:</p>
      <ul>
        <li>as long as your account is active, or</li>
        <li>as required by applicable law.</li>
      </ul>
      <p>You may request deletion of your data at any time.</p>

      <h2>9. Your Rights (NDPR)</h2>
      <p>Under NDPR, you have the right to:</p>
      <ul>
        <li>request access to your personal data</li>
        <li>request correction of inaccurate data</li>
        <li>request deletion of your data</li>
        <li>withdraw consent at any time</li>
        <li>
          lodge a complaint with the Nigeria Data Protection Commission (NDPC)
        </li>
      </ul>

      <h2>10. Cross-Border Data Transfers</h2>
      <p>
        Your data may be stored or processed outside Nigeria. We ensure that
        any transfer complies with NDPR requirements and appropriate safeguards
        are in place.
      </p>

      <h2>11. Cookies and Tracking</h2>
      <p>We may use cookies or similar technologies to:</p>
      <ul>
        <li>maintain sessions</li>
        <li>improve performance</li>
        <li>analyze usage patterns</li>
      </ul>

      <h2>12. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy periodically. Updates will be posted
        on this page with a revised effective date.
      </p>

      <h2>13. Contact</h2>
      <p>
        For privacy-related inquiries, email us at{' '}
        <a href="mailto:Support@cashtraka.co">Support@cashtraka.co</a>.
      </p>
    </LegalLayout>
  );
}
