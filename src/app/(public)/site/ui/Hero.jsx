import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Button, { Actions } from './Button'
import HcImage from './HcImage'
import Icon from './Icon'
import PrintArt from './PrintArt'
import EditLink from './EditLink'
import SplitText from './reactbits/SplitText'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const DURATION = 7.5
const PRINT_NAMES = { adire: 'Adire', ankara: 'Ankara', asooke: 'Aso-Oke', kente: 'Woven check' }
const WIPE_FROM = 'inset(100% 0% 0% 0%)'
const WIPE_TO = 'inset(0% 0% 0% 0%)'

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Only the first slide is the page's h1; later slides use h2 so Home keeps one
 * h1. The active slide's headline rises word by word out of a mask (React Bits
 * SplitText on GSAP SplitText, which gives screen readers the whole line);
 * the others stay plain text while they are hidden.
 */
const Title = ({ text, first, active, still }) => {
  const tag = first ? 'h1' : 'h2'
  if (active && !still)
    return (
      <SplitText
        text={text}
        tag={tag}
        className="hc-hero-title"
        splitType="words"
        mask
        trigger="load"
        delay={70}
        duration={1.1}
        ease="expo.out"
        from={{ yPercent: 110 }}
        to={{ yPercent: 0 }}
        textAlign="left"
      />
    )
  const Tag = tag
  return <Tag className="hc-hero-title">{text}</Tag>
}

/**
 * Home hero (D-023, animated with GSAP for D-027): a full-screen photograph
 * with the copy over a left and bottom scrim. On load the photograph fades in
 * from a slight zoom and the headline rises word by word, then the rest of
 * the copy and the controls follow. With more than one slide it is a slider:
 * each new photograph wipes up over the last and slowly settles (Ken Burns),
 * and progress bars along the bottom show the time left. It pauses on hover,
 * keyboard focus, a hidden tab and while scrolled out of view, and a pause
 * button stops it for good (WCAG 2.2.2). Arrows, the left and right keys and a
 * swipe change slide. From 1024px, scrolling eases the photograph down and
 * fades the copy. Under reduced motion nothing moves and it never advances on
 * its own.
 *
 * A slide without a photograph shows an African print under the same scrim,
 * labelled as an illustration (D-026). `edit` ({to, label}) adds the
 * staff-only Edit control.
 *
 * `slides`: [{ label, eyebrow, title, lead, image, print, primary, secondary }];
 * `label` names the slide in its progress bar (defaults to the title). The
 * single-slide props are still accepted for one-slide use.
 */
