import { Link } from 'react-router-dom';
import SiteLayout from './SiteLayout';
import heritApi from '@/helpers/heritApi';
import { useCatalogue, formatNgn } from './products';
import { useBlog, useTestimonials } from './content';
import { useShopEnabled } from './storeConfig';
import { useBusiness } from './business';
import { useSiteConfig, useSiteResource, previewItem, toImage, clip, loadSiteConfig } from './siteData';
import useActions from './ui/useActions';
import Hero from './ui/Hero';
import Button from './ui/Button';
import { Section, SectionHead } from './ui/Section';
import { ServiceCard, WorkCard } from './ui/Card';
import HcImage from './ui/HcImage';
import Icon from './ui/Icon';
import { MoreLink, Rich } from './cmsBlocks';
import { Lookbook, Testimonials, JournalGrid } from './sections';

/*
 * Standing copy (D-023). Published CMS content always wins; these lines fill
 * a section only while the owner has not published its content yet. Every
 * line describes how the service works, never a number, a person, an offer
 * or a reach claim (D-003). Source: docs/CONTENT.md#standing-home-copy.
 */
const COPY = {
  headline: "Men's clothing, made with care in Lagos.",
  intro:
    'Tell me what you want to make. I will discuss the fabric, fit and finish, arrange your measurements and agree the work before sewing begins.',
  principles: [
    {
      icon: 'ruler',
      title: 'Cut to your measurements',
      text: 'You are measured before any fabric is cut, and the garment is fitted on you before it is finished.',
    },
    {
      icon: 'notes',
      title: 'Agreed before sewing begins',
      text: 'Fabric, fit, finish, price and date are agreed with you first, so collection day holds no surprises.',
    },
    {
      icon: 'ticket',
      title: 'Follow your job online',
      text: 'Every order has its own reference. Check where your garment is at any time on Track your job.',
    },
  ],
  services: [
    {
      slug: 'made-to-measure',
      title: 'Made-to-measure menswear',
      summary: 'Clothing cut to your measurements, in your own fabric or one we choose together.',
      to: '/contact?type=fitting',
      link: 'Request a fitting',
    },
    {
      slug: 'company-orders',
      title: 'Company orders',
      summary: 'Coordinated garments for teams and events, with a sample and a fitting plan agreed first.',
      to: '/contact?type=company',
      link: 'Discuss a company order',
    },
  ],
  storyTitle: 'One conversation, start to finish.',
  storyLead:
    'You speak to the person who measures, cuts and fits your garment. Nothing is sewn until we both know exactly what is being made.',
  checklist: [
    'Fabric, fit and finish discussed with you',
    'Measurements taken before work begins',
    'A written quote agreed before sewing',
    'A fitting before the garment is finished',
  ],
  steps: [
    { title: 'Discuss', text: 'Tell me the garment, the occasion and the date.' },
    { title: 'Measure', text: 'We meet for measurements and talk through the fabric.' },
    { title: 'Agree', text: 'You approve a written quote before any cutting.' },
    { title: 'Sew and fit', text: 'The garment is made, then fitted on you and adjusted.' },
    { title: 'Collect', text: 'Collect it, or arrange delivery, once you are happy.' },
  ],
  companyTitle: 'A clear process for coordinated menswear.',
  companyLead:
    'Share the garment type, number of pieces and required date. I will confirm whether the work fits my capacity, discuss a sample and measurement approach, and provide a written quote.',
};

/** A published page, or null when it is not published (asked only when the config lists it). */
const pageOrNull = (key, published) =>
  !published.includes(key)
    ? Promise.resolve(null)
    : heritApi.site
        .page(key)
        .then((r) => r?.page || null)
        .catch((e) => {
          if (e?.status === 404) return null;
          throw e;
        });

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
 * Home (BUILD-SPEC 4.7, blended layout D-023, hero D-026): hero, principles, services,
 * story, process band, our work, company orders, shop, reviews, questions,
 * journal, closing band. CMS content leads; standing copy keeps the page
 * whole until it is published. Sections that would need invented proof
 * (work, reviews, journal, shop) stay hidden while empty.
 */
