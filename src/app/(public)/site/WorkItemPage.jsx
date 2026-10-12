import { Link, useParams } from 'react-router-dom'
import heritApi from '@/helpers/heritApi'
import SiteLayout from './SiteLayout'
import { useSiteResource, previewItem, toImage, clip } from './siteData'
import useActions from './ui/useActions'
import { Section, SectionHead } from './ui/Section'
import HcImage from './ui/HcImage'
import Icon from './ui/Icon'
import { Rich, resourceState } from './cmsBlocks'
import { ClosingAction } from './sections'

const ROLE_LABEL = { front: 'Front', back: 'Back', detail: 'Detail', process: 'In progress' }

/**
 * One portfolio project (BUILD-SPEC 4.7): gallery as figures (first image
 * eager), a facts list (garment, fabric), summary and story, the related
 * service and "Start something similar". Consent records and client links
 * never reach this page (site.php whitelist).
 */
const WorkItemPage = () => {
  const { slug } = useParams()
  const { primary, secondary } = useActions()
  const res = useSiteResource(
    () => heritApi.site.workItem(slug).then((r) => r?.item || null),
    () => previewItem('project', { slug }),
    [slug],
  )
  const early = resourceState(res, 'Our work')
  if (early) return early

  const w = res.data
  const images = w.images?.length ? w.images : w.cover ? [w.cover] : []
  const facts = [
    ['Garment', w.garment],
    ['Fabric', w.fabric],
  ].filter(([, v]) => v)

  return (
    <SiteLayout
      title={w.seo_title || w.title}
      seo={{ description: w.seo_description || clip(w.summary || w.body), image: w.cover?.url, type: 'article' }}>
      <Section>
        <p className="hc-crumb">
          <Link to="/work">Our work</Link> / <span>{w.title}</span>
        </p>
        <div className="hc-split">
          <div>
            <SectionHead as="h1" title={w.title} lead={w.summary || undefined} />
            {facts.length > 0 && <dl className="hc-facts">{facts.map(([k, v]) => [<dt key={`${k}-t`}>{k}</dt>, <dd key={`${k}-d`}>{v}</dd>])}</dl>}
          </div>
          {images[0] && <HcImage {...toImage(images[0])} priority sizes="(min-width: 1024px) 42vw, 100vw" ratio="4 / 5" />}
        </div>
      </Section>

      {images.length > 1 && (
        <Section tone="alt" aria-label="Gallery">
          <div className="hc-gallery">
            {images.slice(1).map((img) => (
              <figure key={img.url}>
                <HcImage {...toImage(img)} sizes="(min-width: 768px) 50vw, 100vw" ratio="4 / 5" />
                {(img.caption || ROLE_LABEL[img.role]) && <figcaption>{img.caption || ROLE_LABEL[img.role]}</figcaption>}
              </figure>
            ))}
          </div>
        </Section>
      )}

      {w.body && (
        <Section>
          <Rich html={w.body} />
        </Section>
      )}

      {w.service_slug && (
        <Section tight>
          <p>
            <Link to={`/services/${w.service_slug}`} className="hc-card-link">
              About this service <Icon name="arrow-right" />
            </Link>
          </p>
        </Section>
      )}

      <ClosingAction title="Start something similar" primary={{ to: primary.to, label: primary.label }} secondary={secondary} />
    </SiteLayout>
  )
}

export default WorkItemPage
