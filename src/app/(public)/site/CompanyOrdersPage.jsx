import heritApi from '@/helpers/heritApi'
import SiteLayout from './SiteLayout'
import { useSiteResource, previewItem, clip, loadSiteConfig, toImage } from './siteData'
import { CompanyBand, ProcessBand } from './sections'
import { Section, SectionHead } from './ui/Section'
import { PageHead, Rich } from './cmsBlocks'
import CompanyBriefForm from './CompanyBriefForm'

/** The company page (null while unpublished) and the services for the garment list. */
const load = async (preview) => {
  const cfg = await loadSiteConfig()
  const published = (cfg.pages || []).includes('company')
  const [page, services] = await Promise.all([
    preview
      ? previewItem('page', { key: 'company' })
      : published
        ? heritApi.site
            .page('company')
            .then((r) => r?.page || null)
            .catch(() => null)
        : null,
    heritApi.site
      .services()
      .then((r) => r?.items || [])
      .catch(() => []),
  ])
  return { page, services }
}

/**
 * Company orders (BUILD-SPEC 4.7). The owner's published page (hook, scope,
 * process, wearer privacy) above the brief form. While the page is not
 * published the form still works under a plain heading, so a company can
 * always reach the business; the nav link stays hidden until it is published.
 */
const CompanyOrdersPage = () => {
  const res = useSiteResource(
    () => load(false),
    () => load(true),
  )
  const page = res.data?.page
  const services = res.data?.services || []

  return (
    <SiteLayout title={page?.seo_title || 'Company orders'} seo={{ description: page?.seo_description || clip(page?.intro), image: page?.hero?.url }}>
      <PageHead
        eyebrow="Company orders"
        title={page?.headline || 'Company orders'}
        intro={page?.intro}
        hero={page?.hero}
        edit={{ to: '/website/pages/company', label: 'the company orders page' }}
      />
      <CompanyBand
        title="What a company order includes"
        lead="One brief for the whole group. Each wearer is measured and fitted as a person, and you see where every garment is."
        image={toImage(page?.hero) || toImage(services.find((s) => s.hero?.url)?.hero)}
        to="#brief"
      />
      {page?.body && (
        <Section tone="paper">
          <div className="hc-detail hc-detail--single">
            <div className="hc-detail-main">
              <p className="hc-eyebrow">How it works for companies</p>
              <Rich html={page.body} className="hc-detail-body" />
            </div>
          </div>
        </Section>
      )}
      <ProcessBand tone={page?.body ? 'ink' : 'paper'} title="From brief to handover" />
      <Section tone="alt" id="brief" labelledBy="brief-title">
        <SectionHead id="brief-title" title="Send your company brief" lead="Share the garment, number of pieces and the date you need them." />
        <div className="hc-detail">
          <div className="hc-form-wrap">
            <CompanyBriefForm services={services} />
          </div>
          <aside className="hc-price-card" aria-label="What happens next">
            <p className="hc-eyebrow">What happens next</p>
            <p className="hc-price-card-note">A reply about your brief, then a plan for every wearer.</p>
            <dl className="hc-glance">
              <dt>First</dt>
              <dd>We reply to confirm the details and the timing</dd>
              <dt>Then</dt>
              <dd>We agree the cloth, the style and a sample</dd>
              <dt>After</dt>
              <dd>Each wearer is measured, and you see every garment&apos;s progress</dd>
            </dl>
          </aside>
        </div>
      </Section>
    </SiteLayout>
  )
}

export default CompanyOrdersPage
