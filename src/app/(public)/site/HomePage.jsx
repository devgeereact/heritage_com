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
import { MoreLink, Rich } from './cmsBlocks'
import { Lookbook, Testimonials, JournalGrid, ClosingAction, PromiseBand, ProcessBand, CompanyBand } from './sections'

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
 * Home and the three pages it previews (company, how it works, about). In
 * preview mode the home page itself comes from its draft; the rest stays
 * published, as visitors would see it.
 */
const loadHome = async (preview) => {
  const published = (await loadSiteConfig()).pages || []
  const [home, company, how, about] = await Promise.all([
    heritApi.site.home(),
    pageOrNull('company', published),
    pageOrNull('how_it_works', published),
    pageOrNull('about', published),
  ])
  const page = preview ? await previewItem('page', { key: 'home' }) : home?.page || null
  return { ...home, page, company, how, about }
}

/**
 * Home (BUILD-SPEC 4.7). Sections in a fixed order, each hidden while its
 * content is unpublished or empty: hero, services, company band, our work,
 * how it works, owner note, reviews, questions, final action. The hero and
 * the final action always show; without a published home page the hero is
 * text only, with the business name as its headline.
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
  // About falls back to a published service photograph so the band is never a lone heading.
  const aboutImg = toImage(d.about?.hero) || toImage(services.filter((s) => s.hero?.url)[1]?.hero || services.find((s) => s.hero?.url)?.hero)
  const proof = [business.area, business.hours].filter(Boolean).join(' · ')
  const featured = [...products].sort((a, b) => (b.premium ? 1 : 0) - (a.premium ? 1 : 0)).slice(0, 4)
  const book = { to: primary.to, label: primary.label }

  // Hero slides come from published content only (D-023): the home page
  // first, then up to four services that have a photograph.
  // Owner-made slides (Website > Hero slides) win; without any, the slides are built automatically below.
  const ownSlides = (d.slides || []).map((s) => ({
    label: s.label || s.headline,
    eyebrow: s.eyebrow || undefined,
    title: s.headline,
    lead: s.lead || undefined,
    image: toImage(s.hero),
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
      .map((s) => ({
        label: s.title,
        eyebrow: 'What I make',
        title: s.title,
        lead: s.summary,
        image: toImage(s.hero),
        primary: { to: `/services/${s.slug}`, label: 'View service' },
        secondary: { to: book.to, label: primary.short || primary.label },
      })),
  ]
  const slides = ownSlides.length ? ownSlides : autoSlides
  const firstCover = work.find((w) => w.cover?.url)?.cover
  const companyImg = toImage(d.company?.hero) || toImage(firstCover)
  const closingImg = toImage(page?.hero)
  const statement = `${business.name || 'Herit Clothing'} is a tailoring workroom${business.area ? ` in ${business.area}` : ''}. I make men's clothing to your measurements and keep you posted at every step, from the first fitting to handover.`

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
      <Hero slides={slides} note={proof || undefined} />

      <PromiseBand eyebrow="The Herit way" statement={statement}>
        {page?.body ? <Rich html={page.body} className="hc-promise-statement" /> : null}
      </PromiseBand>

      {services.length > 0 && (
        <Section labelledBy="home-services">
          <SectionHead
            id="home-services"
            eyebrow="What I make"
            title="Services, cut to measure"
            lead="Every piece is made for you. Prices depend on the cloth and the finish, so you get a written quote before any work starts.">
            <MoreLink to="/services">All services</MoreLink>
          </SectionHead>
          <div className="hc-grid hc-grid--3">
            {services.map((s) => (
              <ServiceCard
                key={s.slug}
                image={toImage(s.hero)}
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
        <Section tone="alt" labelledBy="home-work">
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

      <ProcessBand title={d.how?.headline || undefined} lead={d.how?.intro || undefined} moreTo={d.how ? '/how-it-works' : undefined} />

      <CompanyBand
        title={d.company?.headline}
        lead={d.company?.intro || undefined}
        image={companyImg}
        to={cfg?.nav?.company ? '/company-orders' : '/contact?type=company'}
      />

      {d.about && (
        <Section tone="alt" labelledBy="home-about">
          <div className={`hc-pagetop ${aboutImg ? 'hc-pagetop--media' : ''}`.trim()}>
            <SectionHead id="home-about" eyebrow="About" title={d.about.headline} lead={d.about.intro || undefined} split={false}>
              <MoreLink to="/about">More about me</MoreLink>
            </SectionHead>
            {aboutImg && <HcImage {...aboutImg} sizes="(min-width: 1024px) 58vw, 100vw" ratio="4 / 3" />}
          </div>
        </Section>
      )}

      {shopOn && <Lookbook eyebrow="Ready to wear" title="In stock now." products={featured} formatNgn={formatNgn} />}

      <Testimonials eyebrow="What clients say" quotes={quotes} />

      {faqs.length > 0 && (
        <Section tone="paper" labelledBy="home-faqs">
          <div className="hc-split hc-split--faq">
            <SectionHead
              id="home-faqs"
              eyebrow="Before you ask"
              title="Questions people ask first"
              lead="Anything else, send a message and I will get back to you."
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
  )
}

export default HomePage
