import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_PAGE_TITLE } from '@/context/constants';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import useReveal from './ui/useReveal';
import './site.css';
import './ui/ui.css';

/**
 * Shared shell for every public page: skip link, sticky header, main and
 * footer. Sets the document title, scopes the `.hc` theme (always light),
 * resets scroll on navigation and runs the once-only section reveals.
 */
const SiteLayout = ({ title, children }) => {
  const { pathname } = useLocation();
  // Reset scroll before the reveal hook measures what is below the fold.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const revealRef = useReveal([pathname]);

  useEffect(() => {
    document.title = title ? `${title} | Herit Clothing` : 'Herit Clothing';
    return () => { document.title = DEFAULT_PAGE_TITLE; };
  }, [title]);

  // Capture a referral code (?ref=CODE) and campaign attribution (?utm_source /
  // ?utm_campaign) from the landing URL so they survive browse → checkout.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    try {
      const ref = q.get('ref');
      if (ref) localStorage.setItem('herit_ref', ref.toUpperCase());
      const src = q.get('utm_source') || q.get('source');
      if (src) localStorage.setItem('herit_src', src.slice(0, 60));
      const camp = q.get('utm_campaign');
      if (camp) localStorage.setItem('herit_camp', camp.slice(0, 120));
    } catch { /* ignore */ }
  }, [pathname]);

  return (
    <div className="hc hc-page">
      <a className="hc-skip" href="#main">Skip to main content</a>
      <SiteHeader />
      <main id="main" tabIndex={-1} ref={revealRef}>{children}</main>
      <SiteFooter />
    </div>
  );
};

export default SiteLayout;
