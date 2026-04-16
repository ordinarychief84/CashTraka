import { LegalLayout } from '@/components/marketing/LegalLayout';

export const metadata = { title: 'Terms of Use — CashTraka' };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Use" updated="This is a placeholder for the MVP">
      <p>
        By using CashTraka you agree to use the service lawfully and only for tracking
        your own business records. You are responsible for the accuracy of the
        information you record and for the messages you send to your customers.
      </p>
      <p>
        CashTraka is provided “as is” during the MVP. Features may change as we learn
        from sellers. We will give reasonable notice before any breaking change.
      </p>
      <p>
        If you rely on CashTraka to track money, always keep your own backup records
        (notebook, spreadsheet, or bank statement) until you’re confident in the
        product.
      </p>
      <p>
        A full terms document will be published before general availability.
      </p>
    </LegalLayout>
  );
}
