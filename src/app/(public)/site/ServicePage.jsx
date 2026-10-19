import { useParams } from 'react-router-dom'
import heritApi from '@/helpers/heritApi'
import SiteLayout from './SiteLayout'
import { useSiteConfig, useSiteResource, previewItem, toImage, clip } from './siteData'
import { Section, SectionHead } from './ui/Section'
import { WorkCard } from './ui/Card'
import Button, { Actions } from './ui/Button'
import Icon from './ui/Icon'
import { PageHead, Rich, resourceState } from './cmsBlocks'
import { ClosingAction, ProcessBand } from './sections'
import { PrintRule } from './ui/PrintArt'
import { printVariant } from './ui/printPatterns'

/**
 * One service (BUILD-SPEC 4.7): header, description, what's included,
 * pricing note, a link to the process, related work and the enquiry action.
 * Each block is hidden when empty; unpublished or unknown slugs are a 404.
 */
const ServicePage = () => {
  const { slug } = useParams()
  const cfg = useSiteConfig()
  const res = useSiteResource(
    () => heritApi.site.service(slug),
    async () => {
      const service = await previewItem('service', { slug })
      return service ? { service, work: [] } : null
    },
    [slug],
  )
  const early = resourceState(res, 'Service')
  if (early) return early

  const s = res.data.service
  const work = res.data.work || []
  const site = String(cfg?.site_url || '').replace(/\/$/, '')
  const jsonld = site
    ? {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: s.title,
        ...(s.summary ? { description: s.summary } : {}),
        url: `${site}/services/${s.slug}`,
        ...(cfg?.jsonld ? { provider: { '@id': `${site}/#business` } } : {}),
        ...(cfg?.business?.area ? { areaServed: cfg.business.area } : {}),
      }
    : undefined

  return (
    <SiteLayout title={s.seo_title || s.title} seo={{ description: s.seo_description || clip(s.summary || s.body), image: s.hero?.url, jsonld }}>
      <PageHead eyebrow="Service" title={s.title} intro={s.summary} hero={s.hero} edit={{ to: `/website/services/${s.slug}`, label: s.title }} />
      <PrintRule variant={printVariant(s.title, 'kente')} />

      <Section tone="paper" aria-label={`About ${s.title}`}>
        <div className="hc-detail">
          <div className="hc-detail-main">
            <p className="hc-eyebrow">About this service</p>
            {s.body ? <Rich html={s.body} className="hc-detail-body" /> : <p className="hc-detail-body hc-lead">{s.summary}</p>}
            {s.includes?.length > 0 && (
              <>
                <h2 id="svc-includes" className="hc-h3 hc-detail-sub">
                  What&apos;s included
                </h2>
                <ul className="hc-checklist" aria-labelledby="svc-includes">
                  {s.includes.map((line) => (
                    <li key={line}>
                      <Icon name="check" /> <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <aside className="hc-price-card" aria-label="At a glance" data-reveal="">
            <p className="hc-eyebrow">At a glance</p>
            <p className="hc-price-card-note">{s.price_note || 'Priced by quote: the cloth and the finish set the price.'}</p>
            <dl className="hc-glance">
              <dt>Measurements</dt>
              <dd>Taken at your appointment</dd>
              <dt>Fittings</dt>
              <dd>By appointment, until it sits right</dd>
              <dt>Your order</dt>
              <dd>Followed online in your account</dd>
            </dl>
            <Actions>
              <Button to={`/contact?service=${encodeURIComponent(s.slug)}`} iconEnd="arrow-right">
                Ask for a quote
              </Button>
              {work.length > 0 && (
                <Button href="#svc-work" variant="secondary">
                  See the work
                </Button>
              )}
            </Actions>
          </aside>
        </div>
      </Section>

      {work.length > 0 && (
        <Section tone="alt" labelledBy="svc-work">
          <SectionHead id="svc-work" eyebrow="Our work" title={`${s.title}: recent pieces`} />
          <div className="hc-grid hc-grid--3">
            {work.map((w) => (
              <WorkCard
                key={w.slug}
                image={toImage(w.cover)}
                title={w.title}
                meta={[w.garment, w.fabric].filter(Boolean).join(' · ')}
                to={`/work/${w.slug}`}
              />
            ))}
          </div>
        </Section>
      )}

      <ProcessBand tone={work.length > 0 ? 'paper' : 'ink'} moreTo={cfg?.nav?.how_it_works ? '/how-it-works' : undefined} />

      <ClosingAction
        eyebrow={s.title}
        title="Ask about this service"
        text="Tell us the occasion and the date, and we will reply with the next step."
        primary={{ to: `/contact?service=${encodeURIComponent(s.slug)}`, label: 'Ask about this service' }}
        secondary={{ to: '/services', label: 'All services' }}
        image={toImage(s.hero)}
      />
    </SiteLayout>
  )
}

export default ServicePage
