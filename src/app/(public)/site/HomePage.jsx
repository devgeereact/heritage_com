import { useState } from 'react'
import SiteLayout from './SiteLayout'
import { useCatalogue, formatNgn } from './products'
import { useBlog, useTestimonials } from './content'
import { useShopEnabled } from './storeConfig'
import { useBusiness } from './business'
import { useSiteConfig, useSiteResource, toImage, clip } from './siteData'
import useActions from './ui/useActions'
import Hero from './ui/Hero'
import { Section, SectionHead } from './ui/Section'
import { WorkCard } from './ui/Card'
import Icon from './ui/Icon'
import { MoreLink, Rich } from './cmsBlocks'
import { Lookbook, Testimonials, JournalGrid, ServiceIndex } from './sections'
import { OrderPaths, ClothRun, MeasureDocket, StitchProcess, MissionBand, EnquiryBand } from './landing'
import { printAt, printVariant } from './ui/printPatterns'
import { EDIT, loadHome, homeStates, stepsOf, clothsOf, missionOf, madeToMeasureOf } from './homeMap'
import './landing.css'

/**
 * Home, "the cutting table" (D-031): a landing built only from published CMS
 * content. The sections, their order, their source and when each one shows
 * are defined once in homeMap.js (HOME_SECTIONS), which the Website hub also
 * lists for the owner. Order: hero slides, two ways to order (home page,
 * made-to-measure service, company page), the cloth (fabric story page),
 * services, the measurement docket, our work, how it works, our mission
 * (about page), the shop, reviews, questions, journal and enquire (contact
 * page, business details and the enquiry form). Signed-in staff see an Edit
 * control on each section that opens its editor.
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
  const show = homeStates(d, { quotes, journal, shopOn, products })
  const on = (k) => !!res.data && show[k]?.shown
  const proof = [business.area, business.hours].filter(Boolean).join(' · ')
  const featured = [...products].sort((a, b) => (b.premium ? 1 : 0) - (a.premium ? 1 : 0)).slice(0, 4)
  const book = { to: primary.to, label: primary.label }
  const companyTo = cfg?.nav?.company ? '/company-orders' : '/contact?type=company'

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

  const mtmService = madeToMeasureOf(services)
  const mtm = mtmService && {
    title: mtmService.title,
    summary: mtmService.summary,
    image: toImage(mtmService.hero),
    to: `/services/${mtmService.slug}`,
  }
  const firstCover = work.find((w) => w.cover?.url)?.cover
  const company = d.company && {
    headline: d.company.headline,
    intro: d.company.intro,
    image: toImage(d.company.hero) || toImage(firstCover),
  }
  const fabrics = d.fabrics && { ...d.fabrics, image: toImage(d.fabrics.hero) }

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

      {on('paths') && <OrderPaths lead={page?.body} mtm={mtm} company={company} companyTo={companyTo} edit={EDIT.home} />}

      {on('cloth') && <ClothRun page={fabrics} cloths={clothsOf(d.fabrics)} edit={EDIT.fabrics} />}

      {on('services') && (
        <Section labelledBy="home-services" className="hc-land" edit={EDIT.services}>
          <SectionHead
            id="home-services"
            eyebrow="Services"
            title={d.servicesIntro?.headline || 'Services, cut to measure'}
            lead={
              d.servicesIntro?.intro ||
              'Every piece is made for you. Prices depend on the cloth and the finish, so you get a written quote before any work starts.'
            }>
            <MoreLink to="/services">All services</MoreLink>
          </SectionHead>
          <ServiceIndex
            services={services.map((s, i) => ({
              to: `/services/${s.slug}`,
              title: s.title,
              summary: s.summary,
              meta: s.price_note || undefined,
              image: toImage(s.hero),
              print: printVariant(s.title, printAt(i)),
            }))}
          />
        </Section>
      )}

      {on('docket') && <MeasureDocket bookTo={book.to} bookLabel={book.label} />}

      {on('work') && (
        <Section tone="alt" labelledBy="home-work" className="hc-land" edit={EDIT.work}>
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

      {on('process') && (
        <StitchProcess
          title={d.how?.headline || undefined}
          lead={d.how?.intro || undefined}
          steps={stepsOf(d.how)}
          moreTo={d.how ? '/how-it-works' : undefined}
          edit={EDIT.how}
        />
      )}

      {on('mission') && <MissionBand about={d.about} mission={missionOf(d.about)} image={toImage(d.about?.hero)} edit={EDIT.about} />}

      {on('shop') && <Lookbook eyebrow="Ready to wear" title="In stock now." products={featured} formatNgn={formatNgn} />}

      {on('reviews') && <Testimonials eyebrow="What clients say" quotes={quotes} />}

      {on('faqs') && (
        <Section tone="paper" labelledBy="home-faqs" className="hc-land" edit={EDIT.faqs}>
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

      {on('journal') && (
        <JournalGrid
          eyebrow="Journal"
          title="Notes on cloth and craft"
          posts={journal}
          moreTo={cfg?.nav?.journal ? '/journal' : undefined}
          edit={EDIT.journal}
        />
      )}

      {on('enquire') && <EnquiryBand contact={d.contact} business={business} shopOn={shopOn} edit={EDIT.contact} />}
    </SiteLayout>
  )
}

export default HomePage
