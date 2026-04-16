import { LegalLayout } from '@/components/marketing/LegalLayout';

export const metadata = { title: 'Privacy Policy — CashTraka' };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="This is a placeholder policy for the MVP">
      <p>
        CashTraka collects only the information you give us: your name, email, business
        name, phone number, and the payments, debts, and customers you add.
      </p>
      <p>
        Your data is yours. We do not sell your data. We do not share your customer
        records with third parties. You can request export or deletion of your account
        at any time by contacting us.
      </p>
      <p>
        WhatsApp messages are sent through your own WhatsApp account using
        <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-sm">wa.me</code>
        links. CashTraka never reads your WhatsApp messages and never sends them for you.
      </p>
      <p>
        This is a short placeholder policy for the MVP. A full legal policy will be
        published before general availability.
      </p>
    </LegalLayout>
  );
}
