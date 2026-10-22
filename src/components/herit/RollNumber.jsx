import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * A figure whose digits roll into place once, like a split-flap board
 * (HyperFrames Split-Flap Board, rebuilt for the admin, D-031). Screen readers
 * get the plain value; under reduced motion the digits simply show.
 */
const RollNumber = ({ value, className = '' }) => {
  const ref = useRef(null)
  const text = String(value ?? '')
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const cols = Array.from(el.querySelectorAll('.hd-roll-col'))
    const end = (col) => (-100 * (10 + Number(col.dataset.d))) / 20
    // GSAP owns the transform from here (the inline style is the no-script resting place).
    cols.forEach((col) => gsap.set(col, { clearProps: 'transform' }))
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      cols.forEach((col) => gsap.set(col, { yPercent: end(col) }))
      return undefined
    }
    const tweens = cols.map((col, i) => gsap.fromTo(col, { yPercent: 0 }, { yPercent: end(col), duration: 0.9 + i * 0.1, ease: 'power3.out' }))
    return () => tweens.forEach((t) => t.kill())
  }, [text])
  return (
    <span className={`hd-roll ${className}`.trim()} aria-label={text} role="text">
      <span ref={ref} aria-hidden="true">
        {text.split('').map((ch, i) =>
          /\d/.test(ch) ? (
            <span key={i} className="hd-roll-cell">
              <span className="hd-roll-col" data-d={ch} style={{ transform: `translateY(${(-100 * (10 + Number(ch))) / 20}%)` }}>
                {Array.from({ length: 20 }, (_, d) => (
                  <span key={d}>{d % 10}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={i}>{ch}</span>
          ),
        )}
      </span>
    </span>
  )
}

export default RollNumber
