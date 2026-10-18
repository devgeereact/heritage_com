import { describe, it, expect } from 'vitest'
import safeHtml from '@/app/(public)/site/safeHtml'

const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'A', 'UL', 'OL', 'LI', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'HR', 'FIGURE', 'FIGCAPTION'])

/** Parse the sanitiser's output into an element tree for structural checks. */
const parse = (html) => {
  const box = document.createElement('div')
  box.innerHTML = html
  return box
}

/** Every rule that must hold for any output, however hostile the input. */
const expectClean = (html) => {
  parse(html)
    .querySelectorAll('*')
    .forEach((el) => {
      expect(ALLOWED_TAGS.has(el.tagName), `tag ${el.tagName} survived`).toBe(true)
      Array.from(el.attributes).forEach((a) => {
        expect(['href', 'target', 'rel'], `attribute ${a.name} survived on ${el.tagName}`).toContain(a.name)
      })
      if (el.hasAttribute('href')) {
        expect(el.getAttribute('href')).toMatch(/^(https?:|mailto:|tel:|\/(?!\/))/i)
      }
    })
  expect(html.toLowerCase()).not.toContain('<script')
  expect(html.toLowerCase()).not.toContain('onerror')
  expect(html.toLowerCase()).not.toMatch(/\son\w+=/)
}

describe('safeHtml: what is kept', () => {
  it('keeps plain formatting', () => {
    const html = '<h2>Title</h2><p>One <strong>two</strong> <em>three</em></p><ul><li>a</li><li>b</li></ul><blockquote>q</blockquote>'
    expect(safeHtml(html)).toBe(html)
  })

  it('keeps https, mailto, tel and root-relative links, and opens only off-site links in a new tab safely', () => {
    const out = parse(safeHtml('<a href="https://example.com/x">a</a><a href="mailto:hello@heritclothing.com">b</a><a href="tel:+2348000000000">c</a><a href="/contact">d</a>'))
    const [web, mail, tel, local] = out.querySelectorAll('a')
    expect(web.getAttribute('href')).toBe('https://example.com/x')
    expect(web.getAttribute('target')).toBe('_blank')
    expect(web.getAttribute('rel')).toBe('noopener noreferrer')
    expect(mail.getAttribute('href')).toBe('mailto:hello@heritclothing.com')
    expect(mail.hasAttribute('target')).toBe(false)
    expect(tel.getAttribute('href')).toBe('tel:+2348000000000')
    expect(local.getAttribute('href')).toBe('/contact')
    expect(local.hasAttribute('target')).toBe(false)
  })

  it('returns an empty string for empty input', () => {
    expect(safeHtml('')).toBe('')
    expect(safeHtml(null)).toBe('')
    expect(safeHtml(undefined)).toBe('')
  })

  it('keeps text that merely looks like markup as escaped text', () => {
    const out = safeHtml('<p>1 &lt; 2 &amp; &lt;script&gt;alert(1)&lt;/script&gt;</p>')
    expect(out).toContain('&lt;script&gt;')
    expect(parse(out).querySelector('script')).toBeNull()
    expect(parse(out).textContent).toBe('1 < 2 & <script>alert(1)</script>')
  })
})

describe('safeHtml: hostile input does not survive', () => {
  it('drops script elements together with their content', () => {
    const out = safeHtml('<p>ok</p><script>alert(1)</script>')
    expect(out).toBe('<p>ok</p>')
  })

  it.each([
    ['javascript: link', '<a href="javascript:alert(1)">x</a>'],
    ['javascript: link, mixed case and padding', '<a href="  JaVaScRiPt:alert(1)">x</a>'],
    ['javascript: link split by an encoded newline', '<a href="java&#x0A;script:alert(1)">x</a>'],
    ['javascript: link split by an encoded tab', '<a href="jav&#9;ascript:alert(1)">x</a>'],
    ['vbscript: link', '<a href="vbscript:msgbox(1)">x</a>'],
    ['data: link', '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>'],
    ['protocol-relative link', '<a href="//evil.example/steal">x</a>'],
    ['backslash host link', '<a href="/\\evil.example">x</a>'],
  ])('removes the href from a %s but keeps the link text', (_name, input) => {
    const out = safeHtml(input)
    const a = parse(out).querySelector('a')
    expect(a).not.toBeNull()
    expect(a.hasAttribute('href')).toBe(false)
    expect(a.textContent).toBe('x')
    expectClean(out)
  })

  it('strips event handler and style attributes from allowed tags', () => {
    const out = safeHtml('<p onmouseover="steal()" style="position:fixed" class="x" id="y">hi</p><a href="https://a.example" onclick="steal()" style="x">l</a>')
    expect(out).not.toContain('onmouseover')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('style')
    expect(out).not.toContain('class')
    expect(parse(out).querySelector('p').attributes).toHaveLength(0)
    expectClean(out)
  })

  it('removes an image with an error handler entirely', () => {
    const out = safeHtml('<p>a<img src="x" onerror="alert(1)">b</p>')
    expect(out).toBe('<p>ab</p>')
  })

  it.each([
    ['iframe', '<iframe src="https://evil.example"></iframe>after'],
    ['object', '<object data="x.swf"></object>after'],
    ['embed', '<embed src="x.swf">after'],
    ['svg with script', '<svg onload="alert(1)"><script>alert(2)</script></svg>after'],
    ['math', '<math><mi>x</mi></math>after'],
    ['style block', '<style>body{display:none}</style>after'],
    ['form with input and button', '<form action="https://evil.example"><input name="pw"><button>Go</button></form>after'],
    ['textarea', '<textarea>secret</textarea>after'],
    ['template', '<template><script>alert(1)</script></template>after'],
  ])('drops %s and its content', (_name, input) => {
    const out = safeHtml(input)
    expect(out).toBe('after')
  })

  it('unwraps unknown wrapper tags but keeps their safe text', () => {
    expect(safeHtml('<div><span>hello <b>there</b></span></div>')).toBe('hello <b>there</b>')
  })

  it('does not let a noscript or comment trick reintroduce markup', () => {
    const inputs = [
      '<noscript><p title="</noscript><img src=x onerror=alert(1)>">hi</p></noscript>',
      '<!--><img src=x onerror=alert(1)>-->',
      '<p><!-- <script>alert(1)</script> --></p>',
      '<scr<script>ipt>alert(1)</scr</script>ipt>',
      '<<script>script>alert(1)<</script>/script>',
    ]
    inputs.forEach((input) => expectClean(safeHtml(input)))
  })

  it('leaves nothing dangerous after a mixed payload', () => {
    const out = safeHtml(
      '<h2 onclick="x()">T</h2><p>a<script>alert(1)</script><a href="javascript:alert(2)" target="_self">b</a>' +
        '<img src=x onerror=alert(3)><iframe srcdoc="<script>alert(4)</script>"></iframe></p><a href="https://ok.example">c</a>',
    )
    expectClean(out)
    expect(out).toContain('https://ok.example')
  })

  it('does not execute anything while sanitising', () => {
    globalThis.__xss = 0
    safeHtml('<img src=x onerror="globalThis.__xss=1"><script>globalThis.__xss=1</script>')
    expect(globalThis.__xss).toBe(0)
    delete globalThis.__xss
  })
})
