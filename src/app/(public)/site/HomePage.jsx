import { useState } from 'react'
import SiteLayout from './SiteLayout'
import heritApi from '@/helpers/heritApi'
import { useCatalogue, formatNgn } from './products'
import { useBlog, useTestimonials } from './content'
import { useShopEnabled } from './storeConfig'
import { useBusiness } from './business'
import { useSiteConfig, useSiteResource, previewItem, toImage, clip, loadSiteConfig } from './siteData'
import useActions from './ui/useActions'
import Hero from './ui/Hero'
import { Section, SectionHead } from './ui/Section'
import { ServiceCard, WorkCard } from './ui/Card'
import HcImage from './ui/HcImage'
import Icon from './ui/Icon'
import PrintArt from './ui/PrintArt'
import { MoreLink, Rich } from './cmsBlocks'
import { Lookbook, Testimonials, JournalGrid, ClosingAction, PromiseBand, ProcessBand, CompanyBand, FabricStory } from './sections'
import { PrintRule } from './ui/PrintArt'
import { printAt, printVariant } from './ui/printPatterns'
import { splitSections, htmlText } from './storySections'

/* Where the staff Edit control on each Home section leads (Website admin). */
const EDIT = {
  slides: { to: '/website/slides', label: 'hero slides' },
  home: { to: '/website/pages/home', label: 'the home page text' },
  fabrics: { to: '/website/pages/fabrics', label: 'the fabric story' },
  services: { to: '/website/services', label: 'services' },
  work: { to: '/website/work', label: 'our work' },
  how: { to: '/website/pages/how_it_works', label: 'how it works' },
  company: { to: '/website/pages/company', label: 'the company orders page' },
  about: { to: '/website/pages/about', label: 'the about page' },
  faqs: { to: '/website/faqs', label: 'questions' },
  journal: { to: '/content', label: 'the journal' },
  contact: { to: '/website/pages/contact', label: 'the contact page' },
}

/** "## Heading" sections of a page body as process steps ({title, desc}). */
const stepsOf = (page) => splitSections(page?.body).sections.map((s) => ({ title: s.title, desc: htmlText(s.html) }))

/** A published page, or null when it is not published (asked only when the config lists it). */
const pageOrNull = (key, published) =>
  !published.includes(key)
    ? Promise.resolve(null)
    : heritApi.site
        .page(key)
        .then((r) => r?.page || null)
        .catch((e) => {
          if (e?.status === 404) return null
          throw e
        })

/**
 * Home and the pages it previews (company, how it works, about, the fabric
 * story, the services introduction and contact). In preview mode the home page
 * itself comes from its draft; the rest stays published, as visitors would see it.
 */
const loadHome = async (preview) => {
  const published = (await loadSiteConfig()).pages || []
  const [home, company, how, about, fabrics, servicesIntro, contact] = await Promise.all([
    heritApi.site.home(),
    ...['company', 'how_it_works', 'about', 'fabrics', 'services_intro', 'contact'].map((k) => pageOrNull(k, published)),
  ])
  const page = preview ? await previewItem('page', { key: 'home' }) : home?.page || null
  return { ...home, page, company, how, about, fabrics, servicesIntro, contact }
}

/**
 * Home (BUILD-SPEC 4.7): a full landing built only from published CMS content,
 * with the African prints woven through it. Sections in a fixed order, each
 * hidden while its content is unpublished or empty: hero slides, the promise
 * (home page), the fabric story (fabrics page), services, our work, how it
 * works (its page's steps), company orders, about with the mission, reviews,
 * questions, journal and the closing action (contact page). Where a section
 * has no photograph an African print fills the space. Signed-in staff see an
 * Edit control on each section that opens its editor.
 */
