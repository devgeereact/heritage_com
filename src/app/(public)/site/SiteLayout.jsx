import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { DEFAULT_PAGE_TITLE } from '@/context/constants';
import { useAuthContext } from '@/context/useAuthContext';
import { roleHome } from '@/helpers/roles';
import { heritApi } from '@/helpers/heritApi';
import { useCart } from './cart';
import { useStoreConfig, useShopEnabled } from './storeConfig';
import { useBookingEnabled } from './bookingConfig';
import logoDark from '@/assets/images/logo-dark.svg';
import logoLight from '@/assets/images/logo-light.svg';
import './site.css';

// `shop` items show only while the retail shop is switched on (settings.shop_enabled).
const NAV = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop', shop: true },
  { to: '/about', label: 'About' },
  { to: '/gifting', label: 'Gifting', shop: true },
  { to: '/contact', label: 'Contact' },
];

// Social links. Defaults are placeholders; super_admin sets the real URLs in
// Settings (saved to settings.socials, served publicly via store.php?action=config).
// A platform is shown only when it has a URL.
const SOCIAL_DEFS = [
  { key: 'instagram', label: 'Instagram', icon: 'mdi:instagram', fallback: 'https://instagram.com' },
  { key: 'facebook', label: 'Facebook', icon: 'mdi:facebook', fallback: 'https://facebook.com' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'mdi:whatsapp', fallback: 'https://wa.me/234' },
  { key: 'tiktok', label: 'TikTok', icon: 'ic:baseline-tiktok', fallback: 'https://tiktok.com' },
  { key: 'twitter', label: 'X (Twitter)', icon: 'mdi:twitter', fallback: '' },
  { key: 'youtube', label: 'YouTube', icon: 'mdi:youtube', fallback: '' },
];

const useSocials = () => {
  const socials = useStoreConfig()?.socials;
  // resolve: configured URL wins; else placeholder fallback (so the footer is
  // never empty before the backend is deployed / configured).
  return SOCIAL_DEFS
    .map((s) => ({ ...s, url: (socials?.[s.key] || '').trim() || s.fallback }))
    .filter((s) => s.url);
};

const SiteNav = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { count } = useCart();
  const { isAuthenticated, user } = useAuthContext();
  const shopOn = useShopEnabled();
  const bookOn = useBookingEnabled();
  const dash = roleHome(user?.role);
  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <header className="hc-nav">
      <div className="hc-container hc-nav-inner">
        <Link to="/" className="hc-brand" aria-label="Herit Clothing — home">
          <img src={logoDark} alt="Herit Clothing" className="hc-brand-logo" />
        </Link>

        <button
          className="hc-nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <IconifyIcon icon={open ? 'solar:close-square-linear' : 'solar:hamburger-menu-linear'} />
        </button>

        <nav className={`hc-nav-links ${open ? 'is-open' : ''}`}>
          {NAV.filter((n) => shopOn || !n.shop).map((n) => (
            <Link key={n.to} to={n.to} className={`hc-nav-link ${isActive(n.to) ? 'is-active' : ''}`}>
              {n.label}
            </Link>
          ))}
          {bookOn && (
            <Link to="/book" className={`hc-nav-link ${isActive('/book') ? 'is-active' : ''}`}>Book appointment</Link>
          )}
          <Link to="/account" className="hc-nav-icon" aria-label="Your account">
            <IconifyIcon icon="solar:user-circle-linear" />
            <span className="hc-nav-icon-label">Account</span>
          </Link>
          {shopOn && (
            <Link to="/cart" className="hc-nav-bag" aria-label={`Bag, ${count} ${count === 1 ? 'item' : 'items'}`}>
              <IconifyIcon icon="solar:bag-4-bold" />
              <span className="hc-nav-bag-label">Bag</span>
              <span className="hc-nav-bag-count">{count}</span>
            </Link>
          )}
          {isAuthenticated ? (
            <Link to={dash} className="hc-nav-login hc-nav-login--in" aria-label="Go to dashboard">
              <IconifyIcon icon="solar:widget-5-bold" /> Dashboard
            </Link>
          ) : (
            <Link to="/auth/sign-in" className="hc-nav-login" aria-label="Staff login">
              <IconifyIcon icon="solar:lock-keyhole-minimalistic-linear" /> Staff login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

// Footer email capture — writes to the same enquiries table as the contact form
// (contact.php), tagged interest=newsletter so staff can see signups in CRM.
const NewsletterForm = () => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done | error

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || state === 'sending') return;
    setState('sending');
    try {
      await heritApi.contact.submit({
        name: 'Newsletter signup',
        email: email.trim(),
        type: 'general',
        interest: 'newsletter',
        message: 'Joined the family from the site footer — wants launch news + HERIT10.',
      });
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <p className="hc-mt-1" style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>
        ✓ You&apos;re in — watch your inbox for code HERIT10.
      </p>
    );
  }

  return (
    <>
      <form className="hc-foot-news" onSubmit={submit}>
        <input
          type="email"
          required
          placeholder="your@email.com"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === 'sending'}
        />
        <button type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? '…' : 'Join'}
        </button>
      </form>
      {state === 'error' && (
        <p className="hc-mt-1" style={{ color: '#FCD34D', fontSize: '0.82rem' }}>
          Couldn&apos;t sign you up just now — please try again.
        </p>
      )}
    </>
  );
};

