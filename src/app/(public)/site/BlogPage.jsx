import { Link } from 'react-router-dom'
import SiteLayout from './SiteLayout'
import { useJournal } from './content'
import { Section, SectionHead } from './ui/Section'
import Icon from './ui/Icon'
import { LoadingPage, NotFoundPage } from './cmsBlocks'
import { ClosingAction } from './sections'
import useActions from './ui/useActions'

/** One journal card: category, date, title link and excerpt. Shared with the post page. */
export const JournalCard = ({ p }) => (
  <article className="hc-journal-card" data-reveal="">
    <div className="hc-journal-body">
      {(p.cat || p.date) && <span className="hc-journal-date">{[p.cat, p.date].filter(Boolean).join(' · ')}</span>}
      <h2 className="hc-h4">
        <Link to={p.to}>{p.title}</Link>
      </h2>
      {p.excerpt && <p>{p.excerpt}</p>}
      <Link to={p.to} className="hc-card-link" aria-hidden="true" tabIndex={-1}>
        Read more <Icon name="arrow-right" />
      </Link>
    </div>
  </article>
)

/**
 * Journal list. Published posts only, and only while `journal_enabled` is on
 * (site.php); otherwise a not-found page, so no empty promise is shown.
 */
const BlogPage = () => {
  const { posts, enabled, ready } = useJournal(48)
  const { primary, secondary } = useActions()
  if (!ready) return <LoadingPage title="Journal" />
  if (!enabled || !posts.length) return <NotFoundPage title="Journal" text="There are no journal posts to read yet." />

  return (
    <SiteLayout title="Journal" seo={{ description: 'Notes from the Herit Clothing workroom in Lagos.' }}>
      <Section className="hc-section--pagehead">
        <SectionHead as="h1" eyebrow="Journal" title="Notes from the workroom" lead="Cloth, fit and care, written down as the work happens." />
      </Section>
      <Section tone="alt" aria-label="Posts">
        <div className="hc-grid hc-grid--3">
          {posts.map((p) => (
            <JournalCard key={p.slug} p={p} />
          ))}
        </div>
      </Section>
      <ClosingAction
        title="Tell me what you want to make."
        text="Send a short message with the occasion and the date, and I will get back to you."
        primary={{ to: primary.to, label: primary.label }}
        secondary={secondary}
      />
    </SiteLayout>
  )
}

export default BlogPage
