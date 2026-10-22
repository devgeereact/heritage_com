import { useState } from 'react'
import heritApi from '@/helpers/heritApi'
import SiteLayout from './SiteLayout'
import { useSiteResource, toImage } from './siteData'
import useActions from './ui/useActions'
import { Section, SectionHead } from './ui/Section'
import { WorkCard } from './ui/Card'
import { resourceState } from './cmsBlocks'
import { ClosingAction, ProcessBand } from './sections'

const load = async () => {
  const [work, services] = await Promise.all([heritApi.site.work(), heritApi.site.services()])
  return { items: work?.items || [], services: services?.items || [] }
}

/**
 * Our work (BUILD-SPEC 4.7): published portfolio projects. Filter chips by
 * service appear only when two or more services have work; they are buttons
 * with aria-pressed. The nav link is hidden while nothing is published.
 */
const WorkPage = () => {
  const res = useSiteResource(load, null)
  const { primary, secondary } = useActions()
  const [filter, setFilter] = useState('')
  const early = resourceState(res, 'Our work')
  if (early) return early

  const { items, services } = res.data
  const withWork = services.filter((s) => items.some((w) => w.service_slug === s.slug))
  const shown = filter ? items.filter((w) => w.service_slug === filter) : items

  return (
    <SiteLayout title="Our work" seo={{ description: 'Finished pieces from Herit Clothing in Lagos.', image: items[0]?.cover?.url }}>
      <Section className="hc-section--pagehead" edit={{ to: '/website/work', label: 'our work' }}>
        <SectionHead
          as="h1"
          eyebrow="Our work"
          title="Finished pieces"
          lead="Each piece here was cut to one person's measurements. Open one to see the garment, the cloth and more photographs."
        />
        {withWork.length >= 2 && (
          <div className="hc-chip-group" role="group" aria-label="Filter by service">
            <button type="button" className="hc-chip" aria-pressed={filter === ''} onClick={() => setFilter('')}>
              All
            </button>
            {withWork.map((s) => (
              <button key={s.slug} type="button" className="hc-chip" aria-pressed={filter === s.slug} onClick={() => setFilter(s.slug)}>
                {s.title}
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section tone="alt" tight aria-label="Projects">
        {shown.length ? (
          <div className="hc-grid hc-grid--3" aria-live="polite">
            {shown.map((w) => (
              <WorkCard
                key={w.slug}
                image={toImage(w.cover)}
                title={w.title}
                meta={[w.garment, w.fabric].filter(Boolean).join(' · ')}
                to={`/work/${w.slug}`}
              />
            ))}
          </div>
        ) : (
          <p className="hc-state">No finished pieces are published yet.</p>
        )}
      </Section>

      <ProcessBand title="How a piece like this is made" />

      <ClosingAction
        eyebrow="Your piece"
        title="Start something similar"
        text="Send a photo of a piece you like, the occasion and the date."
        primary={{ to: primary.to, label: primary.label }}
        secondary={secondary}
        image={toImage(items.find((w) => w.cover?.url)?.cover)}
      />
    </SiteLayout>
  )
}

export default WorkPage
