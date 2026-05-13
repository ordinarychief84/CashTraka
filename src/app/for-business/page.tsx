import { redirect } from 'next/navigation';

/**
 * Permanent redirect from the legacy `/for-business` route to the new
 * `/solutions` page after the operational-planning pivot. Kept so
 * inbound SEO traffic, old PR links, and any printed marketing assets
 * keep working.
 */
export default function ForBusinessLegacyRedirect() {
  redirect('/solutions');
}
