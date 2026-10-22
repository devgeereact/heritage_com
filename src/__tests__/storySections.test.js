import { describe, it, expect } from 'vitest'
import { splitSections, htmlText, hasSubheads } from '@/app/(public)/site/storySections'

describe('splitSections', () => {
  it('splits a page body at its h2 headings, keeping the lead', () => {
    const r = splitSections('<p>Lead.</p>\n<h2>Our mission</h2>\n<p>Celebrate heritage.</p>\n<h2>Our vision</h2>\n<p>Worn with pride.</p>')
    expect(r.lead).toBe('<p>Lead.</p>')
    expect(r.sections).toEqual([
      { title: 'Our mission', html: '<p>Celebrate heritage.</p>' },
      { title: 'Our vision', html: '<p>Worn with pride.</p>' },
    ])
  })

  it('splits at h3 when asked, for card items', () => {
    const r = splitSections('<h3>01 Source</h3><p>With respect.</p><h3>02 Design</h3><p>For now.</p>', 'h3')
    expect(r.sections.map((s) => s.title)).toEqual(['01 Source', '02 Design'])
  })

  it('cleans the HTML first, so scripts and handlers never survive', () => {
    const r = splitSections('<h2>A</h2><p onclick="x()">Hi<script>alert(1)</script></p>')
    expect(r.sections[0].html).toBe('<p>Hi</p>')
  })

  it('handles empty input and a body without headings', () => {
    expect(splitSections('')).toEqual({ lead: '', sections: [] })
    expect(splitSections(null)).toEqual({ lead: '', sections: [] })
    expect(splitSections('<p>Only text.</p>')).toEqual({ lead: '<p>Only text.</p>', sections: [] })
  })
})

describe('htmlText and hasSubheads', () => {
  it('gives the plain text of a fragment', () => {
    expect(htmlText('<p>Send an <strong>enquiry</strong>.</p>\n<p>We reply.</p>')).toBe('Send an enquiry. We reply.')
    expect(htmlText('<p>One.</p><p>Two.</p>')).toBe('One. Two.')
    expect(htmlText('')).toBe('')
  })

  it('knows when a section holds card items', () => {
    expect(hasSubheads('<h3>Item</h3><p>x</p>')).toBe(true)
    expect(hasSubheads('<p>Plain</p>')).toBe(false)
  })
})
