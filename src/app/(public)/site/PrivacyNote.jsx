import { Link } from 'react-router-dom'
import { useSiteNav } from './siteData'

/**
 * Just-in-time note beside a form's send button: what the details are for, and
 * a link to the privacy notice only once one is published (otherwise /privacy
 * is a not-found page). `children` is the purpose sentence.
 */
const PrivacyNote = ({ children, className = 'hc-field-help' }) => {
  const nav = useSiteNav()
  return (
    <p className={className}>
      {children}
      {nav.privacy && (
        <>
          {' '}
          <Link to="/privacy">How your details are handled</Link>.
        </>
      )}
    </p>
  )
}

export default PrivacyNote
