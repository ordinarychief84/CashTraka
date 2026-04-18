import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, string> = {};
  checks.dbUrlSet = process.env.DATABASE_URL ? 'yes' : 'NO';
  checks.authSecretSet = process.env.AUTH_SECRET ? 'yes' : 'NO';

  // Test DB connection
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    checks.dbConnection = 'OK';
  } catch (e: any) {
    checks.dbConnection = 'FAIL: ' + (e.message || String(e)).substring(0, 300);
  }

  // Test User table
  try {
    const count = await prisma.user.count();
    checks.userTable = 'OK (count: ' + count + ')';
  } catch (e: any) {
    checks.userTable = 'FAIL: ' + (e.message || String(e)).substring(0, 300);
  }

  return NextResponse.json(checks);
}

// POST removed — it was a debug endpoint that created test data in production.
