import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { emailService } from '@/lib/services/email.service';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompleted: true },
  });

  // Send welcome email immediately after onboarding is completed
  emailService
    .sendWelcome({ to: user.email, name: user.name, businessType: user.businessType })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
