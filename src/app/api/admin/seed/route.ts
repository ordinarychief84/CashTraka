// This endpoint has been intentionally disabled after initial admin seeding.
// Delete this file entirely before production deployment.
import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'Seed endpoint disabled' }, { status: 410 });
}
