/**
 * African print patterns as data, so the public site (PrintArt.jsx) and the
 * media-library image generator (scripts/content/render-prints.mjs) draw the
 * same cloth. Each pattern is one repeat tile: a ground colour and shapes.
 * Colours are names from the `$hc-print` token map (`--hc-print-<name>`);
 * no colour values live here (check-tokens).
 *
 * Shapes: { t: 'circle', cx, cy, r, fill?, stroke?, sw?, o? }
 *         { t: 'rect', x, y, w, h, fill, o? }
 * `o` is opacity. Tiles are in CSS pixels at scale 1.
 */

/* Adire: hand-dyed indigo with resist rings that interlock across the tile. */
const adire = {
  label: 'Adire',
  size: [64, 64],
  ground: 'indigo',
  shapes: [
    { t: 'circle', cx: 32, cy: 32, r: 27, stroke: 'cream', sw: 3 },
    { t: 'circle', cx: 32, cy: 32, r: 17, stroke: 'amber', sw: 2, o: 0.85 },
    { t: 'circle', cx: 32, cy: 32, r: 9, stroke: 'sand', sw: 1.5 },
    { t: 'circle', cx: 32, cy: 32, r: 3.5, fill: 'cream' },
    { t: 'circle', cx: 0, cy: 0, r: 27, stroke: 'cream', sw: 3 },
    { t: 'circle', cx: 64, cy: 0, r: 27, stroke: 'cream', sw: 3 },
    { t: 'circle', cx: 0, cy: 64, r: 27, stroke: 'cream', sw: 3 },
    { t: 'circle', cx: 64, cy: 64, r: 27, stroke: 'cream', sw: 3 },
    { t: 'circle', cx: 0, cy: 0, r: 3, fill: 'amber' },
    { t: 'circle', cx: 64, cy: 0, r: 3, fill: 'amber' },
    { t: 'circle', cx: 0, cy: 64, r: 3, fill: 'amber' },
    { t: 'circle', cx: 64, cy: 64, r: 3, fill: 'amber' },
  ],
}

/* Ankara: bold wax-print medallions, cream ring and dot on deep red. */
const ankara = {
  label: 'Ankara',
  size: [64, 64],
  ground: 'red',
  shapes: [
    { t: 'circle', cx: 32, cy: 32, r: 19, stroke: 'cream', sw: 3 },
    { t: 'circle', cx: 32, cy: 32, r: 12, stroke: 'rust', sw: 5 },
    { t: 'circle', cx: 32, cy: 32, r: 5, fill: 'cream' },
    { t: 'circle', cx: 32, cy: 32, r: 2, fill: 'red' },
    { t: 'circle', cx: 0, cy: 0, r: 9, stroke: 'rust', sw: 3 },
    { t: 'circle', cx: 64, cy: 0, r: 9, stroke: 'rust', sw: 3 },
    { t: 'circle', cx: 0, cy: 64, r: 9, stroke: 'rust', sw: 3 },
    { t: 'circle', cx: 64, cy: 64, r: 9, stroke: 'rust', sw: 3 },
    { t: 'circle', cx: 32, cy: 0, r: 2, fill: 'gold', o: 0.7 },
    { t: 'circle', cx: 0, cy: 32, r: 2, fill: 'gold', o: 0.7 },
    { t: 'circle', cx: 64, cy: 32, r: 2, fill: 'gold', o: 0.7 },
    { t: 'circle', cx: 32, cy: 64, r: 2, fill: 'gold', o: 0.7 },
  ],
}

/* Aso-Oke: hand-woven strip cloth, warp stripes with a gold lurex grid. */
const asooke = {
  label: 'Aso-Oke',
  size: [56, 56],
  ground: 'ochre',
  shapes: [
    ...[0, 14, 28, 42].map((x) => ({ t: 'rect', x, y: 0, w: 7, h: 56, fill: 'rust' })),
    ...[7, 21, 35, 49].map((x) => ({ t: 'rect', x, y: 0, w: 7, h: 56, fill: 'umber' })),
    ...[0, 7, 14, 21, 28, 35, 42, 49].map((y) => ({ t: 'rect', x: 0, y, w: 56, h: 1, fill: 'shade', o: 0.16 })),
    { t: 'rect', x: 27, y: 0, w: 2, h: 56, fill: 'gold', o: 0.55 },
    { t: 'rect', x: 0, y: 27, w: 56, h: 2, fill: 'gold', o: 0.3 },
  ],
}

/* Woven check: Kente-like interlocking red and amber blocks. */
const kente = {
  label: 'Woven check',
  size: [32, 32],
  ground: 'brown',
  shapes: [
    { t: 'rect', x: 0, y: 0, w: 32, h: 8, fill: 'crimson' },
    { t: 'rect', x: 0, y: 16, w: 32, h: 8, fill: 'crimson' },
    { t: 'rect', x: 0, y: 0, w: 8, h: 32, fill: 'rust', o: 0.9 },
    { t: 'rect', x: 16, y: 0, w: 8, h: 32, fill: 'rust', o: 0.9 },
    { t: 'rect', x: 2, y: 2, w: 4, h: 4, fill: 'amber' },
    { t: 'rect', x: 18, y: 18, w: 4, h: 4, fill: 'amber' },
    { t: 'rect', x: 0, y: 0, w: 32, h: 1.5, fill: 'gold', o: 0.25 },
    { t: 'rect', x: 0, y: 16, w: 32, h: 1.5, fill: 'gold', o: 0.25 },
  ],
}

export const PRINT_PATTERNS = { adire, ankara, asooke, kente }

export const PRINT_VARIANTS = Object.keys(PRINT_PATTERNS)

/**
 * The print variant for a name: a variant key, a fabric name ("Aso-Oke",
 * "Ankara"), an older tile class ("hc-tile-adire", "hc-tile-mixed") or any
 * text that mentions one. Falls back to `fallback` (default the woven check).
 */
export const printVariant = (name, fallback = 'kente') => {
  const s = String(name || '').toLowerCase()
  if (/adire|indigo/.test(s)) return 'adire'
  if (/ankara|wax/.test(s)) return 'ankara'
  if (/aso-?\s?oke|asooke|strip/.test(s)) return 'asooke'
  if (/kente|check|mixed|weave/.test(s)) return 'kente'
  return PRINT_PATTERNS[fallback] ? fallback : 'kente'
}

/** A variant for position `i` in a list, cycling through all four prints. */
export const printAt = (i) => PRINT_VARIANTS[((i % PRINT_VARIANTS.length) + PRINT_VARIANTS.length) % PRINT_VARIANTS.length]
