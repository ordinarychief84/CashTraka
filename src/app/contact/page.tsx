import Link from 'next/link';
import { LegalLayout } from '@/components/marketing/LegalLayout';

export const metadata = { title: 'Contact — CashTraka' };

export default function ContactPage() {
  return (
    <LegalLayout title="Contact">
      <p>
        We'd love to hear from you. Whether you need help, want to give feedback, or
        are interested in a partnership, reach out and we'll get back to you.
      </p>
      <p>
        Email:{' '}
        <a href="mailto:Support@cashtraka.co" className="font-semibold text-brand-600 hover:underline">
          Support@cashtraka.co
        </a>
      </p>
      <p>
        Not a user yet?{' '}
        <Link href="/signup" className="font-semibold text-brand-600 hover:underline">
          Start free
        </Link>{' '}
        — it takes under five minutes.
      </p>
    </LegalLayout>
  );
}
