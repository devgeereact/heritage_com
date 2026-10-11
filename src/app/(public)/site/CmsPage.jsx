import heritApi from '@/helpers/heritApi';
import SiteLayout from './SiteLayout';
import { useSiteResource, previewItem, clip } from './siteData';
import useActions from './ui/useActions';
import { Section } from './ui/Section';
import { PageHead, Rich, resourceState } from './cmsBlocks';
import { ClosingAction } from './sections';

/**
 * A fixed CMS page rendered as published: headline, intro, image and body,
 * then the site actions. Used for How it works and About. Unpublished is a
 * 404 page (noindex) and the nav link is hidden by the config flags.
 */
const CmsPage = ({ pageKey, eyebrow, name }) => {
  const { primary, secondary } = useActions();
  const res = useSiteResource(
    () => heritApi.site.page(pageKey).then((r) => r?.page || null),
    () => previewItem('page', { key: pageKey }),
    [pageKey],
  );
  const early = resourceState(res, name);
  if (early) return early;
  const p = res.data;

  return (
    <SiteLayout title={p.seo_title || name} seo={{ description: p.seo_description || clip(p.intro || p.body), image: p.hero?.url }}>
      <PageHead eyebrow={eyebrow} title={p.headline} intro={p.intro} hero={p.hero} />
      {p.body && <Section tone="alt"><Rich html={p.body} /></Section>}
      <ClosingAction title="Tell me what you want to make." primary={{ to: primary.to, label: primary.label }} secondary={secondary} />
    </SiteLayout>
  );
};

export const HowItWorksPage = () => <CmsPage pageKey="how_it_works" eyebrow="How it works" name="How it works" />;

export default CmsPage;
