import { describe, it, expect } from 'vitest'
import { HOME_SECTIONS, homeStates, clothsOf, missionOf, madeToMeasureOf, stepsOf } from '@/app/(public)/site/homeMap'

/* Synthetic CMS content only (no real records). */
const page = (body, extra = {}) => ({ headline: 'Heading', intro: 'Intro', body, ...extra })

const full = {
  page: page('<p>Lead.</p>'),
  slides: [{ headline: 'One' }, { headline: 'Two' }],
  services: [
    { slug: 'gifting', title: 'Gifting' },
    { slug: 'made-to-measure', title: 'Made to measure' },
  ],
  company: page('<p>For teams.</p>'),
  fabrics: page('<h2>Ankara</h2><p>Wax print.</p><h2>Adire</h2><p>Indigo.</p>'),
  how: page('<h2>Ask</h2><p>Send a message.</p><h2>Measure</h2><p>We meet.</p>'),
  about: page('<p>Story.</p><h2>Our mission</h2><p>Celebrate heritage.</p>'),
  work: [{ slug: 'w1' }],
  faqs: [{ id: 1 }],
  contact: page('<p>Write to us.</p>'),
}

describe('HOME_SECTIONS', () => {
  it('lists every Home section once, in page order, each with a source and a state rule', () => {
    const keys = HOME_SECTIONS.map((s) => s.key)
    expect(keys).toEqual([
      'hero',
      'paths',
      'cloth',
      'services',
      'docket',
      'work',
      'process',
      'mission',
      'shop',
      'reviews',
      'faqs',
      'journal',
      'enquire',
    ])
    expect(new Set(keys).size).toBe(keys.length)
    HOME_SECTIONS.forEach((s) => {
      expect(s.source).toBeTruthy()
      expect(typeof s.state).toBe('function')
    })
  })

  it('links every CMS-fed section to a Website or Content editor', () => {
    HOME_SECTIONS.filter((s) => s.edit).forEach((s) => expect(s.edit.to).toMatch(/^\/(website|content)/))
  })
})

describe('homeStates', () => {
  it('shows every content section when everything is published', () => {
    const st = homeStates(full, { quotes: [{ text: 'x' }], journal: [{ slug: 'p' }], shopOn: false, products: [] })
    ;['hero', 'paths', 'cloth', 'services', 'docket', 'work', 'process', 'mission', 'reviews', 'faqs', 'journal', 'enquire'].forEach((k) =>
      expect(st[k].shown, k).toBe(true),
    )
    expect(st.shop.shown).toBe(false)
    expect(st.cloth.note).toBe('2 cloths')
    expect(st.hero.note).toBe('2 slides')
  })

  it('hides sections whose content is missing and says what brings them back', () => {
    const st = homeStates({}, {})
    ;['hero', 'paths', 'cloth', 'services', 'work', 'mission', 'shop', 'reviews', 'faqs', 'journal'].forEach((k) => {
      expect(st[k].shown, k).toBe(false)
      expect(st[k].note.length, k).toBeGreaterThan(0)
    })
    // Fixed explanations and the closing form stay on the page.
    expect(st.docket.shown).toBe(true)
    expect(st.process.shown).toBe(true)
    expect(st.enquire.shown).toBe(true)
  })

  it('hides the cloth when the fabric page has no "## Fabric" headings', () => {
    expect(homeStates({ fabrics: page('<p>No headings.</p>') }).cloth.shown).toBe(false)
  })

  it('shows the shop only while it is switched on and has products', () => {
    expect(homeStates({}, { shopOn: true, products: [{}] }).shop.shown).toBe(true)
    expect(homeStates({}, { shopOn: false, products: [{}] }).shop.shown).toBe(false)
  })
})

describe('content helpers', () => {
  it('reads cloths, steps and the mission from page bodies', () => {
    expect(clothsOf(full.fabrics).map((c) => c.title)).toEqual(['Ankara', 'Adire'])
    expect(stepsOf(full.how)).toEqual([
      { title: 'Ask', desc: 'Send a message.' },
      { title: 'Measure', desc: 'We meet.' },
    ])
    expect(missionOf(full.about)?.title).toBe('Our mission')
    expect(missionOf(page('<p>None.</p>'))).toBeNull()
  })

  it('picks the made-to-measure service by slug, else the first', () => {
    expect(madeToMeasureOf(full.services).slug).toBe('made-to-measure')
    expect(madeToMeasureOf([{ slug: 'gifting' }]).slug).toBe('gifting')
    expect(madeToMeasureOf([])).toBeNull()
  })
})
