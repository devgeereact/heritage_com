import { Link } from 'react-router-dom'
import { useAuthContext } from '@/context/useAuthContext'
import { roleHome } from '@/helpers/roles'
import { useShopEnabled } from './storeConfig'
import { useBusiness } from './business'
import { useSiteNav } from './siteData'
import Icon from './ui/Icon'
import Button from './ui/Button'
import useActions from './ui/useActions'

const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`

/**
 * Footer as in the approved prototype (D-023): brand with the primary action,
 * then Explore, Clients and Visit columns; a large outline wordmark; and a
 * bottom bar with the year, the legal links, staff sign-in and the verified
 * social links. Links follow the published-content flags; business details
 * come from useBusiness() (the Website profile) or the `business` prop, and
 * a column with nothing real to show is not rendered.
 */
const SiteFooter = ({ business: given }) => {
  const fromConfig = useBusiness()
  const b = given || fromConfig
  const shopOn = useShopEnabled()
  const nav = useSiteNav()
  const { isAuthenticated, user } = useAuthContext()
  const { primary } = useActions()

  const explore = [
    nav.services && { to: '/services', label: 'Services' },
    nav.work && { to: '/work', label: 'Our work' },
    nav.how_it_works && { to: '/how-it-works', label: 'How it works' },
    nav.company && { to: '/company-orders', label: 'Company orders' },
    nav.about && { to: '/about', label: 'About' },
    nav.journal && { to: '/journal', label: 'Journal' },
    shopOn && { to: '/shop', label: 'Shop' },
  ]
    .filter(Boolean)
    .slice(0, 5)
  const clients = [
    { to: primary.to, label: primary.short || 'Request an appointment' },
    { to: '/track', label: 'Track your order' },
    { to: '/account', label: 'My account' },
    nav.faqs && { to: '/faqs', label: 'Questions' },
    { to: '/contact', label: 'Contact' },
  ].filter(Boolean)
  const legal = [nav.privacy && { to: '/privacy', label: 'Privacy' }, nav.terms && { to: '/terms', label: 'Terms' }].filter(Boolean)
  const hasVisit = b.area || b.address || b.hours || b.phone || b.whatsapp || b.email
  const line = `Men's tailoring made to measure${b.area ? ` in ${b.area}` : ''}. Every piece is cut to your own measurements.`

  return (
    <footer className="hc-footer">
      <div className="hc-container">
        <div className="hc-footer-cols">
          <div className="hc-footer-brand">
            <p className="hc-footer-name">{b.name}</p>
            <p className="hc-footer-text">{line}</p>
            <Button to={primary.to} iconEnd="arrow-right" className="hc-footer-cta">
              {primary.short || primary.label}
            </Button>
          </div>

          {explore.length > 0 && (
            <nav aria-label="Explore">
              <h2>Explore</h2>
              <ul>
                {explore.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <nav aria-label="Clients">
            <h2>Clients</h2>
            <ul>
              {clients.map((l) => (
                <li key={l.label}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {hasVisit && (
            <div>
              <h2>Visit</h2>
              <ul>
                {(b.area || b.address) && (
                  <li className="hc-footer-place">
                    <span>{b.address || b.area}</span>
                    {b.address && b.area && <span className="hc-footer-sub">{b.area}</span>}
                  </li>
                )}
                {b.hours && (
                  <li className="hc-footer-place">
                    <span className="hc-footer-sub">Hours</span>
                    <span>{b.hours}</span>
                  </li>
                )}
                {b.phone && (
                  <li>
                    <a href={telHref(b.phone)}>
                      <Icon name="phone" /> {b.phone}
                    </a>
                  </li>
                )}
                {b.whatsapp && (
                  <li>
                    <a href={b.whatsapp} target="_blank" rel="noopener noreferrer">
                      <Icon name="whatsapp" /> WhatsApp
                    </a>
                  </li>
                )}
                {b.email && (
                  <li>
                    <a href={`mailto:${b.email}`}>
                      <Icon name="mail" /> {b.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {b.name && (
          <p className="hc-footer-wordmark" aria-hidden="true">
            {String(b.name).split(' ')[0]}
          </p>
        )}

        <div className="hc-footer-bottom">
          <span>
            © {new Date().getFullYear()} {b.name}
          </span>
          <nav aria-label="Legal" className="hc-footer-legal">
            {legal.map((p) => (
              <Link key={p.to} to={p.to}>
                {p.label}
              </Link>
            ))}
            <Link to={isAuthenticated ? roleHome(user?.role) : '/auth/sign-in'}>{isAuthenticated ? 'Staff dashboard' : 'Staff sign in'}</Link>
          </nav>
          {b.socials?.length > 0 && (
            <ul className="hc-footer-socials" aria-label={`${b.name} on social media`}>
              {b.socials.map((s) => (
                <li key={s.key}>
                  <a href={s.url} className="hc-social" target="_blank" rel="noopener noreferrer">
                    <Icon name={s.icon} label={s.label} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
