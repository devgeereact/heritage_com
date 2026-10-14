/* ============================================================
   Building blocks for pages driven by the website CMS (site.php).
   Every block renders nothing when its content is empty.
   ============================================================ */
import { Link } from 'react-router-dom'
import SiteLayout from './SiteLayout'
import { Section, SectionHead } from './ui/Section'
import HcImage from './ui/HcImage'
import Button, { Actions } from './ui/Button'
import Icon from './ui/Icon'
import { toImage } from './siteData'
import safeHtml from './safeHtml'

const hasText = (html) =>
  !!html &&
  !!String(html)
    .replace(/<[^>]*>/g, '')
    .trim()

/**
 * Rich text from the CMS. The server cleans it with sanitize_html() when the
 * draft is saved (e2e-phase4 W6) and safeHtml() applies a strict allowlist
 * again here before it is rendered.
 */
export const Rich = ({ html, className = '' }) => {
  if (!hasText(html)) return null
  const clean = safeHtml(html)
  if (!clean) return null
  // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- allowlisted by safeHtml()
  return <div className={`hc-prose ${className}`.trim()} dangerouslySetInnerHTML={{ __html: clean }} />
}

/** Page header: h1 headline and intro, beside the hero image when there is one. */
export const PageHead = ({ eyebrow, title, intro, hero, tone, children }) => {
  const img = toImage(hero)
  return (
    <Section tone={tone} className="hc-section--pagehead">
      <div className={`hc-pagetop ${img ? 'hc-pagetop--media' : ''}`.trim()}>
        <SectionHead as="h1" eyebrow={eyebrow} title={title} lead={intro || undefined}>
          {children}
        </SectionHead>
        {img && <HcImage {...img} priority sizes="(min-width: 1024px) 58vw, 100vw" ratio="4 / 3" className="hc-pagetop-media" />}
      </div>
    </Section>
  )
}

/** Section with an optional h2 and CMS rich text; hidden when the text is empty. */
export const RichSection = ({ eyebrow, title, html, tone }) => {
  if (!hasText(html)) return null
  return (
    <Section tone={tone}>
      {title && <SectionHead eyebrow={eyebrow} title={title} />}
      <Rich html={html} />
    </Section>
  )
}

/** Short loading state inside the layout (keeps the header and footer stable). */
export const LoadingPage = ({ title }) => (
  <SiteLayout title={title}>
    <Section>
      <p className="hc-state" role="status">
        Loading…
      </p>
    </Section>
  </SiteLayout>
)

/** Not found, or not published: a real page with noindex and a way back. */
export const NotFoundPage = ({ title = 'Page not found', text }) => (
  <SiteLayout title={title} noindex>
    <Section className="hc-section--pagehead">
      <SectionHead
        as="h1"
        eyebrow="Not found"
        title={title}
        lead={text || 'This page is not available. It may have moved or not be published yet.'}
      />
      <Actions>
        <Button to="/">Go to the home page</Button>
        <Button to="/contact" variant="secondary">
          Contact
        </Button>
      </Actions>
    </Section>
  </SiteLayout>
)

/** Could not reach the server: say so plainly and offer a retry. */
export const ErrorPage = ({ title }) => (
  <SiteLayout title={title} noindex>
    <Section className="hc-section--pagehead">
      <SectionHead as="h1" eyebrow="Something went wrong" title="This page could not load" lead="Please check your connection and try again." />
      <Actions>
        <Button onClick={() => window.location.reload()}>Try again</Button>
        <Button to="/contact" variant="secondary">
          Contact
        </Button>
      </Actions>
    </Section>
  </SiteLayout>
)

/** Inline "more" link under a preview section. */
export const MoreLink = ({ to, children }) => (
  <p>
    <Link to={to} className="hc-card-link">
      {children} <Icon name="arrow-right" />
    </Link>
  </p>
)

/** Render loading, not-found and error states for a useSiteResource answer; null when ready. */
export const resourceState = (res, title) => {
  if (res.status === 'loading') return <LoadingPage title={title} />
  if (res.status === 'notfound') return <NotFoundPage />
  if (res.status === 'error') return <ErrorPage title={title} />
  return null
}
