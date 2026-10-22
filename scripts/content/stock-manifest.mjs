#!/usr/bin/env node
// Check the stock photographs listed in scripts/content/stock-photos.json
// (Unsplash and Pexels licences, mood only: cloth, tools, workshop, Lagos; D-028)
// and write the manifest that load-real-content.php reads.
//
//   node scripts/content/stock-manifest.mjs --from <folder with name.jpg files>
//   HERIT_EMAIL=… HERIT_PASSWORD=… php scripts/content/load-real-content.php \
//     --base http://127.0.0.1:8089 --images scripts/content/.stock --update
//
// The photographs are not committed (scripts/content/.stock is ignored); the
// list is, with each source page, photographer, licence, alt text and any
// edit made, so every image can be traced and fetched again. Each slot of the
// print manifest (scripts/content/.out, from render-prints.mjs) is kept: a slot
// without a photograph keeps its print illustration, so loading never clears
// an image. Each photograph's caption credits the photographer and the source.
// Needs macOS `sips` for the size check.

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const args = process.argv.slice(2)
const arg = (k, d) => {
  const i = args.indexOf(k)
  return i >= 0 ? args[i + 1] : d
}
const LIST = join(ROOT, 'scripts/content/stock-photos.json')
const PRINTS = join(ROOT, 'scripts/content/.out')
const OUT = join(ROOT, 'scripts/content/.stock')
const FROM = resolve(arg('--from', OUT))
const MIN_WIDTH = 1600
const LICENCES = ['Unsplash License', 'Pexels License']

const size = (file) => {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' })
  return { width: Number(out.match(/pixelWidth: (\d+)/)[1]), height: Number(out.match(/pixelHeight: (\d+)/)[1]) }
}

const photos = JSON.parse(readFileSync(LIST, 'utf8'))
const printsFile = join(PRINTS, 'manifest.json')
if (!existsSync(printsFile)) throw new Error(`No ${printsFile}; run node scripts/content/render-prints.mjs first.`)
const prints = JSON.parse(readFileSync(printsFile, 'utf8'))
mkdirSync(OUT, { recursive: true })

const manifest = []
for (const slot of prints) {
  const p = photos.find((x) => x.name === slot.name)
  const src = p && join(FROM, `${p.name}.jpg`)
  if (!p || !existsSync(src)) {
    copyFileSync(join(PRINTS, slot.file), join(OUT, slot.file))
    manifest.push(slot)
    console.log(`kept print    ${slot.name}${p ? ' (photograph missing)' : ''}`)
    continue
  }
  if (!LICENCES.includes(p.licence)) throw new Error(`${p.name}: licence must be one of ${LICENCES.join(', ')}`)
  const file = `${p.name}.jpg`
  const dest = join(OUT, file)
  const buf = readFileSync(src)
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error(`${p.name}: not a JPEG`)
  if (src !== dest) copyFileSync(src, dest)
  const { width, height } = size(dest)
  if (width < MIN_WIDTH) throw new Error(`${p.name}: ${width}px wide, below ${MIN_WIDTH}px`)
  manifest.push({
    name: p.name,
    file,
    role: slot.role,
    width,
    height,
    alt: p.alt,
    caption: `Photograph by ${p.photographer} on ${p.source} (${p.licence})`,
  })
  console.log(`photograph    ${p.name} ${width}x${height} ${p.photographer} / ${p.source}`)
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`\n${manifest.length} images in ${OUT}`)
