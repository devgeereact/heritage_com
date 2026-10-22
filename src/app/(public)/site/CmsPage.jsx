import heritApi from '@/helpers/heritApi'
import SiteLayout from './SiteLayout'
import { useSiteResource, previewItem, clip } from './siteData'
import useActions from './ui/useActions'
import { PrintRule } from './ui/PrintArt'
import { PageHead, Rich, resourceState } from './cmsBlocks'
import { ClosingAction, PromiseBand, ProcessBand, StoryBands } from './sections'
import { splitSections, htmlText } from './storySections'

/**
 * A fixed CMS page rendered as published: headline, intro, image and body,
 * then the site actions. Used for How it works and About. Unpublished is a
 * 404 page (noindex) and the nav link is hidden by the config flags.
 *
 * The body is laid out from its own headings (Website editor "## Heading"):
 * text before the first heading sits in the promise band; on How it works
 * each heading is a step on the process rail; on other pages the headed
 * sections become story bands (cards for "### items", side-by-side
 * statements otherwise). A body with no headings shows as before. The
 * closing band uses a print, not the page image (page images may carry a
 * wordmark that would sit behind the closing title).
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
  const edit = { to: `/website/pages/${pageKey}`, label: `the ${name} page` }
  const { lead, sections } = splitSections(p.body)
  const isHow = pageKey === 'how_it_works'
  const steps = isHow ? sections.map((s) => ({ title: s.title, desc: htmlText(s.html) })) : []

  return (
    <SiteLayout title={p.seo_title || name} seo={{ description: p.seo_description || clip(p.intro || p.body), image: p.hero?.url }}>
      <PageHead eyebrow={eyebrow} title={p.headline} intro={p.intro} hero={p.hero} edit={edit} />
      <PrintRule variant={isHow ? 'asooke' : 'kente'} />
      {sections.length === 0 ? (
        <PromiseBand eyebrow={eyebrow} statement={p.intro || p.headline}>
          {p.body ? <Rich html={p.body} className="hc-detail-body" /> : null}
        </PromiseBand>
      ) : (
        lead && (
          <PromiseBand eyebrow={eyebrow} statement={p.intro || p.headline}>
            <Rich html={lead} className="hc-detail-body" />
          </PromiseBand>
        )
      )}
      {!isHow && sections.length > 0 && <StoryBands sections={sections} edit={edit} />}
      <ProcessBand
        tone="ink"
        title={isHow ? (steps.length === 4 ? 'The four steps' : 'The steps') : undefined}
        steps={steps.length ? steps : undefined}
      />
      <ClosingAction
        eyebrow="Start here"
        title="Tell us what you want to make."
        text="Send a short message with the occasion and the date, and we will get back to you."
        primary={{ to: primary.to, label: primary.label }}
        secondary={secondary}
        print={isHow ? 'kente' : 'ankara'}
      />
    </SiteLayout>
  )
}

export const HowItWorksPage = () => <CmsPage pageKey="how_it_works" eyebrow="How it works" name="How it works" />

export default CmsPage