const SiteFooter = () => {
  const { isAuthenticated, user } = useAuthContext();
  const shopOn = useShopEnabled();
  const socials = useSocials();
  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  return (
  <footer className="hc-footer hc-footer--editorial">
    <div className="hc-container">
      {/* feature — brand invitation + newsletter */}
      <div className="hc-foot-feature">
        <div className="hc-foot-feature-lead">
          <div className="hc-kicker">Join the family</div>
          <h2 className="hc-foot-headline">
            Heritage, <em>delivered</em><br />worldwide.
          </h2>
          <p>
            Our pieces are made in limited runs. Be first to new drops — and get 10% off your
            first piece with code <strong>HERIT10</strong>.
          </p>
        </div>
        <div className="hc-foot-feature-side">
          <span className="hc-foot-news-label">Get the drop list</span>
          <NewsletterForm />
          <div className="hc-foot-socials" aria-label="Herit on social">
            {socials.map((s) => (
              <a key={s.key} href={s.url} target="_blank" rel="noreferrer noopener" className="hc-social" aria-label={s.label}>
                <IconifyIcon icon={s.icon} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <hr className="hc-foot-rule" />

      {/* link columns */}
      <div className="hc-foot-cols">
        <div className="hc-foot-about">
          <img src={logoLight} alt="Herit Clothing" className="hc-foot-logo" />
          <p>
            Contemporary African fashion, rooted in real heritage fabrics — Ankara, Adire and
            Aso-Oke, reworked with modern cuts. Made by hand in Ajuwon Market, Lagos, for the world.
          </p>
          <ul className="hc-foot-visit">
            <li><IconifyIcon icon="solar:map-point-bold" /> Ajuwon Market · Lagos, Nigeria</li>
            <li><a href="mailto:hello@heritclothing.com"><IconifyIcon icon="solar:letter-bold" /> hello@heritclothing.com</a></li>
          </ul>
        </div>

        {shopOn && (
          <nav className="hc-foot-links" aria-label="Shop">
            <h6>Shop</h6>
            <Link to="/shop">All pieces</Link>
            <Link to="/shop?fabric=Ankara">Ankara</Link>
            <Link to="/shop?fabric=Adire">Adire</Link>
            <Link to="/shop?fabric=Aso-Oke">Aso-Oke</Link>
            <Link to="/gifting">Gifting</Link>
          </nav>
        )}

        <nav className="hc-foot-links" aria-label="Company">
          <h6>Company</h6>
          <Link to="/about">Our story</Link>
          <Link to="/journal">Journal</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/contact">Stockists</Link>
        </nav>

        <nav className="hc-foot-links" aria-label="Help">
          <h6>Help</h6>
          <Link to="/contact">Shipping</Link>
          <Link to="/contact">Returns</Link>
          <Link to="/contact">Size &amp; fit</Link>
          <Link to="/track">Track order</Link>
        </nav>
      </div>

      {/* oversized brand watermark */}
      <div className="hc-foot-wordmark" aria-hidden="true">HERIT</div>

      <div className="hc-foot-bottom">
        <span>© {new Date().getFullYear()} Herit Clothing · Wear your heritage.</span>
        <span className="hc-foot-bottom-links">
          <Link to={isAuthenticated ? roleHome(user?.role) : '/auth/sign-in'} className="hc-foot-staff">
            <IconifyIcon icon={isAuthenticated ? 'solar:widget-5-bold' : 'solar:lock-keyhole-minimalistic-linear'} />
            {isAuthenticated ? 'Staff dashboard' : 'Staff login'}
          </Link>
          <span className="hc-foot-madein">Made in Lagos, shipped worldwide</span>
        </span>
        <button type="button" className="hc-foot-top" onClick={toTop} aria-label="Back to top">
          Back to top <IconifyIcon icon="solar:alt-arrow-up-linear" />
        </button>
      </div>
    </div>
  </footer>
  );
};

/**
 * Shared shell for every public page: sticky nav + footer.
 * Sets the document title, scopes the `.hc` theme, and resets
 * scroll on navigation so each detailed page starts at the top.
 */
const SiteLayout = ({ title, children }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title ? `${title} — Herit Clothing` : 'Herit Clothing — Wear your heritage';
    return () => { document.title = DEFAULT_PAGE_TITLE; };
  }, [title]);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

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

  // Reveal each section as it scrolls into view. Skipped when the user prefers
  // reduced motion; degrades to fully-visible if IntersectionObserver is absent.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // Never animate the first section — the hero shows immediately so it can't
    // flash in. Geometry-based above-fold detection was unreliable before
    // web-fonts settled layout, which let the hero get tagged and fade from 0.
    const sections = Array.from(document.querySelectorAll('.hc main > section')).slice(1);
    sections.forEach((s) => s.classList.add('hc-reveal'));
    const reveal = (el) => { el.classList.add('hc-in'); io.unobserve(el); };
    // threshold 0 + no negative margin: a section reveals the moment any part
    // enters the viewport, so short sections at the very bottom can never get
    // stranded invisible.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) reveal(e.target); });
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
    sections.forEach((s) => io.observe(s));
    // Safety net: unconditionally reveal anything still hidden after a few
    // seconds. Sections the user has reached already animated in via the
    // observer; this guarantees content is NEVER left permanently invisible if
    // the observer misses (e.g. a non-window scroll container).
    const safety = setTimeout(() => {
      document.querySelectorAll('.hc main > section.hc-reveal:not(.hc-in)').forEach(reveal);
    }, 3000);
    return () => { io.disconnect(); clearTimeout(safety); };
  }, [pathname]);

  return (
    <div className="hc hc-page">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
};

export default SiteLayout;
