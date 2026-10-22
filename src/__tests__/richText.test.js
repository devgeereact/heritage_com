import { describe, it, expect } from 'vitest'
import { textToHtml, htmlToText } from '@/helpers/richText'

const parse = (html) => {
  const box = document.createElement('div')
  box.innerHTML = html
  return box
}

describe('textToHtml', () => {
  it('turns blank lines into paragraphs and single newlines into line breaks', () => {
    expect(textToHtml('First\nsecond\n\nThird')).toBe('<p>First<br>second</p>\n<p>Third</p>')
  })

  it('builds headings and bulleted lists', () => {
    expect(textToHtml('## Fabric')).toBe('<h2>Fabric</h2>')
    expect(textToHtml('### Care')).toBe('<h3>Care</h3>')
    expect(textToHtml('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>')
    expect(textToHtml('* one\n* two')).toBe('<ul><li>one</li><li>two</li></ul>')
  })

  it('treats a mixed block as a paragraph, not a list', () => {
    expect(textToHtml('- one\nplain')).toBe('<p>- one<br>plain</p>')
  })

  it('handles Windows line endings and empty input', () => {
    expect(textToHtml('a\r\n\r\nb')).toBe('<p>a</p>\n<p>b</p>')
    expect(textToHtml('')).toBe('')
    expect(textToHtml(null)).toBe('')
    expect(textToHtml('   \n\n  ')).toBe('')
  })

  it('escapes HTML typed by the owner so it shows as text', () => {
    const html = textToHtml('<script>alert(1)</script> & "quotes"')
    expect(html).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;</p>')
    expect(parse(html).querySelector('script')).toBeNull()
  })

  it('makes links only for https, http, mailto, tel and root-relative paths', () => {
    expect(textToHtml('[Shop](https://heritclothing.com/shop)')).toBe('<p><a href="https://heritclothing.com/shop">Shop</a></p>')
    expect(textToHtml('[Mail](mailto:hello@heritclothing.com)')).toContain('<a href="mailto:hello@heritclothing.com">Mail</a>')
    expect(textToHtml('[Call](tel:+2348000000000)')).toContain('<a href="tel:+2348000000000">Call</a>')
    expect(textToHtml('[Book](/book)')).toBe('<p><a href="/book">Book</a></p>')
  })

  it.each([
    ['javascript:', '[x](javascript:alert(1))'],
    ['uppercase JAVASCRIPT:', '[x](JAVASCRIPT:alert(1))'],
    ['data:', '[x](data:text/html,hi)'],
    ['protocol-relative', '[x](//evil.example)'],
    ['backslash host (browsers read it as //)', '[x](/\\evil.example)'],
  ])('does not turn a %s URL into a link', (_name, input) => {
    expect(parse(textToHtml(input)).querySelector('a')).toBeNull()
  })

  it('keeps a quote in the URL inside the attribute so no handler can be injected', () => {
    const html = textToHtml('[x](https://a.example/"onmouseover="alert(1))')
    const a = parse(html).querySelector('a')
    expect(a).not.toBeNull()
    expect(Array.from(a.attributes).map((x) => x.name)).toEqual(['href'])
  })

  it('writes an ampersand in a URL as an entity so the attribute stays valid', () => {
    expect(textToHtml('[x](https://a.example/?a=1&b=2)')).toBe('<p><a href="https://a.example/?a=1&amp;b=2">x</a></p>')
  })
})

describe('htmlToText', () => {
  it('returns an empty string for empty input', () => {
    expect(htmlToText('')).toBe('')
    expect(htmlToText(null)).toBe('')
  })

  it('turns stored HTML back into the simple format', () => {
    const html = '<h2>Fabric</h2><p>Line one<br>line two</p><ul><li>a</li><li>b</li></ul><p>See <a href="/book">booking</a></p>'
    expect(htmlToText(html)).toBe('## Fabric\n\nLine one\nline two\n\n- a\n- b\n\nSee [booking](/book)')
  })

  it('round-trips the owner format', () => {
    const text = '## Our cloth\n\nFirst line\nsecond line\n\n- one\n- two\n\nVisit [us](https://heritclothing.com/contact)'
    expect(htmlToText(textToHtml(text))).toBe(text)
  })

  it('flattens tags it does not know to plain text', () => {
    expect(htmlToText('<p>plain <strong>bold</strong> text</p>')).toBe('plain bold text')
  })
})