const HomePage = () => {
  const cfg = useSiteConfig();
  const business = useBusiness();
  const { primary, secondary } = useActions();
  const res = useSiteResource(
    () => loadHome(false),
    () => loadHome(true),
  );
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
  // A single CMS-led hero. Published work is the image fallback, never a
  // fabricated garment or external stock image (D-026).
  const heroImage = toImage(page?.hero) || toImage(work[0]?.cover);
  const hero = {
    eyebrow: "Men's tailoring in Lagos",
    title: page?.headline || COPY.headline,
    lead: page?.intro || COPY.intro,
    primary: { to: primary.to, label: primary.short },
    secondary: work.length
      ? { to: '/work', label: 'Explore our work' }
      : services.length ? { to: '/services', label: 'Explore services' } : secondary,
    image: heroImage,
    note: proof,
  };
  const featured = [...products].sort((a, b) => (b.premium ? 1 : 0) - (a.premium ? 1 : 0)).slice(0, 4);

  return (
    <SiteLayout
      seo={{
        home: true,
        description: page?.seo_description || clip(page?.intro) || COPY.intro,
        image: page?.hero?.url,
        jsonld: cfg?.jsonld || undefined,
      }}>
      <Hero {...hero} />

      {/* Principles: what every order can rely on. */}
      <section className="hc-principles" aria-label="How every order is handled">
        <div className="hc-container">
          <ul className="hc-principles-list">
            {COPY.principles.map((p) => (
              <li key={p.title} data-reveal="">
                <Icon name={p.icon} size="1.5em" />
                <h2 className="hc-principle-title">{p.title}</h2>
                <p>{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {page?.body && (
        <Section>
          <Rich html={page.body} />
        </Section>
      )}

      <Section tone="alt" labelledBy="home-services">
        <div className="hc-split-head">
          <SectionHead id="home-services" eyebrow="Services" title="What I make" />
          {services.length > 0 && <MoreLink to="/services">All services</MoreLink>}
        </div>
        {services.length > 0 ? (
          <div className="hc-grid hc-grid--3">
            {services.slice(0, 3).map((s) => (
              <ServiceCard key={s.slug} image={toImage(s.hero)} title={s.title} summary={s.summary} to={`/services/${s.slug}`} />
            ))}
          </div>
        ) : (
          <div className="hc-grid hc-grid--2">
            {COPY.services.map((s) => (
              <ServiceCard key={s.slug} title={s.title} summary={s.summary} to={s.to} linkLabel={s.link} />
            ))}
          </div>
        )}
      </Section>

      {/* Story: the owner's way of working, with the checklist. */}
      <Section labelledBy="home-story">
        <div className={`hc-story ${aboutImg ? 'hc-story--media' : ''}`.trim()}>
          {aboutImg && (
            <div className="hc-story-media" data-reveal="">
              <HcImage {...aboutImg} sizes="(min-width: 1024px) 50vw, 100vw" ratio="4 / 5" />
            </div>
          )}
          <div className="hc-story-copy">
            <SectionHead
              id="home-story"
              eyebrow="How I work"
              title={d.about?.headline || COPY.storyTitle}
              lead={d.about?.intro || COPY.storyLead}
            />
            <ul className="hc-checklist" data-reveal="">
              {COPY.checklist.map((c) => (
                <li key={c}>
                  <Icon name="check" /> {c}
                </li>
              ))}
            </ul>
            {d.about && (
              <div className="hc-story-more">
                <MoreLink to="/about">More about me</MoreLink>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Process band: five steps on ink; each amber rule draws as it reveals. */}
      <section className="hc-band" aria-labelledby="home-how">
        <div className="hc-container">
          <div className="hc-split-head">
            <div className="hc-head" data-reveal="">
              <p className="hc-eyebrow">How it works</p>
              <h2 id="home-how" className="hc-h2">
                {d.how?.headline || 'From first conversation to collection.'}
              </h2>
            </div>
            {d.how && (
              <Link to="/how-it-works" className="hc-band-link">
                The steps in full <Icon name="arrow-right" />
              </Link>
            )}
          </div>
          <ol className="hc-band-steps">
            {COPY.steps.map((s, i) => (
              <li key={s.title} data-reveal="">
                <span className="hc-band-n" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {work.length > 0 && (
        <Section labelledBy="home-work">
          <div className="hc-split-head">
            <SectionHead id="home-work" eyebrow="Our work" title="Recent pieces" />
            <MoreLink to="/work">See all work</MoreLink>
          </div>
          <div className="hc-grid hc-grid--3 hc-grid--work">
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

      {/* Company orders: always offered; the published page refines the words. */}
      <Section tone="alt" labelledBy="home-company">
        <div className="hc-company">
          <SectionHead
            id="home-company"
            eyebrow="Company orders"
            title={d.company?.headline || COPY.companyTitle}
            lead={d.company?.intro || COPY.companyLead}
          />
          <div className="hc-company-action" data-reveal="">
            <Button to={secondary.to}>{d.company ? 'Send your company brief' : secondary.label}</Button>
            {d.company && <MoreLink to="/company-orders">How company orders work</MoreLink>}
          </div>
        </div>
      </Section>

      {shopOn && <Lookbook eyebrow="Ready to wear" title="In stock now." products={featured} formatNgn={formatNgn} />}

      <Testimonials eyebrow="In their words" title="What clients say" quotes={quotes} />

      {faqs.length > 0 && (
        <Section labelledBy="home-faqs">
          <div className="hc-faq-split">
            <SectionHead id="home-faqs" eyebrow="Questions" title="Before you ask">
              {cfg?.nav?.faqs && <MoreLink to="/faqs">All questions</MoreLink>}
            </SectionHead>
            <div className="hc-faq-list">
              {faqs.map((f) => (
                <details key={f.id} className="hc-faq">
                  <summary>
                    {f.question} <Icon name="chevron-down" />
                  </summary>
                  <div className="hc-faq-a">
                    <Rich html={f.answer} />
                  </div>
                </details>
              ))}
            </div>
          </div>
        </Section>
      )}

      <JournalGrid eyebrow="Journal" title="Notes from the workroom" posts={journal} />

      {/* Closing band on ink. */}
      <section className="hc-band hc-band--closing" aria-labelledby="home-close">
        <div className="hc-container hc-close" data-reveal="">
          <h2 id="home-close" className="hc-h2">
            Tell me what you want to make.
          </h2>
          <p>{proof || 'Appointments are arranged in advance, so you have my full attention.'}</p>
          <div className="hc-close-actions">
            <Button to={primary.to}>{primary.label}</Button>
            <Link to="/track" className="hc-band-link">
              Track your job <Icon name="arrow-right" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

export default HomePage;
