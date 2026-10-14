import IconifyIcon from '@/components/wrappers/IconifyIcon'
import logoLight from '@/assets/images/logo-light.svg'

/**
 * Ink side panel for the staff sign-in screens (D-023): the site palette in
 * any admin theme, a Fraunces line, and the outline wordmark the public
 * footer uses. Styles in heritos-admin.css (.hc-auth-panel).
 */
const BrandSidePanel = ({
  heading = 'Your workroom, in one place.',
  body = 'Jobs, clients, appointments, payments and the website, kept together so nothing is missed between fittings.',
}) => (
  <div className="hc-ink hc-auth-panel">
    <div className="hc-auth-panel-top">
      <img src={logoLight} alt="Herit Clothing" className="hc-auth-panel-logo" />
      <span className="hc-auth-kicker">HeritOS</span>
    </div>
    <div className="hc-auth-panel-copy">
      <h2>{heading}</h2>
      <p>{body}</p>
    </div>
    <div className="hc-auth-panel-foot">
      <span className="hc-auth-kicker">
        <IconifyIcon icon="solar:map-point-bold" aria-hidden="true" /> Lagos, Nigeria
      </span>
      <span className="hc-auth-panel-wordmark" aria-hidden="true">
        HERIT
      </span>
    </div>
  </div>
)

export default BrandSidePanel
