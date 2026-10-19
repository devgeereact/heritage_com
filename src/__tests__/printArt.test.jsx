import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import PrintArt, { PrintRule } from '@/app/(public)/site/ui/PrintArt'
import { PRINT_PATTERNS, PRINT_VARIANTS, printVariant, printAt } from '@/app/(public)/site/ui/printPatterns'

describe('printVariant', () => {
  it('maps fabric names, older tile classes and mixed text to a print', () => {
    expect(printVariant('Adire')).toBe('adire')
    expect(printVariant('hc-tile-ankara')).toBe('ankara')
    expect(printVariant('Aso-Oke')).toBe('asooke')
    expect(printVariant('hc-tile-asooke')).toBe('asooke')
    expect(printVariant('hc-tile-mixed')).toBe('kente')
  })

  it('does not read aso-ebi as Aso-Oke, and falls back for anything else', () => {
    expect(printVariant('Aso-ebi and groups', 'ankara')).toBe('ankara')
    expect(printVariant('', 'adire')).toBe('adire')
    expect(printVariant('Gifting', 'nonsense')).toBe('kente')
  })

  it('cycles through all four prints by position', () => {
    expect([0, 1, 2, 3, 4, -1].map(printAt)).toEqual(['adire', 'ankara', 'asooke', 'kente', 'adire', 'kente'])
  })

  it('names colours only as print tokens (no raw colour values)', () => {
    PRINT_VARIANTS.forEach((v) => {
      const p = PRINT_PATTERNS[v]
      const names = [p.ground, ...p.shapes.flatMap((s) => [s.fill, s.stroke].filter(Boolean))]
      names.forEach((n) => expect(n).toMatch(/^[a-z]+$/))
    })
  })
})

describe('PrintArt', () => {
  it('draws the cloth as an SVG pattern in --hc-print-* colours, decorative by default', () => {
    const { container } = render(<PrintArt variant="Adire" />)
    const root = container.firstChild
    expect(root).toHaveClass('hc-print', 'hc-print--adire')
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root).not.toHaveAttribute('role')
    const pattern = container.querySelector('pattern')
    expect(pattern).not.toBeNull()
    expect(pattern.querySelector('rect').getAttribute('fill')).toBe('var(--hc-print-indigo)')
    expect(container.querySelector('.hc-print-cloth').getAttribute('fill')).toBe(`url(#${pattern.id})`)
  })

  it('is an image with a name when labelled', () => {
    const { getByRole } = render(<PrintArt variant="ankara" label="Ankara print" />)
    expect(getByRole('img', { name: 'Ankara print' })).toHaveClass('hc-print--ankara')
  })

  it('gives each instance its own pattern id', () => {
    const { container } = render(
      <>
        <PrintArt variant="kente" />
        <PrintArt variant="kente" />
      </>,
    )
    const ids = Array.from(container.querySelectorAll('pattern')).map((p) => p.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('adds the shade, drift, ratio and overlaid content', () => {
    const { container, getByText } = render(
      <PrintArt variant="asooke" shade="soft" drift ratio="4 / 5" scale={2}>
        <span>Aso-Oke</span>
      </PrintArt>,
    )
    const root = container.firstChild
    expect(root).toHaveClass('hc-print--shade-soft', 'hc-print--drift')
    expect(root.style.aspectRatio).toBe('4 / 5')
    expect(container.querySelector('pattern').getAttribute('patternTransform')).toBe('scale(2)')
    expect(getByText('Aso-Oke').closest('.hc-print-over')).not.toBeNull()
  })

  it('PrintRule is a decorative strip', () => {
    const { container } = render(<PrintRule variant="ankara" />)
    expect(container.firstChild).toHaveClass('hc-print', 'hc-print-rule', 'hc-print--ankara')
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})
