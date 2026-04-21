import { PromisePageClient } from './PromisePageClient';

export const dynamic = 'force-dynamic';

export default function PromisePage({ params }: { params: { token: string } }) {
  return <PromisePageClient token={params.token} />;
}