const HomePage = () => {
  const cfg = useSiteConfig()
  const business = useBusiness()
  const { primary, secondary } = useActions()
  const res = useSiteResource(
    () => loadHome(false),
    () => loadHome(true),
  )
  const shopOn = useShopEnabled()
  const { products } = useCatalogue()
  const quotes = useTestimonials()
  const journal = useBlog(3)
  const [workFilter, setWorkFilter] = useState('')

  const d = res.data || {}
  const page = d.page
  const services = d.services || []
  const work = d.work || []
  const faqs = d.faqs || []
  const aboutImg = toImage(d.about?.hero)
  const aboutParts = splitSections(d.about?.body)
  const mission = aboutParts.sections.find((x) => /mission/i.test(x.title))
  const proof = [business.area, business.hours].filter(Boolean).join(' · ')
  const featured = [...products].sort((a, b) => (b.premium ? 1 : 0) - (a.premium ? 1 : 0)).slice(0, 4)
  const book = { to: primary.to, label: primary.label }

  // Hero slides come from published content only (D-023). Owner-made slides
  // (Website > Hero slides) win; without any, the home page and up to four
  // services with a photograph make the slides. Each slide carries a print for
  // the moment before its photograph loads or when it has none.
  const ownSlides = (d.slides || []).map((s, i) => ({
    label: s.label || s.headline,
    eyebrow: s.eyebrow || undefined,
    title: s.headline,
    lead: s.lead || undefined,
    image: toImage(s.hero),
    print: printAt(i),
    primary: s.cta_path ? { to: s.cta_path, label: s.cta_label || 'Find out more' } : book,
    secondary,
  }))
  const autoSlides = [
    {
      label: 'Made to measure',
      eyebrow: business.area ? `Made to measure in ${business.area}` : 'Made to measure',
      title: page?.headline || business.name,
      lead: page?.intro,
      image: toImage(page?.hero),
      primary: book,
      secondary,
    },
    ...services
      .filter((s) => s.hero?.url)
      .slice(0, 4)
      .map((s, i) => ({
        label: s.title,
        eyebrow: 'What we make',
        title: s.title,
        lead: s.summary,
        image: toImage(s.hero),
        print: printAt(i + 1),
        primary: { to: `/services/${s.slug}`, label: 'View service' },
        secondary: { to: book.to, label: primary.short || primary.label },
      })),
  ]
  const slides = ownSlides.length ? ownSlides : autoSlides
  const firstCover = work.find((w) => w.cover?.url)?.cover
  const companyImg = toImage(d.company?.hero) || toImage(firstCover)
  const closingImg = toImage(d.contact?.hero) || toImage(page?.hero)
  const statement = `${business.name || 'Herit Clothing'} is a tailoring workroom${business.area ? ` in ${business.area}` : ''}. We make men's clothing to your measurements and keep you posted at every step, from the first fitting to handover.`
  const howSteps = stepsOf(d.how)

  // Work filter chips: only services that have published work.
  const workServices = services.filter((s) => work.some((w) => w.service_slug === s.slug))
  const shownWork = workFilter ? work.filter((w) => w.service_slug === workFilter) : work

  return (
    <SiteLayout
      seo={{
        home: true,
        description: page?.seo_description || clip(page?.intro),
        image: page?.hero?.url,
        jsonld: cfg?.jsonld || undefined,
      }}>
      <Hero slides={slides} note={proof || undefined} edit={EDIT.slides} />

      <PrintRule variant="kente" />

      <PromiseBand eyebrow="The Herit way" statement={page?.intro || statement} edit={EDIT.home}>
        {page?.body ? <Rich html={page.body} className="hc-promise-statement" /> : null}
      </PromiseBand>

      <FabricStory page={d.fabrics} edit={EDIT.fabrics} />

      {services.length > 0 && (
        <Section labelledBy="home-services" edit={EDIT.services}>
          <SectionHead
            id="home-services"
            eyebrow="What we make"
            title={d.servicesIntro?.headline || 'Services, cut to measure'}
            lead={
              d.servicesIntro?.intro ||
              'Every piece is made for you. Prices depend on the cloth and the finish, so you get a written quote before any work starts.'
            }>
            <MoreLink to="/services">All services</MoreLink>
          </SectionHead>
          <div className={`hc-grid ${services.length === 4 ? 'hc-grid--4' : 'hc-grid--3'}`}>
            {services.map((s, i) => (
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

      {work.length > 0 && (
        <Section tone="alt" labelledBy="home-work" edit={EDIT.work}>
          <SectionHead
            id="home-work"
            eyebrow="Selected work"
            title="Recent pieces from the workroom"
            lead="Open a piece to see the garment, the cloth and the photographs.">
            {workServices.length > 1 && (
              <div className="hc-chip-group" role="group" aria-label="Filter work by service">
                <button type="button" className="hc-chip" aria-pressed={workFilter === ''} onClick={() => setWorkFilter('')}>
                  All
                </button>
                {workServices.map((s) => (
                  <button key={s.slug} type="button" className="hc-chip" aria-pressed={workFilter === s.slug} onClick={() => setWorkFilter(s.slug)}>
                    {s.title}
                  </button>
                ))}
              </div>
            )}
          </SectionHead>
          <div className="hc-grid hc-grid--3" aria-live="polite">
            {shownWork.map((w) => (
              <WorkCard
                key={w.slug}
                image={toImage(w.cover)}
                title={w.title}
                meta={[w.garment, w.fabric].filter(Boolean).join(' · ')}
                to={`/work/${w.slug}`}
              />
            ))}
          </div>
          <div className="hc-section-foot">
            <p>Each piece here was cut to one person&apos;s measurements.</p>
            <MoreLink to="/work">See all work</MoreLink>
          </div>
        </Section>
      )}

      <ProcessBand
        title={d.how?.headline || undefined}
        lead={d.how?.intro || undefined}
        steps={howSteps}
        moreTo={d.how ? '/how-it-works' : undefined}
        edit={EDIT.how}
      />

      <CompanyBand
        title={d.company?.headline}
        lead={d.company?.intro || undefined}
        image={companyImg}
        to={cfg?.nav?.company ? '/company-orders' : '/contact?type=company'}
        edit={EDIT.company}
      />

      {d.about && (
        <Section tone="alt" labelledBy="home-about" className="hc-section--about" edit={EDIT.about}>
          <div className="hc-pagetop hc-pagetop--media">
            <SectionHead id="home-about" eyebrow="About" title={d.about.headline} lead={d.about.intro || undefined} split={false}>
              {mission && (
                <blockquote className="hc-mission" data-reveal="">
                  <p className="hc-eyebrow">{mission.title}</p>
                  <Rich html={mission.html} />
                </blockquote>
              )}
              <MoreLink to="/about">Our story</MoreLink>
            </SectionHead>
            {aboutImg ? (
              <HcImage {...aboutImg} sizes="(min-width: 1024px) 58vw, 100vw" ratio="4 / 3" />
            ) : (
              <PrintArt variant="adire" ratio="4 / 3" scale={1.4} className="hc-about-print" />
            )}
          </div>
        </Section>
      )}

      {shopOn && <Lookbook eyebrow="Ready to wear" title="In stock now." products={featured} formatNgn={formatNgn} />}

      <Testimonials eyebrow="What clients say" quotes={quotes} />

      {faqs.length > 0 && (
        <Section tone="paper" labelledBy="home-faqs" edit={EDIT.faqs}>
          <div className="hc-split hc-split--faq">
            <SectionHead
              id="home-faqs"
              eyebrow="Before you ask"
              title="Questions people ask first"
              lead="Anything else, send a message and we will get back to you."
              split={false}>
              {cfg?.nav?.faqs && <MoreLink to="/faqs">All questions</MoreLink>}
            </SectionHead>
            <div className="hc-faq-list">
              {faqs.map((f, i) => (
                <details key={f.id} className="hc-faq" open={i === 0}>
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

      <JournalGrid
        eyebrow="Journal"
        title="Stories from the cutting table"
        posts={journal}
        moreTo={cfg?.nav?.journal ? '/journal' : undefined}
        edit={EDIT.journal}
      />

      <ClosingAction
        eyebrow="Start here"
        title={d.contact?.headline || 'Tell us what you want to make.'}
        text={d.contact?.intro || 'Send a short message with the occasion and the date, and we will get back to you.'}
        primary={book}
        secondary={{ to: '/contact', label: 'Contact us' }}
        image={closingImg}
        print="ankara"
        edit={EDIT.contact}
      />
    </SiteLayout>
  )
}

export default HomePage
