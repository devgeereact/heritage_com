import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { DEFAULT_PAGE_TITLE } from '@/context/constants';
import { useAuthContext } from '@/context/useAuthContext';
import { roleHome } from '@/helpers/roles';
import { heritApi } from '@/helpers/heritApi';
import { useCart } from './cart';
import './site.css';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/gifting', label: 'Gifting' },
  { to: '/contact', label: 'Contact' },
];

const SiteNav = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { count } = useCart();
  const { isAuthenticated, user } = useAuthContext();
  const dash = roleHome(user?.role);
  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <header className="hc-nav">
      <div className="hc-container hc-nav-inner">
        <Link to="/" className="hc-brand">
          Herit<span>.</span>Clothing
          <small>Wear your heritage</small>
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
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`hc-nav-link ${isActive(n.to) ? 'is-active' : ''}`}>
              {n.label}
            </Link>
          ))}
          <Link to="/cart" className="hc-nav-cart" aria-label={`Bag (${count})`}>
            <IconifyIcon icon="solar:bag-4-bold" />
            {count > 0 && <span className="hc-nav-cart-badge">{count}</span>}
            <span className="hc-nav-cart-label">Bag</span>
          </Link>
          <Link to="/shop" className="hc-btn hc-btn--primary hc-nav-cta">
            <IconifyIcon icon="solar:bag-4-bold" /> Shop the drop
          </Link>
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
        <p className="hc-mt-1" style={{ color: '#f5d18a', fontSize: '0.82rem' }}>
          Couldn&apos;t sign you up just now — please try again.
        </p>
      )}
    </>
  );
};

const SiteFooter = () => {
  const { isAuthenticated, user } = useAuthContext();
  return (
  <footer className="hc-footer">
    <div className="hc-container">
      <div className="hc-foot-grid">
        <div>
          <div className="hc-foot-brand">Herit<span>.</span>Clothing</div>
          <p className="hc-mt-2" style={{ maxWidth: '20rem', lineHeight: 1.6 }}>
            Contemporary African fashion, rooted in real heritage fabrics. We fuse Ankara,
            Adire and Aso-Oke with modern cuts — made in Ajuwon Market, Lagos, for the world.
          </p>
          <div className="hc-mt-3">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', marginBottom: '0.5rem' }}>
              Join the family — 10% off your first piece
            </div>
            <NewsletterForm />
          </div>
          <div className="hc-flex hc-gap hc-mt-3" style={{ gap: '0.5rem' }}>
            <a href="https://instagram.com" className="hc-social" aria-label="Instagram"><IconifyIcon icon="solar:instagram-bold" /></a>
            <a href="https://facebook.com" className="hc-social" aria-label="Facebook"><IconifyIcon icon="mdi:facebook" /></a>
            <a href="https://wa.me/234" className="hc-social" aria-label="WhatsApp"><IconifyIcon icon="mdi:whatsapp" /></a>
            <a href="https://tiktok.com" className="hc-social" aria-label="TikTok"><IconifyIcon icon="mdi:music-note" /></a>
          </div>
        </div>

        <div>
          <h6>Shop</h6>
          <Link to="/shop">All pieces</Link>
          <Link to="/shop?fabric=Ankara">Ankara</Link>
          <Link to="/shop?fabric=Adire">Adire</Link>
          <Link to="/shop?fabric=Aso-Oke">Aso-Oke</Link>
          <Link to="/gifting">Gifting</Link>
        </div>

        <div>
          <h6>Company</h6>
          <Link to="/about">Our story</Link>
          <Link to="/about">Mission &amp; vision</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/contact">Stockists</Link>
        </div>

        <div>
          <h6>Help</h6>
          <Link to="/contact">Shipping</Link>
          <Link to="/contact">Returns</Link>
          <Link to="/contact">Size &amp; fit</Link>
          <Link to="/track">Track order</Link>
        </div>

        <div>
          <h6>Visit</h6>
          <p style={{ fontSize: '0.92rem', lineHeight: 1.7 }}>
            Ajuwon Market<br />Lagos, Nigeria
          </p>
          <p className="hc-mt-2" style={{ fontSize: '0.92rem' }}>hello@heritclothing.com</p>
          <Link to={isAuthenticated ? roleHome(user?.role) : '/auth/sign-in'} className="hc-foot-staff">
            <IconifyIcon icon={isAuthenticated ? 'solar:widget-5-bold' : 'solar:lock-keyhole-minimalistic-linear'} />
            {isAuthenticated ? ' Staff dashboard' : ' Staff login'} →
          </Link>
        </div>
      </div>

      <div className="hc-foot-bottom">
        <span>© {new Date().getFullYear()} Herit Clothing · Wear your heritage.</span>
        <span>Made in Lagos, shipped worldwide</span>
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

  // Capture a referral code from a share link (?ref=CODE) so it survives the
  // browse → checkout journey. Read back in CheckoutPage.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) { try { localStorage.setItem('herit_ref', ref.toUpperCase()); } catch { /* ignore */ } }
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
