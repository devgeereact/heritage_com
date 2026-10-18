import { describe, it, expect } from 'vitest'
import { mediaUrl, toImage, clip } from '@/app/(public)/site/siteData'
import { API_BASE } from '@/context/constants'

describe('mediaUrl', () => {
  it('prefixes a root-relative upload with the API host', () => {
    expect(mediaUrl('/uploads/site/a.jpg')).toBe(`${API_BASE}/uploads/site/a.jpg`)
  })

  it('leaves an absolute URL alone', () => {
    expect(mediaUrl('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg')
    expect(mediaUrl('HTTP://cdn.example/a.jpg')).toBe('HTTP://cdn.example/a.jpg')
  })

  it('gives an empty string for nothing', () => {
    expect(mediaUrl('')).toBe('')
    expect(mediaUrl(null)).toBe('')
  })
})

describe('toImage', () => {
  it('returns null when the image has no url, so no section renders from nothing', () => {
    expect(toImage(null)).toBeNull()
    expect(toImage({})).toBeNull()
    expect(toImage({ url: '' })).toBeNull()
  })

  it('builds the source, srcset, alt and size', () => {
    const img = toImage({
      url: '/uploads/site/a.jpg',
      srcset: [{ url: '/uploads/site/a-480.webp', width: 480 }, { url: '/uploads/site/a-960.webp', width: 960 }],
      width: 1200,
      height: 800,
      alt: 'Agbada front',
    })
    expect(img.src).toBe(`${API_BASE}/uploads/site/a.jpg`)
    expect(img.webp).toBe(`${API_BASE}/uploads/site/a-480.webp 480w, ${API_BASE}/uploads/site/a-960.webp 960w`)
    expect(img.alt).toBe('Agbada front')
    expect(img.width).toBe(1200)
    expect(img.height).toBe(800)
  })

  it('defaults alt to empty and drops zero or missing sizes and an empty srcset', () => {
    const img = toImage({ url: '/u/a.jpg', srcset: [], width: 0, height: null })
    expect(img.alt).toBe('')
    expect(img.webp).toBeUndefined()
    expect(img.width).toBeUndefined()
    expect(img.height).toBeUndefined()
  })

  it('lets the caller add or override props', () => {
    expect(toImage({ url: '/u/a.jpg' }, { loading: 'lazy' }).loading).toBe('lazy')
  })
})

describe('clip (meta descriptions)', () => {
  it('returns short text unchanged', () => {
    expect(clip('Bespoke agbada in Lagos.')).toBe('Bespoke agbada in Lagos.')
  })

  it('strips tags and collapses whitespace before measuring', () => {
    expect(clip('<p>One   two\n\nthree</p><br><strong>four</strong>')).toBe('One two three four')
  })

  it('cuts at a word boundary, adds an ellipsis and stays within the limit', () => {
    const text = 'tailoring '.repeat(40)
    const out = clip(text, 100)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(101)
    expect(out.slice(0, -1)).toMatch(/tailoring$/)
  })

  it('does not leave trailing punctuation before the ellipsis', () => {
    const text = `${'word '.repeat(20)}end, ${'more '.repeat(40)}`
    const out = clip(text, 106)
    expect(out).not.toMatch(/[,.;:\s]…$/)
  })

  it('cuts hard when there is no sensible space to cut at', () => {
    const out = clip('a'.repeat(300), 155)
    expect(out).toBe(`${'a'.repeat(155)}…`)
  })

  it('treats missing text as empty', () => {
    expect(clip(undefined)).toBe('')
    expect(clip(null)).toBe('')
  })
})
