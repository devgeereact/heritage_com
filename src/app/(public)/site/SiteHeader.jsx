import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from './cart'
import { useShopEnabled } from './storeConfig'
import { useSiteNav } from './siteData'
import { useBusiness } from './business'
import useActions from './ui/useActions'
import Button from './ui/Button'
import Icon from './ui/Icon'
import logoMark from '@/assets/images/logo-sm.svg'

// At most four links in the bar, each only while its page has published
// content (site.php config `nav` flags). Contact sits behind the primary
// action; company orders, questions, journal and policies live in the footer
// and the menu sheet (D-024).
const NAV = [
  { to: '/services', label: 'Services', flag: 'services' },
  { to: '/work', label: 'Our work', flag: 'work' },
  { to: '/how-it-works', label: 'How it works', flag: 'how_it_works' },
  { to: '/about', label: 'About', flag: 'about' },
  { to: '/shop', label: 'Shop', shop: true },
]
const MAX_LINKS = 4

const isCurrent = (pathname, to) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`))

/**
 * Header (D-025), after the owner's EGO and RitaGreen sites: a thin ink
 * contact bar (area, hours, phone) that scrolls away, then a solid white
 * sticky bar that gains a hairline once the page scrolls. The brand lockup is
 * the needle mark plus a live-text wordmark. Below 1024px a Menu button opens a full-height sheet:
 * large serif links that rise in turn, then contact details, with Book and
 * Track pinned at the bottom; focus trap, Escape, scroll lock.
 */
const SiteHeader = () => {
  const { pathname } = useLocation()
  const shopOn = useShopEnabled()
  const nav = useSiteNav()
  const business = useBusiness()
  const { primary: action, secondary } = useActions()
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const toggleRef = useRef(null)
  const sheetRef = useRef(null)

  const links = NAV.filter((n) => (n.shop ? shopOn : nav[n.flag] === true)).slice(0, MAX_LINKS)
  const sheetLinks = [
    { to: '/', label: 'Home' },
    ...links,
    nav.company && { to: '/company-orders', label: 'Company orders' },
    nav.faqs && { to: '/faqs', label: 'Questions' },
    { to: '/contact', label: 'Contact' },
  ].filter(Boolean)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Sheet: lock page scroll, trap focus, close on Escape, return focus.
  useEffect(() => {
    if (!open) return undefined
    const toggle = toggleRef.current
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusables = () => [toggle, ...(sheetRef.current?.querySelectorAll('a[href], button:not([disabled])') || [])].filter(Boolean)
    focusables()[1]?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggle?.focus()
        return
      }
      if (e.key !== 'Tab') return
      const list = focusables()
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const util = [business.area, business.hours].filter(Boolean)

  return (
    <>
      {(util.length > 0 || business.phone) && (
        <div className="hc-utility">
          <div className="hc-container hc-utility-inner">
            <span>{util.join(' · ')}</span>
            {business.phone && (
              <a href={`tel:${String(business.phone).replace(/[^\d+]/g, '')}`}>
                <Icon name="phone" /> {business.phone}
              </a>
            )}
          </div>
        </div>
      )}
      <header className={`hc-header ${scrolled && !open ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`.trim()}>
        <div className="hc-header-bar">
          <Link to="/" className="hc-brand" aria-label="Herit Clothing, home">
            <img src={logoMark} alt="" width="31" height="34" className="hc-brand-mark" />
            <span className="hc-brand-word" aria-hidden="true">
              <span className="hc-brand-name">Herit</span>
              <span className="hc-brand-sub">Clothing</span>
            </span>
          </Link>

          <nav className="hc-nav" aria-label="Main">
            <ul>
              {links.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="hc-nav-link" aria-current={isCurrent(pathname, n.to) ? 'page' : undefined}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hc-header-end">
            <Link to="/track" className="hc-header-track" aria-current={isCurrent(pathname, '/track') ? 'page' : undefined}>
              <Icon name="ticket" /> <span>Track your job</span>
            </Link>
            {shopOn && (
              <Link to="/cart" className="hc-header-bag" aria-label={`Bag, ${count} ${count === 1 ? 'item' : 'items'}`}>
                <Icon name="bag" />
                {count > 0 && (
                  <span className="hc-header-bag-count" aria-hidden="true">
                    {count}
                  </span>
                )}
              </Link>
            )}
            <Button to={action.to} className="hc-header-cta">
              {action.short}
            </Button>
            <button
              ref={toggleRef}
              type="button"
              className="hc-menu-toggle"
              aria-expanded={open}
              aria-controls="hc-mobile-nav"
              onClick={() => setOpen((v) => !v)}>
              <span className="hc-burger" aria-hidden="true">
                <i />
                <i />
              </span>
              <span>{open ? 'Close' : 'Menu'}</span>
            </button>
          </div>
        </div>

        {open && (
          <div id="hc-mobile-nav" ref={sheetRef} className="hc-sheet">
            <nav aria-label="Main">
              <ol>
                {sheetLinks.map((n, i) => (
                  <li key={n.to} style={{ '--hc-i': i }}>
                    <Link to={n.to} aria-current={isCurrent(pathname, n.to) ? 'page' : undefined}>
                      <span className="hc-sheet-n" aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="hc-sheet-label">{n.label}</span>
                      <Icon name="arrow-right" />
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
            {(business.phone || business.email) && (
              <div className="hc-sheet-contact">
                {business.phone && (
                  <a href={`tel:${String(business.phone).replace(/[^\d+]/g, '')}`}>
                    <Icon name="phone" /> {business.phone}
                  </a>
                )}
                {business.email && (
                  <a href={`mailto:${business.email}`}>
                    <Icon name="mail" /> {business.email}
                  </a>
                )}
              </div>
            )}
            <div className="hc-sheet-actions">
              <Button to={action.to} block>
                {action.label}
              </Button>
              <Button to="/track" variant="secondary" block>
                Track your job
              </Button>
              <Link to={secondary.to} className="hc-sheet-quiet">
                {secondary.label}
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  )
}

export default SiteHeader
