import heritApi from '@/helpers/heritApi'
import SiteLayout from './SiteLayout'
import { useSiteResource, useSiteConfig, previewItem, toImage, clip } from './siteData'
import useActions from './ui/useActions'
import { Section } from './ui/Section'
import { ServiceCard } from './ui/Card'
import { PageHead, Rich, resourceState } from './cmsBlocks'
import { ClosingAction, ProcessBand, CompanyBand } from './sections'
import { PrintRule } from './ui/PrintArt'
import { printAt, printVariant } from './ui/printPatterns'

const load = () => heritApi.site.services()
const loadPreview = async () => {
  const [live, intro] = await Promise.all([heritApi.site.services(), previewItem('page', { key: 'services_intro' })])
  return { ...live, intro }
}

/**
 * Services (BUILD-SPEC 4.7): the services intro page, published services as
 * cards, then the site actions. With no services, the intro and a contact
 * action only.
 */
const ServicesPage = () => {
  const res = useSiteResource(load, loadPreview)
  const cfg = useSiteConfig()
  const { primary, secondary } = useActions()
  const early = resourceState(res, 'Services')
  if (early) return early

  const intro = res.data.intro
  const items = res.data.items || []

  return (
    <SiteLayout title={intro?.seo_title || 'Services'} seo={{ description: intro?.seo_description || clip(intro?.intro), image: intro?.hero?.url }}>
      <PageHead
        eyebrow="Services"
        title={intro?.headline || 'Services'}
        intro={intro?.intro}
        hero={intro?.hero}
        edit={{ to: '/website/pages/services_intro', label: 'the services introduction' }}
      />
      <PrintRule variant="asooke" />

      {intro?.body && (
        <Section>
          <Rich html={intro.body} />
        </Section>
      )}

      {items.length > 0 && (
        <Section tone="alt" aria-label="Services" edit={{ to: '/website/services', label: 'services' }}>
          <div className={`hc-grid ${items.length === 4 ? 'hc-grid--4' : 'hc-grid--3'}`}>
            {items.map((s, i) => (
              <ServiceCard
                key={s.slug}
                image={toImage(s.hero)}
                print={printVariant(s.title, printAt(i))}
                title={s.title}
                summary={s.summary}
                meta={s.price_note || undefined}
                to={`/services/${s.slug}`}
              />
            ))}
          </div>
        </Section>
      )}

      <ProcessBand moreTo={cfg?.nav?.how_it_works ? '/how-it-works' : undefined} />

      <CompanyBand image={toImage(items.find((s) => s.hero?.url)?.hero)} to={cfg?.nav?.company ? '/company-orders' : '/contact?type=company'} />

      <ClosingAction
        title={items.length ? 'Not sure which service fits?' : 'Tell us what you want to make.'}
        text={
          items.length
            ? 'Send a short note about the piece and the date you need it.'
            : 'Send a short message with the occasion and the date, and we will get back to you.'
        }
        primary={{ to: primary.to, label: primary.label }}
        secondary={secondary}
        image={toImage(intro?.hero) || toImage(items.filter((s) => s.hero?.url).slice(-1)[0]?.hero)}
      />
    </SiteLayout>
  )
}

export default ServicesPage
