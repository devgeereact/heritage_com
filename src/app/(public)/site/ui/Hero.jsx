import { useCallback, useEffect, useState } from 'react'
import Button, { Actions } from './Button'
import HcImage from './HcImage'
import Icon from './Icon'

const DURATION = 7500

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Headline split into masked words so each can rise in turn; one readable string for screen readers. */
const Title = ({ text }) => {
  const words = String(text || '')
    .split(/\s+/)
    .filter(Boolean)
  return (
    <h1 className="hc-hero-title" aria-label={text}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} aria-hidden="true">
          <span className="hc-hero-word">
            <span style={{ '--hc-i': Math.min(i, 11) }}>{w}</span>
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </h1>
  )
}

/**
 * Home hero (D-023): a full-screen photograph with the copy over a dark scrim.
 * With more than one slide it becomes a slider: the photographs crossfade and
 * slowly zoom, the headline rises word by word, and progress bars show the
 * time left. It pauses on hover, on keyboard focus and in a hidden tab, and
 * takes arrows, the left and right keys and a swipe. Under reduced motion it
 * never advances on its own and nothing moves. Without any photograph it is a
 * text-only hero on the ink surface.
 *
 * `slides`: [{ label, eyebrow, title, lead, image, primary, secondary }];
 * `label` names the slide in its progress bar (defaults to the title). The single
 * slide props are still accepted for one-slide use.
 */
const Hero = ({ slides: input, eyebrow, title, lead, primary, secondary, image, note }) => {
  const slides = (input?.length ? input : [{ eyebrow, title, lead, primary, secondary, image }]).filter((s) => s?.title)
  const count = slides.length
  const many = count > 1
  const [idx, setIdx] = useState(0)
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [still] = useState(reducedMotion)
  const [touchX, setTouchX] = useState(null)

  const go = useCallback((n) => setIdx(((n % count) + count) % count), [count])
  const next = useCallback(() => go(idx + 1), [go, idx])
  const prev = useCallback(() => go(idx - 1), [go, idx])

  useEffect(() => {
    const onVis = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  if (!count) return null
  const media = slides.some((s) => s.image?.src)
  const paused = hover || focus || hidden || still

  const onKeyDown = (e) => {
    if (!many) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      next()
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prev()
    }
  }
  const onTouchEnd = (e) => {
    if (touchX === null || !many) return
    const dx = e.changedTouches[0].clientX - touchX
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)()
    setTouchX(null)
  }

  return (
    <section
      className={['hc-hero', media && 'hc-hero--media', many && 'hc-hero--slider', paused && 'is-paused', still && 'is-still']
        .filter(Boolean)
        .join(' ')}
      aria-roledescription={many ? 'carousel' : undefined}
      aria-label={many ? 'Featured work' : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false)
      }}
      onKeyDown={onKeyDown}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={onTouchEnd}
      style={{ '--hc-slide-ms': `${DURATION}ms` }}>
      {slides.map((s, i) => {
        const on = i === idx
        return (
          <div
            key={`${s.title}-${i}`}
            className={`hc-slide${on ? ' is-on' : ''}`}
            aria-roledescription={many ? 'slide' : undefined}
            aria-label={many ? `${i + 1} of ${count}` : undefined}
            aria-hidden={on ? undefined : true}
            inert={!on}>
            {s.image?.src && (
              <div className="hc-slide-media">
                <HcImage {...s.image} priority={i === 0} sizes="100vw" />
                <span className="hc-slide-scrim" aria-hidden="true" />
              </div>
            )}
            <div className="hc-container hc-slide-copy">
              <div className="hc-hero-copy">
                {s.eyebrow && <p className="hc-eyebrow hc-hero-eyebrow">{s.eyebrow}</p>}
                <Title text={s.title} />
                {s.lead && <p className="hc-hero-lead">{s.lead}</p>}
                {(s.primary || s.secondary) && (
                  <Actions className="hc-hero-actions">
                    {s.primary && (
                      <Button to={s.primary.to} href={s.primary.href} variant="primary" iconEnd="arrow-right">
                        {s.primary.label}
                      </Button>
                    )}
                    {s.secondary && (
                      <Button to={s.secondary.to} href={s.secondary.href} variant="secondary">
                        {s.secondary.label}
                      </Button>
                    )}
                  </Actions>
                )}
                {note && i === 0 && <p className="hc-hero-note">{note}</p>}
              </div>
            </div>
          </div>
        )
      })}

      {many && (
        <div className="hc-hero-ui">
          <div className="hc-container hc-hero-ui-inner">
            <div className="hc-hero-bars">
              {slides.map((s, i) => (
                <button
                  key={`bar-${i}`}
                  type="button"
                  className={['hc-hero-bar', i === idx && 'is-on', i < idx && 'is-done'].filter(Boolean).join(' ')}
                  aria-label={`Show slide ${i + 1}: ${s.label || s.title}`}
                  aria-current={i === idx ? 'true' : undefined}
                  onClick={() => go(i)}>
                  <span className="hc-hero-track">{i === idx && <span key={idx} className="hc-hero-fill" onAnimationEnd={next} />}</span>
                  <span className="hc-hero-bar-label">{s.label || s.title}</span>
                </button>
              ))}
            </div>
            <div className="hc-hero-nav">
              <p className="hc-hero-count" aria-live="polite">
                <b>{String(idx + 1).padStart(2, '0')}</b> / {String(count).padStart(2, '0')}
              </p>
              <button type="button" className="hc-hero-arrow" onClick={prev} aria-label="Previous slide">
                <Icon name="arrow-left" />
              </button>
              <button type="button" className="hc-hero-arrow" onClick={next} aria-label="Next slide">
                <Icon name="arrow-right" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Hero
