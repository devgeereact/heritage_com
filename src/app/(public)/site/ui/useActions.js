import { useSiteConfig } from '../siteData';

/**
 * The site's two actions, decided in one place (BUILD-SPEC 4.7):
 * - primary: book online while public booking is on and ready, otherwise
 *   request an appointment through the contact form;
 * - secondary: the company-orders brief while that page is published,
 *   otherwise the contact form with the company type.
 */
export default function useActions() {
  const cfg = useSiteConfig();
  const booking = cfg?.booking_enabled === true;
  const company = cfg?.nav?.company === true;
  return {
    primary: booking
      ? { to: '/book', label: 'Book a measurement appointment', short: 'Book an appointment' }
      : { to: '/contact?type=fitting', label: 'Request a measurement appointment', short: 'Request an appointment' },
    secondary: company
      ? { to: '/company-orders#brief', label: 'Discuss a company order' }
      : { to: '/contact?type=company', label: 'Discuss a company order' },
  };
}
