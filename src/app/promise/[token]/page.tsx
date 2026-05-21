import { PromisePageClient } from './PromisePageClient';

export const dynamic = 'force-dynamic';

export default async function PromisePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return <PromisePageClient token={params.token} />;
}
