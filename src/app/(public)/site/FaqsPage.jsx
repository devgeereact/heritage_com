import heritApi from '@/helpers/heritApi'
import SiteLayout from './SiteLayout'
import { useSiteResource } from './siteData'
import useActions from './ui/useActions'
import { Section, SectionHead } from './ui/Section'
import Icon from './ui/Icon'
import { Rich, resourceState } from './cmsBlocks'
import { ClosingAction } from './sections'

const load = () => heritApi.site.faqs().then((r) => (r?.items?.length ? r.items : null))

/**
 * Questions (BUILD-SPEC 4.7): published FAQs as native details and summary,
 * grouped by category in the order they first appear. No FAQs: a not-found
 * page, and the footer link is hidden.
 */
const FaqsPage = () => {
  const res = useSiteResource(load, null)
  const { primary } = useActions()
  const early = resourceState(res, 'Questions')
  if (early) return early

  const groups = []
  res.data.forEach((f) => {
    const name = f.category || ''
    let g = groups.find((x) => x.name === name)
    if (!g) {
      g = { name, items: [] }
      groups.push(g)
    }
    g.items.push(f)
  })
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: res.data.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: String(f.answer || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      },
    })),
  }

  return (
    <SiteLayout title="Questions" seo={{ description: 'Answers to common questions about Herit Clothing.', jsonld }}>
      <Section className="hc-section--pagehead" edit={{ to: '/website/faqs', label: 'questions' }}>
        <SectionHead
          as="h1"
          eyebrow="Questions"
          title="Questions and answers"
          lead="The things people usually ask before their first appointment. Anything else, send a message."
        />
      </Section>
      {groups.map((g, gi) => (
        <Section key={g.name || 'general'} tone={gi % 2 === 0 ? 'paper' : 'alt'} labelledBy={`faq-g-${gi}`}>
          <div className="hc-split hc-split--faq">
            <SectionHead
              id={`faq-g-${gi}`}
              eyebrow="Before you ask"
              title={g.name || 'Questions people ask first'}
              lead={g.name ? `Answers about ${g.name.toLowerCase()}.` : 'Tap a question to open the answer.'}
              split={false}
            />
            <div className="hc-faq-list">
              {g.items.map((f, i) => (
                <details key={f.id} className="hc-faq" open={gi === 0 && i === 0}>
                  <summary>
                    {f.question} <Icon name="chevron-down" />
                  </summary>
                  <div className="hc-faq-a">
                    <Rich html={f.answer} />
                  </div>
                </details>
              ))}
            </div>
          </div>
        </Section>
      ))}
      <ClosingAction
        eyebrow="Still unsure?"
        title="Still have a question?"
        text="Send a message and we will get back to you."
        primary={{ to: primary.to, label: primary.label }}
        secondary={{ to: '/contact', label: 'Contact' }}
      />
    </SiteLayout>
  )
}

export default FaqsPage
