import heritApi from '@/helpers/heritApi';
import SiteLayout from './SiteLayout';
import { useSiteResource, previewItem, clip, loadSiteConfig } from './siteData';
import { Section, SectionHead } from './ui/Section';
import { PageHead, Rich } from './cmsBlocks';
import CompanyBriefForm from './CompanyBriefForm';

/** The company page (null while unpublished) and the services for the garment list. */
const load = async (preview) => {
  const cfg = await loadSiteConfig();
  const published = (cfg.pages || []).includes('company');
  const [page, services] = await Promise.all([
    preview ? previewItem('page', { key: 'company' })
      : published ? heritApi.site.page('company').then((r) => r?.page || null).catch(() => null) : null,
    heritApi.site.services().then((r) => r?.items || []).catch(() => []),
  ]);
  return { page, services };
};

/**
 * Company orders (BUILD-SPEC 4.7). The owner's published page (hook, scope,
 * process, wearer privacy) above the brief form. While the page is not
 * published the form still works under a plain heading, so a company can
 * always reach the business; the nav link stays hidden until it is published.
 */
const CompanyOrdersPage = () => {
  const res = useSiteResource(() => load(false), () => load(true));
  const page = res.data?.page;
  const services = res.data?.services || [];

  return (
    <SiteLayout title={page?.seo_title || 'Company orders'} seo={{ description: page?.seo_description || clip(page?.intro), image: page?.hero?.url }}>
      <PageHead eyebrow="Company orders" title={page?.headline || 'Company orders'} intro={page?.intro} hero={page?.hero} />
      {page?.body && <Section><Rich html={page.body} /></Section>}
      <Section tone="alt" id="brief" labelledBy="brief-title">
        <SectionHead id="brief-title" title="Send your company brief" lead="Share the garment, number of pieces and the date you need them." />
        <div className="hc-form-wrap">
          <CompanyBriefForm services={services} />
        </div>
      </Section>
    </SiteLayout>
  );
};

export default CompanyOrdersPage;
