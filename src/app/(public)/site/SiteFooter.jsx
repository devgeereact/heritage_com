import { Link } from 'react-router-dom';
import { useAuthContext } from '@/context/useAuthContext';
import { roleHome } from '@/helpers/roles';
import { useShopEnabled } from './storeConfig';
import { useBusiness } from './business';
import { useSiteNav } from './siteData';
import Icon from './ui/Icon';

const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

/**
 * Footer on the light-ash surface. Four columns, each shown only when it has
 * something real to show: business, contact, explore, policies. Then the
 * verified social links and "© year name" with a small staff link.
 * Details come from useBusiness() (the Website profile), or from the
 * `business` prop. Explore and policy links follow the published-content flags.
 */
const SiteFooter = ({ business: given }) => {
  const fromConfig = useBusiness();
  const b = given || fromConfig;
  const shopOn = useShopEnabled();
  const nav = useSiteNav();
  const { isAuthenticated, user } = useAuthContext();

  const explore = [
    nav.services && { to: '/services', label: 'Services' },
    nav.company && { to: '/company-orders', label: 'Company orders' },
    nav.work && { to: '/work', label: 'Our work' },
    nav.how_it_works && { to: '/how-it-works', label: 'How it works' },
    nav.about && { to: '/about', label: 'About' },
    nav.faqs && { to: '/faqs', label: 'Questions' },
    nav.journal && { to: '/journal', label: 'Journal' },
    shopOn && { to: '/shop', label: 'Shop' },
    { to: '/contact', label: 'Contact' },
    { to: '/track', label: 'Track your job' },
  ].filter(Boolean);
  const policies = [
    nav.privacy && { to: '/privacy', label: 'Privacy' },
    nav.terms && { to: '/terms', label: 'Terms' },
  ].filter(Boolean);
  const hasBusiness = b.area || b.hours || b.address;
  const hasContact = b.phone || b.whatsapp || b.email;

  return (
    <footer className="hc-footer">
      <div className="hc-container">
        <div className="hc-footer-cols">
          <div>
            <p className="hc-footer-name">{b.name}</p>
            {hasBusiness && (
              <>
                {b.area && <p className="hc-footer-text">{b.area}</p>}
                {b.address && <p className="hc-footer-text">{b.address}</p>}
                {b.hours && <p className="hc-footer-text">{b.hours}</p>}
              </>
            )}
          </div>

          {hasContact && (
            <div>
              <h2>Contact</h2>
              <ul>
                {b.phone && <li><a href={telHref(b.phone)}><Icon name="phone" /> {b.phone}</a></li>}
                {b.whatsapp && <li><a href={b.whatsapp} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" /> WhatsApp</a></li>}
                {b.email && <li><a href={`mailto:${b.email}`}><Icon name="mail" /> {b.email}</a></li>}
              </ul>
            </div>
          )}

          <nav aria-label="Explore">
            <h2>Explore</h2>
            <ul>
              {explore.map((l) => <li key={l.to}><Link to={l.to}>{l.label}</Link></li>)}
            </ul>
          </nav>

          {policies.length > 0 && (
            <nav aria-label="Policies">
              <h2>Policies</h2>
              <ul>
                {policies.map((p) => <li key={p.to}><Link to={p.to}>{p.label}</Link></li>)}
              </ul>
            </nav>
          )}
        </div>

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

        <div className="hc-footer-bottom">
          <span>© {new Date().getFullYear()} {b.name}</span>
          <Link to={isAuthenticated ? roleHome(user?.role) : '/auth/sign-in'}>
            {isAuthenticated ? 'Staff dashboard' : 'Staff sign in'}
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
