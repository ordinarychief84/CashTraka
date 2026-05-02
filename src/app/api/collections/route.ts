import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCollectionQueue } from '@/lib/services/collection.service';

/** GET /api/collections, smart collection queue */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const queue = await getCollectionQueue(user.id);
  return NextResponse.json(queue);
}
