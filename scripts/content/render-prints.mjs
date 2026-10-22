#!/usr/bin/env node
// Renders the African print illustrations for the website media library:
// hero slides, service cards and page images, composed from the same pattern
// tiles the site draws (src/app/(public)/site/ui/printPatterns.js) in the
// --hc-print-* token colours (read from src/assets/tokens/_tokens-map.scss).
// They are illustrations of cloth, never photographs of products or people.
//
//   node scripts/content/render-prints.mjs [--out DIR] [--only NAME,NAME]
//
// Needs Google Chrome (headless screenshot) and macOS `sips` (PNG to JPEG).
// Output: DIR/<name>.jpg (default scripts/content/.out/, gitignored) and
// DIR/manifest.json with each file's role, size and alt text, which
// scripts/content/load-real-content.php reads. No npm dependencies.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PRINT_PATTERNS } from '../../src/app/(public)/site/ui/printPatterns.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const args = process.argv.slice(2)
const arg = (k, d) => {
  const i = args.indexOf(k)
  return i >= 0 ? args[i + 1] : d
}
const OUT = resolve(arg('--out', join(ROOT, 'scripts/content/.out')))
const ONLY = (arg('--only', '') || '').split(',').filter(Boolean)
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/* ---- Colours from the token map (one source of truth) ---------------------- */
const scss = readFileSync(join(ROOT, 'src/assets/tokens/_tokens-map.scss'), 'utf8')
const block = scss.slice(scss.indexOf('$hc-print:'))
const C = {}
for (const m of block.slice(0, block.indexOf(');')).matchAll(/'print-([a-z]+)':\s*(#[0-9A-Fa-f]{6})/g)) C[m[1]] = m[2]
const site = scss.slice(scss.indexOf('$hc-site:'))
const INK = site.match(/'surface':\s*(#[0-9A-Fa-f]{6})/)[1]
const IVORY = site.match(/'text':\s*(#[0-9A-Fa-f]{6})/)[1]
const AMBER = site.match(/'accent':\s*(#[0-9A-Fa-f]{6})/)[1]
if (Object.keys(C).length < 10) throw new Error('Could not read the $hc-print map from _tokens-map.scss')

/* ---- SVG cloth --------------------------------------------------------------- */
let uid = 0
/** An SVG that fills its box with one print at `scale`. */
const cloth = (variant, scale = 2) => {
  const p = PRINT_PATTERNS[variant]
  const id = `p${++uid}`
  const [w, h] = p.size
  const shapes = p.shapes
    .map((s) =>
      s.t === 'rect'
        ? `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${C[s.fill]}"${s.o ? ` opacity="${s.o}"` : ''}/>`
        : `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${s.fill ? C[s.fill] : 'none'}"${s.stroke ? ` stroke="${C[s.stroke]}" stroke-width="${s.sw}"` : ''}${s.o ? ` opacity="${s.o}"` : ''}/>`,
    )
    .join('')
  return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse" patternTransform="scale(${scale})"><rect width="${w}" height="${h}" fill="${C[p.ground]}"/>${shapes}</pattern></defs><rect width="100%" height="100%" fill="url(#${id})"/></svg>`
}

/**
 * A piece of cloth: positioned, rotated, with a soft fold (light and shadow
 * across it) and a drop shadow so layered pieces read as fabric.
 */
const panel = (variant, { x, y, w, h, rot = 0, scale = 2, r = 18, fold = 'diag', z = 1 }) => {
  const folds = {
    diag: `linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.28) 62%, rgba(0,0,0,0.05) 100%)`,
    drape: `linear-gradient(90deg, rgba(0,0,0,0.32) 0%, rgba(255,255,255,0.06) 22%, rgba(0,0,0,0.22) 45%, rgba(255,255,255,0.08) 68%, rgba(0,0,0,0.3) 100%)`,
    flat: `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.22))`,
  }
  return `<div class="panel" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:rotate(${rot}deg);border-radius:${r}px;z-index:${z}">${cloth(variant, scale)}<i style="background:${folds[fold]}"></i></div>`
}

/** A tailor's tape measure: a cream strip with tick marks and numbers. */
const tape = ({ x, y, w, rot }) => {
  const ticks = Array.from({ length: Math.floor(w / 12) }, (_, i) => {
    const big = i % 10 === 0
    const mid = i % 5 === 0
    return `<line x1="${i * 12 + 6}" y1="0" x2="${i * 12 + 6}" y2="${big ? 34 : mid ? 24 : 14}" stroke="${INK}" stroke-width="${big ? 2.5 : 1.5}"/>${big && i ? `<text x="${i * 12 + 10}" y="58" font-family="Hanken Grotesk, Helvetica, sans-serif" font-size="18" fill="${INK}">${i / 10}</text>` : ''}`
  }).join('')
  return `<div class="tape" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rot}deg)"><svg width="${w}" height="72" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="72" fill="${C.gold}"/><rect y="66" width="${w}" height="6" fill="${AMBER}"/>${ticks}</svg></div>`
}

/** A small plaque with the wordmark and an optional line, set in Newsreader. */
const plaque = ({ x, y, title, line, size = 64, align = 'left' }) =>
  `<div class="plaque" style="${align === 'center' ? 'left:50%;top:50%;transform:translate(-50%,-50%)' : `left:${x}px;top:${y}px`};text-align:${align}"><b style="font-size:${size}px">${title}</b>${line ? `<span>${line}</span>` : ''}</div>`

const thread = (d, width = 4) =>
  `<svg class="thread" xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="none" stroke="${AMBER}" stroke-width="${width}" stroke-linecap="round" stroke-dasharray="2 14"/></svg>`

const page = (w, h, body, glow = '72% 40%') => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Newsreader'; font-weight: 200 800; src: url(${pathToFileURL(join(ROOT, 'public/fonts/newsreader-normal-latin.woff2'))}) format('woff2'); }
@font-face { font-family: 'Hanken Grotesk'; font-weight: 100 900; src: url(${pathToFileURL(join(ROOT, 'public/fonts/hanken-normal-latin.woff2'))}) format('woff2'); }
html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; }
body { position: relative; background: radial-gradient(ellipse at ${glow}, #2b2112 0%, ${INK} 58%); font-family: 'Hanken Grotesk', Helvetica, sans-serif; }
.panel { position: absolute; overflow: hidden; box-shadow: 0 40px 90px rgba(0,0,0,0.55), 0 8px 18px rgba(0,0,0,0.35); }
.panel svg { position: absolute; inset: 0; }
.panel i { position: absolute; inset: 0; }
.tape { position: absolute; z-index: 20; height: 72px; box-shadow: 0 18px 40px rgba(0,0,0,0.45); transform-origin: left center; }
.plaque { position: absolute; z-index: 30; color: ${IVORY}; background: rgba(14,13,11,0.82); padding: 28px 40px; border-radius: 14px; border: 1px solid rgba(243,238,228,0.18); }
.plaque b { display: block; font-family: Newsreader, Georgia, serif; font-weight: 500; letter-spacing: 0.02em; line-height: 1; }
.plaque span { display: block; margin-top: 14px; font-size: 26px; letter-spacing: 0.04em; color: rgba(243,238,228,0.8); }
.thread { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 25; }
.vignette { position: absolute; inset: 0; z-index: 40; background: radial-gradient(ellipse at 60% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%); }
</style></head><body>${body}<div class="vignette"></div></body></html>`

/* ---- The set: role, size, alt text and composition --------------------------- */
const HERO = [2000, 1125]
const CARD = [1600, 2000]
const WIDE = [1600, 1200]

const IMAGES = [
  {
    name: 'hero-adire', role: 'Hero slide 1', size: HERO,
    alt: 'Illustration of layered Adire cloth: deep indigo with cream and amber resist rings, beside strips of Ankara and Aso-Oke on a dark ground',
    body: () =>
      panel('ankara', { x: 1180, y: -120, w: 620, h: 900, rot: 8, scale: 2.2, z: 1 }) +
      panel('asooke', { x: 1640, y: 420, w: 520, h: 900, rot: -4, scale: 2, fold: 'drape', z: 2 }) +
      panel('adire', { x: 860, y: 160, w: 860, h: 1100, rot: -7, scale: 2.6, z: 3 }) +
      thread('M 760 1125 C 980 760, 1300 980, 2000 520'),
  },
  {
    name: 'hero-asooke', role: 'Hero slide 2', size: HERO,
    alt: 'Illustration of hand-woven Aso-Oke strip cloth hanging in folds, burnt amber stripes with a gold thread grid',
    body: () =>
      [0, 1, 2, 3].map((i) => panel(i === 2 ? 'kente' : 'asooke', { x: 980 + i * 250, y: -80 + (i % 2) * 60, w: 300, h: 1300, rot: -2 + i * 1.5, scale: 2.4, fold: 'drape', r: 6, z: i + 1 })).join('') +
      tape({ x: 860, y: 860, w: 1300, rot: -14 }),
  },
  {
    name: 'hero-ankara', role: 'Hero slide 3', size: HERO,
    alt: 'Illustration of four matching Ankara swatches fanned out, deep red with cream ring-and-dot motifs, for matching group outfits',
    body: () =>
      [0, 1, 2, 3].map((i) => panel('ankara', { x: 980 + i * 150, y: 160 + i * 40, w: 520, h: 760, rot: -18 + i * 12, scale: 2.2, z: i + 1 })).join('') +
      thread('M 900 1125 C 1100 900, 1500 1060, 2000 760'),
  },
  {
    name: 'hero-woven', role: 'Hero slide 4', size: HERO, glow: '70% 55%',
    alt: 'Illustration of a stack of folded heritage cloths, Adire, Ankara, Aso-Oke and a red and amber woven check, on a dark ground',
    body: () =>
      panel('kente', { x: 1020, y: 700, w: 900, h: 260, rot: -2, scale: 2.2, fold: 'flat', r: 10, z: 1 }) +
      panel('asooke', { x: 1060, y: 520, w: 840, h: 220, rot: 1, scale: 2, fold: 'flat', r: 10, z: 2 }) +
      panel('ankara', { x: 1000, y: 350, w: 880, h: 220, rot: -1.5, scale: 2, fold: 'flat', r: 10, z: 3 }) +
      panel('adire', { x: 1040, y: 170, w: 820, h: 230, rot: 2, scale: 2.2, fold: 'flat', r: 10, z: 4 }),
  },
  {
    name: 'service-made-to-measure', role: 'Service: Made-to-measure', size: CARD,
    alt: 'Illustration of indigo Adire cloth with a cream tailor’s tape measure laid across it',
    body: () =>
      panel('adire', { x: 120, y: 140, w: 1360, h: 1720, rot: -3, scale: 3, z: 1 }) +
      tape({ x: 60, y: 1200, w: 1700, rot: -28 }),
  },
  {
    name: 'service-aso-ebi', role: 'Service: Aso-ebi and groups', size: CARD,
    alt: 'Illustration of six matching Ankara swatches set out in rows, the same red print repeated for a group',
    body: () =>
      [0, 1, 2, 3, 4, 5].map((i) => panel('ankara', { x: 140 + (i % 2) * 680, y: 160 + Math.floor(i / 2) * 580, w: 620, h: 520, rot: (i % 3) - 1, scale: 2.2, z: i + 1 })).join(''),
  },
  {
    name: 'service-gifting', role: 'Service: Gifting', size: CARD, glow: '50% 50%',
    alt: 'Illustration of folded woven-check cloth wrapped with an amber band, presented as a gift',
    body: () =>
      panel('kente', { x: 260, y: 420, w: 1080, h: 1160, rot: -4, scale: 3, z: 1 }) +
      `<div style="position:absolute;z-index:5;left:760px;top:330px;width:110px;height:1340px;background:${AMBER};transform:rotate(-4deg);box-shadow:0 10px 30px rgba(0,0,0,0.4)"></div>` +
      `<div style="position:absolute;z-index:5;left:220px;top:930px;width:1160px;height:110px;background:${AMBER};transform:rotate(-4deg);box-shadow:0 10px 30px rgba(0,0,0,0.4)"></div>` +
      plaque({ x: 980, y: 1180, title: 'Herit', line: 'With love', size: 72 }),
  },
  {
    name: 'service-company', role: 'Service: Company and uniform orders', size: CARD,
    alt: 'Illustration of a row of matching Aso-Oke cloth lengths hanging from a rail, one for each wearer',
    body: () =>
      `<div style="position:absolute;z-index:9;left:80px;top:300px;width:1440px;height:16px;border-radius:8px;background:${C.sand};box-shadow:0 10px 24px rgba(0,0,0,0.5)"></div>` +
      [0, 1, 2, 3, 4].map((i) => panel('asooke', { x: 130 + i * 280, y: 330, w: 240, h: 1380, rot: 0, scale: 2.2, fold: 'drape', r: 4, z: i + 1 })).join(''),
  },
  {
    name: 'page-home', role: 'Page: Home', size: WIDE,
    alt: 'Illustration of a patchwork of Adire, Ankara, Aso-Oke and woven-check cloth around the Herit Clothing name',
    body: () =>
      [['adire', 0, 0], ['ankara', 1, 0], ['asooke', 2, 0], ['kente', 0, 1], ['asooke', 1, 1], ['adire', 2, 1]]
        .map(([v, cx, cy], i) => panel(v, { x: 40 + cx * 520, y: 40 + cy * 560, w: 500, h: 540, rot: 0, scale: 2.2, r: 8, fold: 'flat', z: i + 1 }))
        .join('') + plaque({ x: 380, y: 470, title: 'Herit Clothing', line: 'Wear your heritage', size: 84, align: 'center' }),
  },
  {
    name: 'page-about', role: 'Page: About', size: WIDE, glow: '40% 50%',
    alt: 'Illustration of Adire and Aso-Oke cloth with the line Herit Clothing, Ajuwon Market, Lagos, founded 2024',
    body: () =>
      panel('asooke', { x: 820, y: -60, w: 520, h: 1320, rot: 6, scale: 2.2, fold: 'drape', z: 1 }) +
      panel('adire', { x: 980, y: 140, w: 680, h: 960, rot: -5, scale: 2.6, z: 2 }) +
      plaque({ x: 90, y: 420, title: 'Herit Clothing', line: 'Ajuwon Market, Lagos · since 2024', size: 76 }),
  },
  {
    name: 'page-how-it-works', role: 'Page: How it works', size: WIDE,
    alt: 'Illustration of four cloth swatches in a row, numbered one to four, for the four steps of an order',
    body: () =>
      ['ankara', 'adire', 'asooke', 'kente']
        .map((v, i) => panel(v, { x: 70 + i * 380, y: 260 + (i % 2) * 60, w: 340, h: 620, rot: i % 2 ? 2 : -2, scale: 2, z: i + 1 }) + plaque({ x: 120 + i * 380, y: 760 + (i % 2) * 60, title: `0${i + 1}`, size: 64 }))
        .join(''),
  },
  {
    name: 'page-company', role: 'Page: Company orders', size: WIDE,
    alt: 'Illustration of identical Aso-Oke and woven-check swatches in neat rows, the same cloth for every member of a team',
    body: () =>
      [0, 1, 2, 3, 4, 5, 6, 7].map((i) => panel(i % 4 === 3 ? 'kente' : 'asooke', { x: 80 + (i % 4) * 370, y: 120 + Math.floor(i / 4) * 500, w: 330, h: 440, rot: 0, scale: 2, r: 8, fold: 'flat', z: i + 1 })).join(''),
  },
  {
    name: 'page-contact', role: 'Page: Contact', size: WIDE, glow: '30% 40%',
    alt: 'Illustration of red Ankara cloth with a folded cream note card resting on it',
    body: () =>
      panel('ankara', { x: 620, y: 80, w: 900, h: 1040, rot: 4, scale: 2.4, z: 1 }) +
      `<div style="position:absolute;z-index:5;left:420px;top:520px;width:620px;height:400px;background:${C.gold};border-radius:6px;transform:rotate(-7deg);box-shadow:0 30px 60px rgba(0,0,0,0.5)"><div style="position:absolute;left:0;right:0;top:0;height:50%;background:linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0))"></div><div style="position:absolute;left:60px;top:150px;width:420px;height:6px;background:${C.sand}"></div><div style="position:absolute;left:60px;top:200px;width:340px;height:6px;background:${C.sand}"></div><div style="position:absolute;left:60px;top:250px;width:380px;height:6px;background:${C.sand}"></div></div>`,
  },
  {
    name: 'page-services', role: 'Page: Services introduction', size: WIDE,
    alt: 'Illustration of diagonal bands of woven-check, Aso-Oke, Ankara and Adire cloth laid side by side',
    body: () =>
      ['kente', 'asooke', 'ankara', 'adire'].map((v, i) => panel(v, { x: 200 + i * 300, y: -200, w: 280, h: 1600, rot: 18, scale: 2.2, fold: 'drape', r: 4, z: i + 1 })).join(''),
  },
]

/* ---- Render ------------------------------------------------------------------- */
if (!existsSync(CHROME)) {
  console.error(`render-prints: Chrome not found at ${CHROME}; set CHROME_BIN`)
  process.exit(1)
}
mkdirSync(OUT, { recursive: true })
const tmp = join(OUT, '.html')
mkdirSync(tmp, { recursive: true })
const manifest = []
for (const img of IMAGES) {
  if (ONLY.length && !ONLY.includes(img.name)) continue
  const [w, h] = img.size
  const html = join(tmp, `${img.name}.html`)
  writeFileSync(html, page(w, h, img.body(), img.glow))
  const png = join(tmp, `${img.name}.png`)
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--allow-file-access-from-files', `--window-size=${w},${h}`, `--screenshot=${png}`, pathToFileURL(html).href], { stdio: 'ignore' })
  const jpg = join(OUT, `${img.name}.jpg`)
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '86', png, '--out', jpg], { stdio: 'ignore' })
  manifest.push({ name: img.name, file: `${img.name}.jpg`, role: img.role, width: w, height: h, alt: img.alt })
  console.log(`render-prints: ${img.name}.jpg (${w}x${h}) ${img.role}`)
}
rmSync(tmp, { recursive: true, force: true })
if (!ONLY.length) writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`render-prints: ${manifest.length} images in ${OUT}`)
