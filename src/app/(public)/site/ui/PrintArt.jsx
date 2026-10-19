import { useId } from 'react'
import { PRINT_PATTERNS, printVariant } from './printPatterns'

const colour = (name) => `var(--hc-print-${name})`

/** One repeat tile of a print as SVG shapes (colours from the --hc-print-* tokens). */
const Tile = ({ pattern }) =>
  pattern.shapes.map((s, i) =>
    s.t === 'rect' ? (
      <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={colour(s.fill)} opacity={s.o} />
    ) : (
      <circle
        key={i}
        cx={s.cx}
        cy={s.cy}
        r={s.r}
        fill={s.fill ? colour(s.fill) : 'none'}
        stroke={s.stroke ? colour(s.stroke) : undefined}
        strokeWidth={s.sw}
        opacity={s.o}
      />
    ),
  )

/**
 * African print illustration (Adire, Ankara, Aso-Oke or the woven check),
 * drawn as an inline SVG pattern from printPatterns.js. Used as a section
 * background, a divider, behind cards and wherever a section has no
 * photograph, so the site never shows an empty grey box.
 *
 * - `variant`: 'adire' | 'ankara' | 'asooke' | 'kente', or any fabric name or
 *   older tile class (printVariant()).
 * - `label`: when given the art is an image with that accessible name;
 *   otherwise it is decorative and hidden from assistive technology.
 * - `scale`: pattern scale (1 = the tile size in CSS pixels).
 * - `shade`: 'none' | 'soft' | 'strong', an ink scrim for text laid over it.
 * - `drift`: a slow pan of the cloth; never moves under reduced motion.
 * - `children`: content laid over the cloth.
 */
const PrintArt = ({ variant = 'kente', label, scale = 1, shade = 'none', drift = false, ratio, className = '', children }) => {
  const key = printVariant(variant)
  const p = PRINT_PATTERNS[key]
  const id = `hc-print-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [w, h] = p.size
  return (
    <span
      className={['hc-print', `hc-print--${key}`, shade !== 'none' && `hc-print--shade-${shade}`, drift && 'hc-print--drift', className]
        .filter(Boolean)
        .join(' ')}
      style={ratio ? { aspectRatio: ratio } : undefined}
      data-print={key}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}>
      <svg className="hc-print-svg" width="100%" height="100%" focusable="false" aria-hidden="true">
        <defs>
          <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse" patternTransform={scale !== 1 ? `scale(${scale})` : undefined}>
            <rect width={w} height={h} fill={colour(p.ground)} />
            <Tile pattern={p} />
          </pattern>
        </defs>
        <rect className="hc-print-cloth" width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      {children && <span className="hc-print-over">{children}</span>}
    </span>
  )
}

/** A thin strip of woven cloth between sections (decorative). */
export const PrintRule = ({ variant = 'kente', className = '' }) => <PrintArt variant={variant} className={`hc-print-rule ${className}`.trim()} />

export default PrintArt
