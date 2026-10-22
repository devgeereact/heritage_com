import { useState } from 'react'
import { Link } from 'react-router-dom'
import { canAccessPath } from '@/helpers/roles'
import { staffRole } from '../siteData'
import Icon from './Icon'

/**
 * Staff-only "Edit" control on a public section or page. It links straight to
 * the matching editor in the Website admin (`to`, for example
 * "/website/pages/about" or "/website/services/made-to-measure"). Visitors
 * never see it: it renders only when a signed-in staff role may open that
 * admin page (roles.js), so crawlers and the public get nothing. It is a
 * normal link, so it is keyboard reachable and announced as "Edit <label>".
 * The server still checks every save (require_auth in cms.php and content.php).
 *
 * `inline` places it in the flow instead of the top-right corner of the
 * nearest `.hc-edit-host`.
 */
const EditLink = ({ to, label, inline = false, className = '' }) => {
  const [role] = useState(staffRole)
  if (!to || !role || !canAccessPath(role, to)) return null
  return (
    <Link
      to={to}
      className={`hc-edit${inline ? ' hc-edit--inline' : ''} ${className}`.trim()}
      rel="nofollow"
      aria-label={`Edit ${label}`}
      data-edit-target={to}>
      <Icon name="pen" /> Edit
    </Link>
  )
}

export default EditLink
