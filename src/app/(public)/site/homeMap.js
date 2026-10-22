/**
 * The Home page, section by section: what each section shows, which Website
 * editor fills it, and whether it is on the page right now. HomePage.jsx
 * renders from this map and the Website hub (admin) lists it, so the two can
 * never disagree about which CMS content reaches the landing page.
 *
 * Pure apart from `loadHome` (network) and `splitSections` (DOMParser).
 */
import heritApi from '@/helpers/heritApi'
import { loadSiteConfig, previewItem } from './siteData'
import { splitSections, htmlText } from './storySections'

/* Where the staff Edit control on each Home section leads (Website admin). */
export const EDIT = {
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
  testimonials: { to: '/content', label: 'testimonials' },
  contact: { to: '/website/pages/contact', label: 'the contact page' },
  profile: { to: '/website/profile', label: 'business details' },
}

/** "## Heading" sections of a page body as process steps ({title, desc}). */
export const stepsOf = (page) => splitSections(page?.body).sections.map((s) => ({ title: s.title, desc: htmlText(s.html) }))

/** The cloths of the fabric story: one per "## Fabric" section ({title, html}). */
export const clothsOf = (page) => splitSections(page?.body).sections

/** The about page's "## Our mission" section, or null. */
export const missionOf = (page) => splitSections(page?.body).sections.find((x) => /mission/i.test(x.title)) || null

/** The made-to-measure service (by slug, else the first service), or null. */
export const madeToMeasureOf = (services = []) =>
  (services || []).find((s) => /made-to-measure|bespoke/.test(s.slug || '')) || (services || [])[0] || null

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
export const loadHome = async (preview = false) => {
  const published = (await loadSiteConfig()).pages || []
  const [home, company, how, about, fabrics, servicesIntro, contact] = await Promise.all([
    heritApi.site.home(),
    ...['company', 'how_it_works', 'about', 'fabrics', 'services_intro', 'contact'].map((k) => pageOrNull(k, published)),
  ])
  const page = preview ? await previewItem('page', { key: 'home' }) : home?.page || null
  return { ...home, page, company, how, about, fabrics, servicesIntro, contact }
}

const n = (list) => (Array.isArray(list) ? list.length : 0)
const plural = (k, one, many = `${one}s`) => `${k} ${k === 1 ? one : many}`

/**
 * Every Home section in page order. `state(d, ctx)` answers {shown, note}:
 * `d` is loadHome()'s result, `ctx` is {quotes, journal, shopOn, products}.
 * A hidden section names what would bring it back.
 */
export const HOME_SECTIONS = [
  {
    key: 'hero',
    label: 'Hero',
    source: 'Hero slides, else the home page and services that have a photograph',
    edit: EDIT.slides,
    state: (d) => {
      const own = n(d.slides)
      if (own) return { shown: true, note: plural(own, 'slide') }
      return d.page?.headline
        ? { shown: true, note: 'Made from the home page and services (no slides of your own yet)' }
        : { shown: false, note: 'Publish the home page or add a hero slide' }
    },
  },
  {
    key: 'paths',
    label: 'Two ways to order',
    source: 'Home page text, the made-to-measure service and the company orders page',
    edit: EDIT.home,
    state: (d) => {
      const parts = [madeToMeasureOf(d.services) && 'made to measure', d.company && 'company orders'].filter(Boolean)
      return parts.length
        ? { shown: true, note: `Shows ${parts.join(' and ')}` }
        : { shown: false, note: 'Publish a service or the company orders page' }
    },
  },
  {
    key: 'cloth',
    label: 'The cloth',
    source: 'Fabric story page: one panel per "## Fabric" heading',
    edit: EDIT.fabrics,
    state: (d) => {
      if (!d.fabrics) return { shown: false, note: 'Publish the fabric story page' }
      const k = n(clothsOf(d.fabrics))
      return k ? { shown: true, note: plural(k, 'cloth') } : { shown: false, note: 'Add "## Fabric" headings to the page body' }
    },
  },
  {
    key: 'services',
    label: 'Services',
    source: 'Services, with the services introduction page as the heading',
    edit: EDIT.services,
    state: (d) => (n(d.services) ? { shown: true, note: plural(n(d.services), 'service') } : { shown: false, note: 'Publish a service' }),
  },
  {
    key: 'docket',
    label: 'The measurement appointment',
    source: 'Fixed explanation with example values (not edited in the CMS)',
    edit: null,
    state: () => ({ shown: true, note: 'Always shown' }),
  },
  {
    key: 'work',
    label: 'Our work',
    source: 'Our work projects',
    edit: EDIT.work,
    state: (d) =>
      n(d.work)
        ? { shown: true, note: plural(n(d.work), 'project') }
        : { shown: false, note: 'Publish a work project (with the client’s permission)' },
  },
  {
    key: 'process',
    label: 'How it works',
    source: 'How it works page: one step per "## Step" heading, else the standard four steps',
    edit: EDIT.how,
    state: (d) => {
      const k = n(stepsOf(d.how))
      return { shown: true, note: k ? `${plural(k, 'step')} from the page` : 'The standard four steps' }
    },
  },
  {
    key: 'mission',
    label: 'Our mission',
    source: 'About page: its "## Our mission" section, headline and photograph',
    edit: EDIT.about,
    state: (d) => {
      if (!d.about) return { shown: false, note: 'Publish the about page' }
      return missionOf(d.about)
        ? { shown: true, note: 'Mission and about link' }
        : { shown: true, note: 'About link only (add an "## Our mission" heading for the quote)' }
    },
  },
  {
    key: 'shop',
    label: 'In stock now',
    source: 'Shop products (only while the shop is switched on)',
    edit: null,
    state: (d, ctx = {}) =>
      ctx.shopOn && n(ctx.products)
        ? { shown: true, note: plural(Math.min(4, n(ctx.products)), 'piece') }
        : { shown: false, note: 'The shop is off' },
  },
  {
    key: 'reviews',
    label: 'What clients say',
    source: 'Published testimonials with the client’s permission',
    edit: EDIT.testimonials,
    state: (d, ctx = {}) =>
      n(ctx.quotes) ? { shown: true, note: plural(n(ctx.quotes), 'review') } : { shown: false, note: 'Publish a consented testimonial' },
  },
  {
    key: 'faqs',
    label: 'Questions',
    source: 'Questions marked "Show on Home" (up to four; all of them on the Questions page)',
    edit: EDIT.faqs,
    state: (d) =>
      n(d.faqs) ? { shown: true, note: plural(n(d.faqs), 'question') } : { shown: false, note: 'Publish a question and tick Show on Home' },
  },
  {
    key: 'journal',
    label: 'Journal',
    source: 'Journal posts (while the journal is switched on)',
    edit: EDIT.journal,
    state: (d, ctx = {}) =>
      n(ctx.journal)
        ? { shown: true, note: plural(Math.min(3, n(ctx.journal)), 'post') }
        : { shown: false, note: 'Publish a post and switch the journal on' },
  },
  {
    key: 'enquire',
    label: 'Enquire',
    source: 'Contact page text, business details and the enquiry form',
    edit: EDIT.contact,
    state: (d) => ({ shown: true, note: d.contact ? 'Contact page text' : 'Standard text (publish the contact page to change it)' }),
  },
]

/** {key: {shown, note}} for every Home section. */
export const homeStates = (d, ctx = {}) => Object.fromEntries(HOME_SECTIONS.map((s) => [s.key, s.state(d || {}, ctx)]))