const Hero = ({ slides: input, eyebrow, title, lead, primary, secondary, image, note, print = 'adire', edit }) => {
  const slides = (input?.length ? input : [{ eyebrow, title, lead, primary, secondary, image }]).filter((s) => s?.title)
  const count = slides.length
  const many = count > 1
  const scope = useRef(null)
  const prevIdx = useRef(null)
  const timer = useRef(null)
  const settle = useRef(null)
  const [idx, setIdx] = useState(0)
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [inView, setInView] = useState(true)
  const [still] = useState(reducedMotion)
  // Stopped by the visitor with the pause button; stays stopped.
  const [stopped, setStopped] = useState(false)
  const [touchX, setTouchX] = useState(null)

  const go = useCallback((n) => setIdx(((n % count) + count) % count), [count])
  const next = useCallback(() => setIdx((i) => (i + 1) % count), [count])
  const prev = useCallback(() => setIdx((i) => (i - 1 + count) % count), [count])

  useEffect(() => {
    const onVis = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const paused = hover || focus || hidden || !inView || still || stopped
  // The slides can change once content loads; the first view replays for the real ones.
  const sig = slides.map((s) => s.title).join('|')

  // First view: the photograph settles in, then the copy and controls.
  // Also the scroll drift and the out-of-view pause.
  useGSAP(
    () => {
      if (!count) return
      gsap.set('.hc-hero-media', { autoAlpha: 0 })
      gsap.set('.hc-hero-copyset', { autoAlpha: 0 })
      gsap.set('.hc-hero-media[data-i="0"], .hc-hero-copyset[data-i="0"]', { autoAlpha: 1 })
      prevIdx.current = 0
      if (still) return

      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('.hc-hero-stage', { autoAlpha: 0, duration: 1.4, ease: 'power2.out' }, 0)
        .fromTo('.hc-hero-media[data-i="0"] .hc-hero-zoom', { scale: 1.06 }, { scale: 1.03, duration: 2.4 }, 0)
        .from('.hc-hero-copyset[data-i="0"] [data-hero-part]', { y: 18, autoAlpha: 0, duration: 1, stagger: 0.1 }, 0.35)
      if (many) tl.from('.hc-hero-ui', { y: 12, autoAlpha: 0, duration: 0.9 }, 0.9)
      settle.current = gsap.to('.hc-hero-media[data-i="0"] .hc-hero-zoom', { scale: 1, duration: DURATION + 1, ease: 'none', delay: 2.4 })

      ScrollTrigger.create({
        trigger: scope.current,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => setInView(self.isActive),
      })
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        const drift = { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: true }
        gsap.to('.hc-hero-stage', { yPercent: 18, ease: 'none', scrollTrigger: drift })
        gsap.to('.hc-hero-text', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { ...drift, end: 'center top' } })
      })
    },
    { scope, dependencies: [sig], revertOnUpdate: true },
  )

  // Slide change: the new photograph wipes up over the old one, the copy swaps.
  const { contextSafe } = useGSAP({ scope })
  const show = contextSafe((to) => {
    const from = prevIdx.current
    if (from === null || from === to) return
    prevIdx.current = to
    const out = `[data-i="${from}"]`
    const inn = `[data-i="${to}"]`
    settle.current?.kill()
    gsap.killTweensOf(['.hc-hero-media', '.hc-hero-copyset', '.hc-hero-zoom'])
    gsap.set('.hc-hero-zoom', { yPercent: 0 })
    // A change can interrupt the last one: hide every slide not in this change.
    gsap.set(`.hc-hero-media:not(${out}):not(${inn}), .hc-hero-copyset:not(${out}):not(${inn})`, { autoAlpha: 0 })
    if (still) {
      gsap.set([`.hc-hero-media${out}`, `.hc-hero-copyset${out}`], { autoAlpha: 0 })
      gsap.set([`.hc-hero-media${inn}`, `.hc-hero-copyset${inn}`], { autoAlpha: 1 })
      return
    }
    gsap.set('.hc-hero-media', { zIndex: 0 })
    gsap.set(`.hc-hero-media${out}`, { zIndex: 1, autoAlpha: 1, clipPath: WIPE_TO })
    const tl = gsap.timeline()
    tl.fromTo(`.hc-hero-media${inn}`, { zIndex: 2, autoAlpha: 1, clipPath: WIPE_FROM }, { clipPath: WIPE_TO, duration: 1.2, ease: 'expo.inOut' }, 0)
      .fromTo(`.hc-hero-media${inn} .hc-hero-zoom`, { scale: 1.06 }, { scale: 1.03, duration: 1.8, ease: 'expo.out' }, 0)
      .to(`.hc-hero-media${out} .hc-hero-zoom`, { scale: 1.05, yPercent: -3, duration: 1.2, ease: 'expo.inOut' }, 0)
      .set(`.hc-hero-media${out}`, { autoAlpha: 0 }, 1.2)
      .to(`.hc-hero-copyset${out}`, { autoAlpha: 0, y: -12, duration: 0.35, ease: 'power2.in' }, 0)
      .set(`.hc-hero-copyset${inn}`, { autoAlpha: 1, y: 0 }, 0.3)
      .from(`.hc-hero-copyset${inn} [data-hero-part]`, { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out' }, 0.45)
    settle.current = gsap.to(`.hc-hero-media${inn} .hc-hero-zoom`, { scale: 1, duration: DURATION + 1, ease: 'none', delay: 1.8 })
  })

  useEffect(() => {
    show(idx)
  }, [idx, show])

  // Progress bar for the active slide; it advances the slider when full.
  useGSAP(
    () => {
      if (!many || still) return
      timer.current = gsap.fromTo(
        `.hc-hero-bar[data-i="${idx}"] .hc-hero-fill`,
        { scaleX: 0 },
        { scaleX: 1, duration: DURATION, ease: 'none', paused: true, onComplete: next },
      )
      if (!paused) timer.current.play()
      return () => timer.current?.kill()
    },
    { scope, dependencies: [idx, sig, still, next], revertOnUpdate: true },
  )

  useEffect(() => {
    const t = timer.current
    if (!t) return
    if (paused) {
      t.pause()
      settle.current?.pause()
    } else {
      t.play()
      settle.current?.play()
    }
  }, [paused, idx])

  if (!count) return null

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
      ref={scope}
      className={['hc-hero', 'hc-hero--full', 'hc-edit-host', many && 'hc-hero--slider', still && 'is-still'].filter(Boolean).join(' ')}
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
      onTouchEnd={onTouchEnd}>
      {edit && <EditLink to={edit.to} label={edit.label} />}
      <div className="hc-hero-stage">
        {slides.map((s, i) => {
          const variant = s.print || print
          const name = `Illustration: ${PRINT_NAMES[variant] || 'African'} print`
          return (
            <div key={`media-${i}`} data-i={i} className={`hc-hero-media${i === idx ? ' is-on' : ''}`} aria-hidden={i === idx ? undefined : true}>
              <div className="hc-hero-zoom">
                {s.image?.src ? (
                  <HcImage {...s.image} priority={i === 0} sizes="100vw" />
                ) : (
                  <PrintArt variant={variant} scale={1.6} label={name} className="hc-hero-print" />
                )}
              </div>
              {!s.image?.src && (
                <span className="hc-print-tag hc-hero-tag" aria-hidden="true">
                  {name}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <span className="hc-hero-scrim" aria-hidden="true" />
      <div className="hc-container hc-hero-inner">
        <div className="hc-hero-text">
          <div className="hc-hero-copies">
            {slides.map((s, i) => {
              const on = i === idx
              return (
                <div
                  key={`${s.title}-${i}`}
                  data-i={i}
                  className={`hc-hero-copyset${on ? ' is-on' : ''}`}
                  aria-roledescription={many ? 'slide' : undefined}
                  aria-label={many ? `${i + 1} of ${count}` : undefined}
                  aria-hidden={on ? undefined : true}
                  inert={!on}>
                  {s.eyebrow && (
                    <p className="hc-eyebrow hc-hero-eyebrow" data-hero-part>
                      {s.eyebrow}
                    </p>
                  )}
                  <Title text={s.title} first={i === 0} active={on} still={still} />
                  {s.lead && (
                    <p className="hc-hero-lead" data-hero-part>
                      {s.lead}
                    </p>
                  )}
                  {(s.primary || s.secondary) && (
                    <div data-hero-part>
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
                    </div>
                  )}
                  {note && i === 0 && !many && (
                    <p className="hc-hero-note" data-hero-part>
                      <Icon name="map-pin" /> {note}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {many && (
            <div className="hc-hero-ui">
              <div className="hc-hero-bars">
                {slides.map((s, i) => (
                  <button
                    key={`bar-${i}`}
                    type="button"
                    data-i={i}
                    className={['hc-hero-bar', i === idx && 'is-on', i < idx && 'is-done'].filter(Boolean).join(' ')}
                    aria-label={`Show slide ${i + 1}: ${s.label || s.title}`}
                    aria-current={i === idx ? 'true' : undefined}
                    onClick={() => go(i)}>
                    <span className="hc-hero-track">
                      <span className="hc-hero-fill" />
                    </span>
                    <span className="hc-hero-bar-label">{s.label || s.title}</span>
                  </button>
                ))}
              </div>
              <div className="hc-hero-nav">
                {/* With several slides the place line sits in this bar, clear of the buttons. */}
                {note && (
                  <p className="hc-hero-place">
                    <Icon name="map-pin" /> <span>{note}</span>
                  </p>
                )}
                {/* Announce slide changes only when the visitor drives them, not on every auto-advance. */}
                <p className="hc-hero-count" aria-live={paused ? 'polite' : 'off'}>
                  <b>{String(idx + 1).padStart(2, '0')}</b> / {String(count).padStart(2, '0')}
                </p>
                {!still && (
                  <button
                    type="button"
                    className="hc-hero-arrow"
                    onClick={() => setStopped((v) => !v)}
                    aria-label={stopped ? 'Play slides' : 'Pause slides'}
                    aria-pressed={stopped}>
                    <Icon name={stopped ? 'play' : 'pause'} />
                  </button>
                )}
                <button type="button" className="hc-hero-arrow" onClick={prev} aria-label="Previous slide">
                  <Icon name="arrow-left" />
                </button>
                <button type="button" className="hc-hero-arrow" onClick={next} aria-label="Next slide">
                  <Icon name="arrow-right" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Hero
