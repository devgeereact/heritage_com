/**
 * Split CMS rich text into sections at its headings, so a page body written in
 * the Website editor ("## Our mission" lines) can be laid out as bands, cards
 * or steps without new CMS fields. Pure apart from DOMParser (browser and
 * jsdom); the HTML is passed through safeHtml() first, so only allowlisted
 * markup is ever split or rendered.
 *
 *   splitSections('<p>Lead</p><h2>A</h2><p>x</p>')
 *   -> { lead: '<p>Lead</p>', sections: [{ title: 'A', html: '<p>x</p>' }] }
 */
import safeHtml from './safeHtml'

const serialise = (nodes) => {
  const box = document.createElement('div')
  nodes.forEach((n) => box.appendChild(n.cloneNode(true)))
  return box.innerHTML.trim()
}

/** { lead, sections: [{ title, html }] } split at every `tag` heading (h2 by default). */
export const splitSections = (html, tag = 'h2') => {
  const clean = html ? safeHtml(html) : ''
  if (!clean || typeof DOMParser === 'undefined') return { lead: clean || '', sections: [] }
  const doc = new DOMParser().parseFromString(`<body>${clean}</body>`, 'text/html')
  const lead = []
  const sections = []
  let cur = null
  Array.from(doc.body.childNodes).forEach((n) => {
    if (n.nodeType === 1 && n.tagName.toLowerCase() === tag) {
      cur = { title: n.textContent.trim(), nodes: [] }
      sections.push(cur)
      return
    }
    if (n.nodeType === 3 && !n.nodeValue.trim()) return
    ;(cur ? cur.nodes : lead).push(n)
  })
  return {
    lead: serialise(lead),
    sections: sections.filter((s) => s.title).map((s) => ({ title: s.title, html: serialise(s.nodes) })),
  }
}

/** Plain text of a short HTML fragment (for card copy and leads). */
export const htmlText = (html) => {
  if (!html) return ''
  if (typeof DOMParser === 'undefined')
    return String(html)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  // Blocks are joined with a space, so "<p>One.</p><p>Two.</p>" reads "One. Two.".
  const body = new DOMParser().parseFromString(`<body>${safeHtml(html)}</body>`, 'text/html').body
  return Array.from(body.childNodes)
    .map((n) => n.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Does this section hold its own sub-headings (h3), so it reads as a set of cards? */
export const hasSubheads = (html) => /<h3[\s>]/i.test(String(html || ''))
