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

export async function POST(req: Request) {
  const results: Record<string, string> = {};

  // Step 1: Parse body
  try {
    const body = await req.json();
    results.step1_parseBody = 'OK: ' + JSON.stringify(body).substring(0, 100);
  } catch (e: any) {
    results.step1_parseBody = 'FAIL: ' + e.message;
    return NextResponse.json(results);
  }

  // Step 2: Import and test validators
  try {
    const { signupSchema } = await import('@/lib/validators');
    const body = { name: 'Test', email: 'test@test.com', password: 'StrongP@ss1!', businessType: 'seller' };
    const parsed = signupSchema.safeParse(body);
    results.step2_validation = parsed.success ? 'OK' : 'FAIL: ' + JSON.stringify(parsed.error.issues[0]);
  } catch (e: any) {
    results.step2_validation = 'IMPORT_FAIL: ' + e.message;
  }

  // Step 3: Import and test rate limit
  try {
    const { rateLimit, clientIp } = await import('@/lib/rate-limit');
    const ip = clientIp(req);
    const limited = rateLimit('healthcheck', ip, { max: 100, windowMs: 60000 });
    results.step3_rateLimit = 'OK: allowed=' + limited.allowed;
  } catch (e: any) {
    results.step3_rateLimit = 'FAIL: ' + e.message;
  }

  // Step 4: Import and test password policy
  try {
    const { isWeakPassword } = await import('@/lib/password-policy');
    const weak = isWeakPassword('password123');
    const strong = isWeakPassword('MyStr0ngP@ss!');
    results.step4_passwordPolicy = 'OK: weak=true(' + weak + ') strong=false(' + strong + ')';
  } catch (e: any) {
    results.step4_passwordPolicy = 'FAIL: ' + e.message;
  }

  // Step 5: Test bcrypt hashing
  try {
    const { hashPassword } = await import('@/lib/auth');
    const hash = await hashPassword('TestPass123!');
    results.step5_bcrypt = 'OK: hash=' + hash.substring(0, 20) + '...';
  } catch (e: any) {
    results.step5_bcrypt = 'FAIL: ' + e.message;
  }

  // Step 6: Test DB findUnique
  try {
    const result = await prisma.user.findUnique({ where: { email: 'nonexistent@test.com' } });
    results.step6_dbFind = 'OK: found=' + (result !== null);
  } catch (e: any) {
    results.step6_dbFind = 'FAIL: ' + e.message;
  }

  // Step 7: Test DB create + delete (transactional)
  try {
    const testUser = await prisma.user.create({
      data: {
        name: 'Healthcheck Test',
        email: 'healthcheck-' + Date.now() + '@test.com',
        passwordHash: '$2a$10$test',
        businessType: 'seller',
        lastLoginAt: new Date(),
      },
    });
    results.step7_dbCreate = 'OK: id=' + testUser.id;
    // Clean up
    await prisma.user.delete({ where: { id: testUser.id } });
    results.step7_cleanup = 'OK';
  } catch (e: any) {
    results.step7_dbCreate = 'FAIL: ' + e.message;
  }

  // Step 8: Test cookies (this is the suspect!)
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    results.step8_cookies = 'OK: type=' + typeof cookieStore;
  } catch (e: any) {
    results.step8_cookies = 'FAIL: ' + e.message;
  }

  // Step 9: Test JWT signing
  try {
    const { SignJWT } = await import('jose');
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'test');
    const token = await new SignJWT({ sub: 'test' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret);
    results.step9_jwt = 'OK: token=' + token.substring(0, 30) + '...';
  } catch (e: any) {
    results.step9_jwt = 'FAIL: ' + e.message;
  }

  // Step 10: Test cookie set
  try {
    const { cookies } = await import('next/headers');
    cookies().set('healthcheck_test', 'ok', { path: '/', maxAge: 10 });
    results.step10_cookieSet = 'OK';
  } catch (e: any) {
    results.step10_cookieSet = 'FAIL: ' + e.message;
  }

  return NextResponse.json(results);
}
