import { redirect } from 'next/navigation';
import { getCurrentUser } from './auth';

/**
 * Require an authenticated user. Also, if they have NOT completed onboarding
 * and the current page is not /onboarding, send them to /onboarding.
 */
export async function guard(options: { requireOnboarded?: boolean } = {}) {
  const { requireOnboarded = true } = options;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (requireOnboarded && !user.onboardingCompleted) redirect('/onboarding');
  return user;
}
