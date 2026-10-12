import { Link } from 'react-router-dom'
import { useAuthContext } from '@/context/useAuthContext'
import { roleHome } from '@/helpers/roles'
import { useShopEnabled } from './storeConfig'
import { useBusiness } from './business'
import { useSiteNav } from './siteData'
import Icon from './ui/Icon'
import logoMark from '@/assets/images/logo-sm.svg'

const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`

/**
 * Footer after 21st.dev "Footer 7" (Shadcnblocks), rebuilt on the tokens
 * (D-025). White, generous padding. Left: brand lockup, one short statement,
 * muted social icons in a row. Right: three columns (Explore, Help, Studio)
 * with bold headings and small muted links. Bottom: a hairline, then the
 * copyright on the left and the policies and staff link on the right.
 * Columns with nothing real to show are not rendered.
 * Details come from useBusiness() or the `business` prop.
 */
const SiteFooter = ({ business: given }) => {
  const fromConfig = useBusiness()
  const b = given || fromConfig
  const shopOn = useShopEnabled()
  const nav = useSiteNav()
  const { isAuthenticated, user } = useAuthContext()

  const explore = [
    nav.services && { to: '/services', label: 'Services' },
    nav.work && { to: '/work', label: 'Our work' },
    nav.how_it_works && { to: '/how-it-works', label: 'How it works' },
    nav.company && { to: '/company-orders', label: 'Company orders' },
    nav.about && { to: '/about', label: 'About' },
    shopOn && { to: '/shop', label: 'Shop' },
  ]
    .filter(Boolean)
    .slice(0, 5)
  const help = [
    { to: '/track', label: 'Track your job' },
    nav.faqs && { to: '/faqs', label: 'Questions' },
    nav.journal && { to: '/journal', label: 'Journal' },
    { to: '/contact', label: 'Contact' },
  ].filter(Boolean)
  const policies = [nav.privacy && { to: '/privacy', label: 'Privacy' }, nav.terms && { to: '/terms', label: 'Terms' }].filter(Boolean)
  const hasContact = b.phone || b.whatsapp || b.email || b.area || b.hours

  return (
    <footer className="hc-footer">
      <div className="hc-container">
        <div className="hc-footer-top">
          <div className="hc-footer-brand">
            <Link to="/" className="hc-brand" aria-label={`${b.name || 'Herit Clothing'}, home`}>
              <img src={logoMark} alt="" width="31" height="34" className="hc-brand-mark" />
              <span className="hc-brand-word" aria-hidden="true">
                <span className="hc-brand-name">Herit</span>
                <span className="hc-brand-sub">Clothing</span>
              </span>
            </Link>
            <p className="hc-footer-text">Menswear cut to your measurements in Lagos, with every order agreed before the cloth is cut.</p>
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

          <div className="hc-footer-cols">
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

            <nav aria-label="Help">
              <h2>Help</h2>
              <ul>
                {help.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>

            {hasContact && (
              <div>
                <h2>Studio</h2>
                <ul>
                  {b.phone && (
                    <li>
                      <a href={telHref(b.phone)}>{b.phone}</a>
                    </li>
                  )}
                  {b.whatsapp && (
                    <li>
                      <a href={b.whatsapp} target="_blank" rel="noopener noreferrer">
                        WhatsApp
                      </a>
                    </li>
                  )}
                  {b.email && (
                    <li>
                      <a href={`mailto:${b.email}`}>{b.email}</a>
                    </li>
                  )}
                  {(b.address || b.area) && <li className="hc-footer-note">{b.address || b.area}</li>}
                  {b.hours && <li className="hc-footer-note">{b.hours}</li>}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="hc-footer-bottom">
          <p>
            © {new Date().getFullYear()} {b.name}. All rights reserved.
          </p>
          <ul className="hc-footer-legal">
            {policies.map((p) => (
              <li key={p.to}>
                <Link to={p.to}>{p.label}</Link>
              </li>
            ))}
            <li>
              <Link to={isAuthenticated ? roleHome(user?.role) : '/auth/sign-in'}>{isAuthenticated ? 'Staff dashboard' : 'Staff sign in'}</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
