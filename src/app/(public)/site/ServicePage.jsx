import { useParams } from 'react-router-dom'
import heritApi from '@/helpers/heritApi'
import SiteLayout from './SiteLayout'
import { useSiteConfig, useSiteResource, previewItem, toImage, clip } from './siteData'
import { Section, SectionHead } from './ui/Section'
import { WorkCard } from './ui/Card'
import Button, { Actions } from './ui/Button'
import Icon from './ui/Icon'
import { PageHead, Rich, MoreLink, resourceState } from './cmsBlocks'

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
      <PageHead eyebrow="Service" title={s.title} intro={s.summary} hero={s.hero} />

      {s.body && (
        <Section>
          <Rich html={s.body} />
        </Section>
      )}

      {(s.includes?.length > 0 || s.price_note) && (
        <Section tone="paper" aria-label="What's included and pricing">
          <div className="hc-split">
            {s.includes?.length > 0 && (
              <div>
                <SectionHead id="svc-includes" eyebrow="The service" title="What's included" />
                <ul className="hc-checklist">
                  {s.includes.map((line) => (
                    <li key={line}>
                      <Icon name="check" /> <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {s.price_note && (
              <div className="hc-price-card" data-reveal="">
                <p className="hc-eyebrow">Pricing</p>
                <p className="hc-price-card-note">{s.price_note}</p>
                <Button to={`/contact?service=${encodeURIComponent(s.slug)}`} iconEnd="arrow-right">
                  Ask for a quote
                </Button>
              </div>
            )}
          </div>
        </Section>
      )}

      {cfg?.nav?.how_it_works && (
        <Section tight>
          <MoreLink to="/how-it-works">How the process works</MoreLink>
        </Section>
      )}

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

      <Section className="hc-section--closing">
        <div className="hc-cta-band" data-reveal="">
          <h2 className="hc-h2">Ask about this service</h2>
          <Actions center>
            <Button to={`/contact?service=${encodeURIComponent(s.slug)}`}>Ask about this service</Button>
            <Button to="/services" variant="secondary">
              All services
            </Button>
          </Actions>
        </div>
      </Section>
    </SiteLayout>
  )
}

export default ServicePage
