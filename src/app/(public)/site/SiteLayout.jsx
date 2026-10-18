import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'
import useReveal from './ui/useReveal'
import useSeo from './seo/useSeo'
import { usePreviewMode, useSiteConfig } from './siteData'
import './site.css'
import './ui/ui.css'
import { saveAttribution } from './attribution'

/**
 * Shared shell for every public page: skip link, sticky header, main and
 * footer. Sets the page metadata (useSeo), scopes the `.hc` theme (always
 * light), resets scroll on navigation and runs the once-only section reveals.
 *
 * `title` names the page; `seo` adds {description, image, jsonld, type,
 * home}; `noindex` keeps private pages (track, account, checkout) and
 * not-found answers out of search. Preview mode (?preview=1 with a staff
 * session) shows a fixed bar and is always noindex.
 */
const SiteLayout = ({ title, seo = {}, noindex = false, children }) => {
  const { pathname } = useLocation()
  const cfg = useSiteConfig()
  const preview = usePreviewMode()
  // Reset scroll before the reveal hook measures what is below the fold.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const revealRef = useReveal([pathname])

  useSeo({
    title: seo.title || title,
    home: seo.home,
    description: seo.description,
    image: seo.image,
    type: seo.type,
    jsonld: seo.jsonld,
    path: pathname,
    siteUrl: cfg?.site_url,
    noindex: noindex || preview,
  })

  // Capture a referral code (?ref=CODE) and campaign attribution (?utm_source /
  // ?utm_campaign) from the landing URL so they survive browse → checkout.
  useEffect(() => {
    // Kept for 30 days only (D-024, K-13); see attribution.js.
    const q = new URLSearchParams(window.location.search)
    const ref = q.get('ref')
    if (ref) saveAttribution('herit_ref', ref.toUpperCase().slice(0, 40))
    const src = q.get('utm_source') || q.get('source')
    if (src) saveAttribution('herit_src', src.slice(0, 60))
    const camp = q.get('utm_campaign')
    if (camp) saveAttribution('herit_camp', camp.slice(0, 120))
  }, [pathname])

  return (
    <div className="hc hc-page">
      <a className="hc-skip" href="#main">
        Skip to main content
      </a>
      {preview && (
        <div className="hc-preview-bar" role="status">
          <span>Preview, not published. Visitors see the published version.</span>
          <Link to={pathname}>Leave preview</Link>
        </div>
      )}
      <SiteHeader />
      <main id="main" tabIndex={-1} ref={revealRef}>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

export default SiteLayout
