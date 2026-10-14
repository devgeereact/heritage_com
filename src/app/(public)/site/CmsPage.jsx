import heritApi from '@/helpers/heritApi'
import SiteLayout from './SiteLayout'
import { useSiteResource, previewItem, clip, toImage } from './siteData'
import useActions from './ui/useActions'
import { PageHead, Rich, resourceState } from './cmsBlocks'
import { ClosingAction, PromiseBand, ProcessBand } from './sections'

/**
 * A fixed CMS page rendered as published: headline, intro, image and body,
 * then the site actions. Used for How it works and About. Unpublished is a
 * 404 page (noindex) and the nav link is hidden by the config flags.
 */
const CmsPage = ({ pageKey, eyebrow, name }) => {
  const { primary, secondary } = useActions()
  const res = useSiteResource(
    () => heritApi.site.page(pageKey).then((r) => r?.page || null),
    () => previewItem('page', { key: pageKey }),
    [pageKey],
  )
  const early = resourceState(res, name)
  if (early) return early
  const p = res.data

  return (
    <SiteLayout title={p.seo_title || name} seo={{ description: p.seo_description || clip(p.intro || p.body), image: p.hero?.url }}>
      <PageHead eyebrow={eyebrow} title={p.headline} intro={p.intro} hero={p.hero} />
      <PromiseBand eyebrow={eyebrow} statement={p.intro || p.headline}>
        {p.body ? <Rich html={p.body} className="hc-detail-body" /> : null}
      </PromiseBand>
      <ProcessBand tone="ink" title={pageKey === 'how_it_works' ? 'The four steps' : undefined} />
      <ClosingAction
        eyebrow="Start here"
        title="Tell me what you want to make."
        text="Send a short message with the occasion and the date, and I will get back to you."
        primary={{ to: primary.to, label: primary.label }}
        secondary={secondary}
        image={toImage(p.hero)}
      />
    </SiteLayout>
  )
}

export const HowItWorksPage = () => <CmsPage pageKey="how_it_works" eyebrow="How it works" name="How it works" />

export default CmsPage
