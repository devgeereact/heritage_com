// Simple formatting for website text, so the owner never types HTML.
//
//   A blank line starts a new paragraph.
//   "## Heading" is a heading; "- item" lines are a bulleted list.
//   [link text](https://example.com) is a link (https, mailto, tel or /path).
//
// textToHtml() builds the HTML the CMS stores (the server sanitises it again);
// htmlToText() turns stored HTML back into this format for editing. Bold,
// italics and other tags round-trip as plain text.

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const okHref = (h) => /^(https:\/\/|http:\/\/|mailto:|tel:|\/(?!\/))/i.test(h)

/** Inline text: escape, then turn [text](url) into links with safe URLs. */
const inline = (s) =>
  esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, href) => {
    const raw = href.replace(/&amp;/g, '&')
    return okHref(raw) ? `<a href="${esc(raw)}">${text}</a>` : m
  })

export function textToHtml(text) {
  const blocks = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
  return blocks
    .map((b) => {
      const lines = b.split('\n').map((l) => l.trim())
      if (lines.every((l) => /^[-*] /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`
      if (lines.length === 1 && /^### /.test(lines[0])) return `<h3>${inline(lines[0].slice(4))}</h3>`
      if (lines.length === 1 && /^## /.test(lines[0])) return `<h2>${inline(lines[0].slice(3))}</h2>`
      return `<p>${lines.map(inline).join('<br>')}</p>`
    })
    .join('\n')
}

/** Stored HTML back to simple formatting (browser only; '' elsewhere). */
export function htmlToText(html) {
  if (!html || typeof DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const text = (node) =>
    Array.from(node.childNodes)
      .map((n) => {
        if (n.nodeType === 3) return n.nodeValue.replace(/\s+/g, ' ')
        if (n.nodeType !== 1) return ''
        const tag = n.tagName.toLowerCase()
        if (tag === 'br') return '\n'
        if (tag === 'a') {
          const href = n.getAttribute('href') || ''
          return href ? `[${text(n).trim()}](${href})` : text(n)
        }
        return text(n)
      })
      .join('')
  const out = []
  Array.from(doc.body.childNodes).forEach((n) => {
    if (n.nodeType === 3) {
      if (n.nodeValue.trim()) out.push(n.nodeValue.trim())
      return
    }
    if (n.nodeType !== 1) return
    const tag = n.tagName.toLowerCase()
    if (tag === 'ul' || tag === 'ol') out.push(Array.from(n.querySelectorAll('li')).map((li) => `- ${text(li).trim()}`).join('\n'))
    else if (tag === 'h2') out.push(`## ${text(n).trim()}`)
    else if (tag === 'h3' || tag === 'h4') out.push(`### ${text(n).trim()}`)
    else out.push(text(n).trim().replace(/ *\n */g, '\n'))
  })
  return out.filter(Boolean).join('\n\n')
}
