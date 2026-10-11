import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from './cart';
import { useShopEnabled } from './storeConfig';
import { useBookingEnabled } from './bookingConfig';
import Button from './ui/Button';
import Icon from './ui/Icon';
import logoDark from '@/assets/images/logo-dark.svg';

// `shop` items show only while the retail shop is switched on (settings.shop_enabled).
const NAV = [
  { to: '/shop', label: 'Shop', shop: true },
  { to: '/gifting', label: 'Gifting', shop: true },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const isCurrent = (pathname, to) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`));

/**
 * Sticky, opaque header (64px). A 1px divider fades in once the page has
 * scrolled. Below 1024px the links move into a sheet with a focus trap,
 * Escape to close, body scroll lock, and Book and Track pinned at the bottom.
 */
const SiteHeader = () => {
  const { pathname } = useLocation();
  const shopOn = useShopEnabled();
  const bookOn = useBookingEnabled();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef(null);
  const sheetRef = useRef(null);

  const links = NAV.filter((n) => shopOn || !n.shop);
  const primary = bookOn
    ? { to: '/book', label: 'Book an appointment' }
    : { to: '/contact', label: 'Request an appointment' };

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sheet: lock page scroll, trap focus, close on Escape, return focus.
  useEffect(() => {
    if (!open) return undefined;
    const toggle = toggleRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = () => [toggle, ...(sheetRef.current?.querySelectorAll('a[href], button:not([disabled])') || [])].filter(Boolean);
    focusables()[1]?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); toggle?.focus(); return; }
      if (e.key !== 'Tab') return;
      const list = focusables();
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className={`hc-header ${scrolled || open ? 'is-scrolled' : ''}`}>
      <div className="hc-container hc-header-inner">
        <Link to="/" className="hc-brand" aria-label="Herit Clothing, home">
          <img src={logoDark} alt="" width="52" height="36" />
        </Link>

        <nav className="hc-nav" aria-label="Main">
          <ul>
            {links.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="hc-nav-link" aria-current={isCurrent(pathname, n.to) ? 'page' : undefined}>{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hc-header-end">
          <Link to="/track" className="hc-nav-link hc-header-quiet" aria-current={isCurrent(pathname, '/track') ? 'page' : undefined}>
            Track your job
          </Link>
          {shopOn && (
            <Link to="/cart" className="hc-header-bag" aria-label={`Bag, ${count} ${count === 1 ? 'item' : 'items'}`}>
              <Icon name="bag" />
              {count > 0 && <span className="hc-header-bag-count" aria-hidden="true">{count}</span>}
            </Link>
          )}
          <Button to={primary.to} className="hc-header-cta">{primary.label}</Button>
          <button
            ref={toggleRef}
            type="button"
            className="hc-menu-toggle"
            aria-expanded={open}
            aria-controls="hc-mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} size="1.4em" />
            <span>{open ? 'Close' : 'Menu'}</span>
          </button>
        </div>
      </div>

      {open && (
        <div id="hc-mobile-nav" ref={sheetRef} className="hc-sheet">
          <nav aria-label="Main">
            <ul>
              <li><Link to="/" aria-current={pathname === '/' ? 'page' : undefined}>Home <Icon name="chevron-right" /></Link></li>
              {links.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} aria-current={isCurrent(pathname, n.to) ? 'page' : undefined}>{n.label} <Icon name="chevron-right" /></Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="hc-sheet-actions">
            <Button to={primary.to} block>{primary.label}</Button>
            <Button to="/track" variant="secondary" block>Track your job</Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default SiteHeader;
