import SiteLayout from './SiteLayout';
import heritApi from '@/helpers/heritApi';
import { useCatalogue, formatNgn } from './products';
import { useBlog, useTestimonials } from './content';
import { useShopEnabled } from './storeConfig';
import { useBusiness } from './business';
import { useSiteConfig, useSiteResource, previewItem, toImage, clip, loadSiteConfig } from './siteData';
import useActions from './ui/useActions';
import Hero from './ui/Hero';
import { Section, SectionHead } from './ui/Section';
import { ServiceCard, WorkCard } from './ui/Card';
import HcImage from './ui/HcImage';
import Icon from './ui/Icon';
import { MoreLink, Rich } from './cmsBlocks';
import { Lookbook, Testimonials, JournalGrid, ClosingAction } from './sections';

/** A published page, or null when it is not published (asked only when the config lists it). */
const pageOrNull = (key, published) => (!published.includes(key) ? Promise.resolve(null)
  : heritApi.site.page(key).then((r) => r?.page || null).catch((e) => {
    if (e?.status === 404) return null;
    throw e;
  }));

/**
 * Home and the three pages it previews (company, how it works, about). In
 * preview mode the home page itself comes from its draft; the rest stays
 * published, as visitors would see it.
 */
const loadHome = async (preview) => {
  const published = (await loadSiteConfig()).pages || [];
  const [home, company, how, about] = await Promise.all([
    heritApi.site.home(),
    pageOrNull('company', published),
    pageOrNull('how_it_works', published),
    pageOrNull('about', published),
  ]);
  const page = preview ? await previewItem('page', { key: 'home' }) : home?.page || null;
  return { ...home, page, company, how, about };
};

/**
 * Home (BUILD-SPEC 4.7). Sections in a fixed order, each hidden while its
 * content is unpublished or empty: hero, services, company band, our work,
 * how it works, owner note, reviews, questions, final action. The hero and
 * the final action always show; without a published home page the hero is
 * text only, with the business name as its headline.
 */
