import heritApi from '@/helpers/heritApi';
import SiteLayout from './SiteLayout';
import { useSiteResource, previewItem, toImage, clip } from './siteData';
import useActions from './ui/useActions';
import { Section } from './ui/Section';
import { ServiceCard } from './ui/Card';
import { PageHead, Rich, resourceState } from './cmsBlocks';
import { ClosingAction } from './sections';

const load = () => heritApi.site.services();
const loadPreview = async () => {
  const [live, intro] = await Promise.all([heritApi.site.services(), previewItem('page', { key: 'services_intro' })]);
  return { ...live, intro };
};

/**
 * Services (BUILD-SPEC 4.7): the services intro page, published services as
 * cards, then the site actions. With no services, the intro and a contact
 * action only.
 */
const ServicesPage = () => {
  const res = useSiteResource(load, loadPreview);
  const { primary, secondary } = useActions();
  const early = resourceState(res, 'Services');
  if (early) return early;

  const intro = res.data.intro;
  const items = res.data.items || [];

  return (
    <SiteLayout
      title={intro?.seo_title || 'Services'}
      seo={{ description: intro?.seo_description || clip(intro?.intro), image: intro?.hero?.url }}
    >
      <PageHead eyebrow="Services" title={intro?.headline || 'Services'} intro={intro?.intro} hero={intro?.hero} />

      {intro?.body && <Section><Rich html={intro.body} /></Section>}

      {items.length > 0 && (
        <Section tone="alt" aria-label="Services">
          <div className="hc-grid hc-grid--3">
            {items.map((s) => (
              <ServiceCard key={s.slug} image={toImage(s.hero)} title={s.title} summary={s.summary} to={`/services/${s.slug}`} />
            ))}
          </div>
        </Section>
      )}

      <ClosingAction
        title={items.length ? 'Not sure which service fits?' : 'Tell me what you want to make.'}
        text={items.length ? 'Send a short note about the piece and the date you need it.' : undefined}
        primary={{ to: primary.to, label: primary.label }}
        secondary={secondary}
      />
    </SiteLayout>
  );
};

export default ServicesPage;
