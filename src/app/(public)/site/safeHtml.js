/**
 * Second line of defence for rich text from the CMS and the journal. The
 * server already cleans HTML on save (sanitize_html in _lib.php); this keeps
 * only a small allowlist in the browser too, so a gap on one side is not an
 * XSS on the other. No dependency: DOMParser builds an inert document
 * (scripts never run in it) and a fresh tree is copied out of it.
 *
 * Kept: p, br, strong, b, em, i, u, s, a, ul, ol, li, h2, h3, h4, blockquote,
 * hr, figure, figcaption. Attributes dropped except a[href] (http, https,
 * mailto, tel or a root-relative path); off-site links open safely.
 */
const TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'A',
  'UL',
  'OL',
  'LI',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
  'HR',
  'FIGURE',
  'FIGCAPTION',
])
const DROP_WITH_CONTENT = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'TEMPLATE',
  'NOSCRIPT',
  'SVG',
  'MATH',
  'FORM',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'BUTTON',
])

const safeHref = (href) => {
  const h = String(href || '').trim()
  if (/^(https?:|mailto:|tel:)/i.test(h)) return h
  // A backslash after the slash is read as a second slash by browsers ("/\evil.example").
  if (/^\/(?![/\\])/.test(h)) return h
  return null
}

const copy = (node, doc) => {
  if (node.nodeType === 3) return doc.createTextNode(node.nodeValue)
  if (node.nodeType !== 1) return null
  const tag = node.tagName.toUpperCase()
  if (DROP_WITH_CONTENT.has(tag)) return null
  const kids = Array.from(node.childNodes)
    .map((c) => copy(c, doc))
    .filter(Boolean)
  if (!TAGS.has(tag)) {
    const frag = doc.createDocumentFragment()
    kids.forEach((k) => frag.appendChild(k))
    return frag
  }
  const el = doc.createElement(tag.toLowerCase())
  if (tag === 'A') {
    const href = safeHref(node.getAttribute('href'))
    if (href) {
      el.setAttribute('href', href)
      if (/^https?:/i.test(href)) {
        el.setAttribute('target', '_blank')
        el.setAttribute('rel', 'noopener noreferrer')
      }
    }
  }
  kids.forEach((k) => el.appendChild(k))
  return el
}

/** Allowlisted HTML string, or '' outside a browser. */
export default function safeHtml(html) {
  if (!html || typeof window === 'undefined' || typeof DOMParser === 'undefined') return ''
  const src = new DOMParser().parseFromString(`<body>${String(html)}</body>`, 'text/html')
  const out = document.implementation.createHTMLDocument('')
  const box = out.createElement('div')
  Array.from(src.body.childNodes).forEach((n) => {
    const c = copy(n, out)
    if (c) box.appendChild(c)
  })
  return box.innerHTML
}