const HomePage = () => {
  const cfg = useSiteConfig();
  const business = useBusiness();
  const { primary, secondary } = useActions();
  const res = useSiteResource(() => loadHome(false), () => loadHome(true));
  const shopOn = useShopEnabled();
  const { products } = useCatalogue();
  const quotes = useTestimonials();
  const journal = useBlog(3);

  const d = res.data || {};
  const page = d.page;
  const services = d.services || [];
  const work = d.work || [];
  const faqs = d.faqs || [];
  const aboutImg = toImage(d.about?.hero);
  const proof = [business.area, business.hours].filter(Boolean).join(' · ');
  const featured = [...products].sort((a, b) => (b.premium ? 1 : 0) - (a.premium ? 1 : 0)).slice(0, 4);
  const book = { to: primary.to, label: primary.label };

  // Hero slides come from published content only (D-023): the home page
  // first, then up to four services that have a photograph.
  const slides = [
    { label: 'Made to measure', eyebrow: business.area ? `Made to measure in ${business.area}` : 'Made to measure', title: page?.headline || business.name, lead: page?.intro, image: toImage(page?.hero), primary: book, secondary },
    ...services.filter((s) => s.hero?.url).slice(0, 4).map((s) => ({
      label: s.title,
      eyebrow: 'What I make',
      title: s.title,
      lead: s.summary,
      image: toImage(s.hero),
      primary: { to: `/services/${s.slug}`, label: 'View service' },
      secondary: { to: book.to, label: primary.short || primary.label },
    })),
  ];
  const companyImg = toImage(d.company?.hero);
  const closingImg = toImage(page?.hero);

  return (
    <SiteLayout
      seo={{
        home: true,
        description: page?.seo_description || clip(page?.intro),
        image: page?.hero?.url,
        jsonld: cfg?.jsonld || undefined,
      }}
    >
      <Hero slides={slides} note={proof || undefined} />

      {page?.body && (
        <Section tone="paper" className="hc-section--statement">
          <Rich html={page.body} />
        </Section>
      )}

      {services.length > 0 && (
        <Section labelledBy="home-services">
          <SectionHead id="home-services" eyebrow="What I make" title="Services">
            <MoreLink to="/services">All services</MoreLink>
          </SectionHead>
          <div className={`hc-grid ${services.length % 4 === 0 ? 'hc-grid--4' : 'hc-grid--3'}`}>
            {services.map((s) => (
              <ServiceCard key={s.slug} image={toImage(s.hero)} title={s.title} summary={s.summary} to={`/services/${s.slug}`} />
            ))}
          </div>
        </Section>
      )}

      {work.length > 0 && (
        <Section tone="alt" labelledBy="home-work">
          <SectionHead id="home-work" eyebrow="Our work" title="Recent pieces from the workroom">
            <MoreLink to="/work">See all work</MoreLink>
          </SectionHead>
          <div className="hc-grid hc-grid--3">
            {work.map((w) => (
              <WorkCard key={w.slug} image={toImage(w.cover)} title={w.title} meta={[w.garment, w.fabric].filter(Boolean).join(' · ')} to={`/work/${w.slug}`} />
            ))}
          </div>
        </Section>
      )}

      {d.how && (
        <Section tone="paper" labelledBy="home-how">
          <SectionHead id="home-how" eyebrow="How it works" title={d.how.headline} lead={d.how.intro || undefined}>
            <MoreLink to="/how-it-works">The steps in full</MoreLink>
          </SectionHead>
        </Section>
      )}

      {d.company && (
        <Section labelledBy="home-company">
          <div className={`hc-pagetop ${companyImg ? 'hc-pagetop--media hc-pagetop--flip' : ''}`.trim()}>
            <SectionHead id="home-company" eyebrow="Company orders" title={d.company.headline} lead={d.company.intro || undefined}>
              <MoreLink to="/company-orders">How company orders work</MoreLink>
            </SectionHead>
            {companyImg && <HcImage {...companyImg} sizes="(min-width: 1024px) 50vw, 100vw" ratio="5 / 6" className="hc-band-media" />}
          </div>
        </Section>
      )}

      {d.about && (
        <Section tone="alt" labelledBy="home-about">
          <div className={`hc-pagetop ${aboutImg ? 'hc-pagetop--media' : ''}`.trim()}>
            <SectionHead id="home-about" eyebrow="About" title={d.about.headline} lead={d.about.intro || undefined}>
              <MoreLink to="/about">More about me</MoreLink>
            </SectionHead>
            {aboutImg && <HcImage {...aboutImg} sizes="(min-width: 1024px) 58vw, 100vw" ratio="4 / 3" />}
          </div>
        </Section>
      )}

      {shopOn && (
        <Lookbook eyebrow="Ready to wear" title="In stock now." products={featured} formatNgn={formatNgn} />
      )}

      <Testimonials eyebrow="In their words" title="What clients say" quotes={quotes} />

      {faqs.length > 0 && (
        <Section tone="paper" labelledBy="home-faqs">
          <SectionHead id="home-faqs" eyebrow="Questions" title="Before you ask" />
          <div className="hc-faq-list">
            {faqs.map((f) => (
              <details key={f.id} className="hc-faq">
                <summary>{f.question} <Icon name="chevron-down" /></summary>
                <div className="hc-faq-a"><Rich html={f.answer} /></div>
              </details>
            ))}
          </div>
          {cfg?.nav?.faqs && <MoreLink to="/faqs">All questions</MoreLink>}
        </Section>
      )}

      <JournalGrid eyebrow="Journal" title="Notes from the workroom" posts={journal} />

      <ClosingAction
        eyebrow="Start here"
        title="Tell me what you want to make."
        text="Send a short message with the occasion and the date, and I will get back to you."
        primary={book}
        secondary={secondary}
        image={closingImg}
      />
    </SiteLayout>
  );
};

export default HomePage;
