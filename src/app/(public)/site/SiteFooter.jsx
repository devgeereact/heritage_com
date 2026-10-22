import { Link } from 'react-router-dom'
import { useAuthContext } from '@/context/useAuthContext'
import { roleHome } from '@/helpers/roles'
import { useShopEnabled } from './storeConfig'
import { useBusiness } from './business'
import { useSiteNav } from './siteData'
import Icon from './ui/Icon'
import Button from './ui/Button'
import useActions from './ui/useActions'
import EditLink from './ui/EditLink'

const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`

/** "+234 803 123 4567" from a wa.me link; other countries as "+<digits>". */
const waNumber = (url) => {
  const d = String(url).replace(/\D/g, '')
  if (d.length === 13 && d.startsWith('234')) return `+234 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`
  return d ? `+${d}` : ''
}

/** "@heritclothing" from an Instagram profile link. */
const igHandle = (url) => {
  try {
    const name = new URL(url).pathname.split('/').filter(Boolean)[0]
    return name ? `@${name}` : 'Instagram'
  } catch {
    return 'Instagram'
  }
}

/**
 * Footer as in the approved prototype (D-023): brand with the primary action,
 * then Explore, Clients and Visit columns; a large outline wordmark; and a
 * bottom bar with the year, the legal links, staff sign-in and the verified
 * social links. Links follow the published-content flags; business details
 * come from useBusiness() (the Website profile) or the `business` prop, and
 * a column with nothing real to show is not rendered. The Visit column lists
 * the address one part per line, then hours, email, Instagram, WhatsApp and
 * phone, each with its icon; Instagram and WhatsApp shown there are left out
 * of the icon row at the bottom.
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
  const instagram = b.socials?.find((s) => s.key === 'instagram')
  const others = (b.socials || []).filter((s) => s.key !== 'instagram' && s.key !== 'whatsapp')
  const place = String(b.address || b.area || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  const hasVisit = place.length || b.hours || b.phone || b.whatsapp || b.email || instagram
  const line = `Men's tailoring made to measure${b.area ? ` in ${b.area}` : ''}. Every piece is cut to your own measurements.`

  return (
    <footer className="hc-footer hc-ink hc-edit-host">
      <EditLink to="/website/profile" label="the business details" />
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
              <ul className="hc-footer-visit">
                {place.length > 0 && (
                  <li className="hc-footer-place">
                    <Icon name="map-pin" />
                    <address>
                      {place.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </address>
                  </li>
                )}
                {b.hours && (
                  <li className="hc-footer-place">
                    <Icon name="clock" />
                    <span>{b.hours}</span>
                  </li>
                )}
                {b.email && (
                  <li>
                    <a href={`mailto:${b.email}`}>
                      <Icon name="mail" /> <span>{b.email}</span>
                    </a>
                  </li>
                )}
                {instagram && (
                  <li>
                    <a
                      href={instagram.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Instagram ${igHandle(instagram.url)} (opens in a new tab)`}>
                      <Icon name="instagram" /> <span>{igHandle(instagram.url)}</span>
                    </a>
                  </li>
                )}
                {b.whatsapp && (
                  <li>
                    <a
                      href={b.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp ${waNumber(b.whatsapp)} (opens in a new tab)`}>
                      <Icon name="whatsapp" /> <span>{waNumber(b.whatsapp)}</span>
                    </a>
                  </li>
                )}
                {b.phone && (
                  <li>
                    <a href={telHref(b.phone)}>
                      <Icon name="phone" /> <span>{b.phone}</span>
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
          {others.length > 0 && (
            <ul className="hc-footer-socials" aria-label={`${b.name} on social media`}>
              {others.map((s) => (
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
