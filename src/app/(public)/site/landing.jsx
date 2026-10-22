/* ============================================================
   Home landing sections, "the cutting table" (D-031). Every section
   reads published CMS content through homeMap.js and is not rendered
   when its content is missing. Motion is GSAP with ScrollTrigger on the
   Lenis scroll (SmoothScroll.jsx); under reduced motion nothing moves
   and every section is complete at rest.

   Motion borrowed from the HyperFrames catalogue, rebuilt for the web:
   Kinetic Type Swap (the cloth names), Per Word Rise (headings),
   Word-Sweep Highlight (the mission), Handwritten Write-On (the chalk
   measurement lines) and Accent Underline (the stitch rail).
   ============================================================ */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { Section } from './ui/Section'
import Button from './ui/Button'
import Icon from './ui/Icon'
import HcImage from './ui/HcImage'
import PrintArt from './ui/PrintArt'
import EditLink from './ui/EditLink'
import { printAt, printVariant } from './ui/printPatterns'
import { Rich } from './cmsBlocks'
import { htmlText } from './storySections'
import SiteContactForm from './SiteContactForm'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

const MOTION = '(prefers-reduced-motion: no-preference)'
const WIDE = '(min-width: 1024px)'

/** Is the element below the first screen (so hiding it before it scrolls in never flashes)? */
const belowFold = (el) => !!el && el.getBoundingClientRect().top > window.innerHeight * 0.92

/**
 * Per Word Rise: section headings marked `data-rise` rise word by word from
 * a soft blur as they scroll in. Only headings below the first screen are
 * touched, so nothing visible at load ever disappears.
 */
const useRise = (scope) =>
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        const splits = []
        gsap.utils.toArray('[data-rise]', scope.current).forEach((el) => {
          if (!belowFold(el)) return
          const s = SplitText.create(el, { type: 'words', mask: 'words' })
          splits.push(s)
          gsap.from(s.words, {
            yPercent: 100,
            filter: 'blur(6px)',
            duration: 0.9,
            stagger: 0.05,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          })
        })
        return () => splits.forEach((s) => s.revert())
      })
    },
    { scope },
  )

/** Section heading in the landing style: quiet overline, light serif title, lead on the right. */
const LandHead = ({ id, eyebrow, title, lead, children }) => (
  <div className="hc-land-head">
    <div className="hc-land-head-main">
      {eyebrow && <p className="hc-eyebrow">{eyebrow}</p>}
      <h2 id={id} className="hc-land-title" data-rise="">
        {title}
      </h2>
    </div>
    {(lead || children) && (
      <div className="hc-land-head-side">
        {typeof lead === 'string' ? <p className="hc-lead">{lead}</p> : lead}
        {children}
      </div>
    )}
  </div>
)

/* ------------------------------------------------------------
   Two ways to order: made to measure and company orders
   ------------------------------------------------------------ */

const MTM_POINTS = [
  ['Measurement appointment', 'in person'],
  ['Written quote before work starts', 'step 2'],
  ['Fittings until it sits right', 'step 3'],
]
const COMPANY_POINTS = [
  ['One quote for the whole order', 'billed to you'],
  ['Each wearer measured by name', 'listed'],
  ['Sample approved first', 'before production'],
]

const PathCard = ({ tag, title, text, points, image, print, to, cta }) => (
  <Link to={to} className="hc-path" data-reveal="">
    <span className="hc-path-media">
      {image?.src ? (
        <HcImage {...image} sizes="(min-width: 1024px) 50vw, 100vw" className="hc-path-img" />
      ) : (
        <PrintArt variant={print} label={`Illustration: ${printVariant(print)} cloth`} scale={1.3} className="hc-path-img" />
      )}
    </span>
    <span className="hc-path-body">
      <span className="hc-path-tag">{tag}</span>
      <span className="hc-path-title">{title}</span>
      {text && <span className="hc-path-text">{text}</span>}
      <span className="hc-path-points">
        {points.map(([a, b]) => (
          <span key={a} className="hc-path-point">
            <span>{a}</span>
            <span className="hc-path-point-note">{b}</span>
          </span>
        ))}
      </span>
      <span className="hc-path-go">
        {cta} <Icon name="arrow-right" />
      </span>
    </span>
  </Link>
)

/**
 * The two ways to order, side by side. The made-to-measure card is the
 * made-to-measure service (its title, summary and photograph); the company
 * card is the company orders page. The home page body is the lead.
 */
export const OrderPaths = ({ lead, mtm, company, companyTo, edit }) => {
  const scope = useRef(null)
  useRise(scope)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        gsap.utils.toArray('.hc-path-img', scope.current).forEach((img) => {
          gsap.fromTo(
            img,
            { yPercent: -5 },
            { yPercent: 5, ease: 'none', scrollTrigger: { trigger: img.closest('.hc-path'), start: 'top bottom', end: 'bottom top', scrub: true } },
          )
        })
      })
    },
    { scope },
  )
  if (!mtm && !company) return null
  return (
    <Section tone="paper" labelledBy="paths-title" className="hc-land hc-land--paths" edit={edit}>
      <div ref={scope}>
        <LandHead
          id="paths-title"
          eyebrow="Two ways to order"
          title={
            <>
              For you, or for <em>your whole team.</em>
            </>
          }
          lead={
            lead ? (
              <Rich html={lead} className="hc-lead" />
            ) : (
              'Every piece starts with a conversation and a written quote. Nothing is cut until you have agreed the price and the date.'
            )
          }
        />
        <div className={`hc-paths${mtm && company ? '' : ' hc-paths--one'}`}>
          {mtm && (
            <PathCard
              tag="Made to measure"
              title={mtm.title}
              text={mtm.summary}
              points={MTM_POINTS}
              image={mtm.image}
              print="adire"
              to={mtm.to}
              cta="See the service"
            />
          )}
          {company && (
            <PathCard
              tag="Company orders"
              title={company.headline}
              text={company.intro}
              points={COMPANY_POINTS}
              image={company.image}
              print="asooke"
              to={companyTo}
              cta="Discuss a company order"
            />
          )}
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------
   The cloth: a pinned run along the table (wide screens)
   ------------------------------------------------------------ */

/**
 * Kinetic Type Swap: one masked slot rolls through the cloth names and
 * settles on each in turn. Screen readers get the whole list once; under
 * reduced motion the list is shown as plain text.
 */
const ClothSwap = ({ names }) => {
  const [i, setI] = useState(0)
  const [still, setStill] = useState(true)
  useEffect(() => {
    const moving = !!window.matchMedia?.(MOTION).matches
    setStill(!moving)
    if (!moving || names.length < 2) return undefined
    const t = setInterval(() => setI((v) => (v + 1) % names.length), 2200)
    return () => clearInterval(t)
  }, [names.length])
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
  if (still || names.length < 2) return <span className="hc-swap-still">{list}</span>
  return (
    <>
      <span className="hc-sr-only">{list}</span>
      <span className="hc-swap" aria-hidden="true">
        <span key={i} className="hc-swap-word">
          {names[i]}
        </span>
      </span>
    </>
  )
}

/**
 * The fabric story page: an introduction beside one panel per "## Fabric"
 * section, each over its African print (labelled as an illustration). From
 * 1024px the section pins and the panels run sideways as you scroll, the
 * prints drifting inside their frames; narrower or under reduced motion the
 * panels stack.
 */
export const ClothRun = ({ page, cloths, edit }) => {
  const scope = useRef(null)
  const track = useRef(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(`${MOTION} and ${WIDE}`, () => {
        const el = track.current
        if (!el) return
        const dist = () => Math.max(0, el.scrollWidth - window.innerWidth)
        const run = gsap.to(el, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top top',
            end: () => `+=${dist()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        })
        gsap.utils.toArray('.hc-bolt-art', el).forEach((art) => {
          gsap.fromTo(
            art,
            { xPercent: -6 },
            {
              xPercent: 6,
              ease: 'none',
              scrollTrigger: { trigger: art.closest('.hc-bolt'), containerAnimation: run, start: 'left right', end: 'right left', scrub: true },
            },
          )
        })
        gsap.utils.toArray('.hc-bolt-name', el).forEach((h) => {
          gsap.fromTo(
            h,
            { x: 90 },
            {
              x: 0,
              ease: 'none',
              scrollTrigger: { trigger: h.closest('.hc-bolt'), containerAnimation: run, start: 'left right', end: 'center center', scrub: true },
            },
          )
        })
      })
    },
    { scope, dependencies: [cloths.length] },
  )
  if (!page || !cloths.length) return null
  const hero = page.image
  return (
    <section ref={scope} className="hc-section hc-ink hc-section--ink hc-land hc-land--cloth hc-edit-host" aria-labelledby="cloth-title">
      {/* This section pins, so it is a plain <section> and places the staff Edit control itself. */}
      {edit && <EditLink to={edit.to} label={edit.label} />}
      <div ref={track} className="hc-cloth-track">
        <div className="hc-cloth-intro">
          <p className="hc-eyebrow">The cloth</p>
          <h2 id="cloth-title" className="hc-land-title">
            {page.headline}
          </h2>
          {page.intro && <p className="hc-lead">{page.intro}</p>}
          <p className="hc-cloth-swapline">
            Cut in <ClothSwap names={cloths.map((c) => c.title)} />
          </p>
          {hero?.src && <HcImage {...hero} ratio="4 / 3" sizes="(min-width: 1024px) 30vw, 100vw" className="hc-cloth-hero" />}
          <p className="hc-cloth-hint" aria-hidden="true">
            Keep scrolling to move along the table <Icon name="arrow-right" />
          </p>
        </div>
        {cloths.map((c, i) => (
          <article key={c.title} className="hc-bolt" aria-labelledby={`cloth-${i}`}>
            <div className="hc-bolt-media">
              <PrintArt variant={printVariant(c.title, printAt(i))} label={`Illustration: ${c.title} cloth`} scale={1.6} className="hc-bolt-art" />
              <span className="hc-bolt-cap">Illustration</span>
            </div>
            <div className="hc-bolt-copy">
              <span className="hc-bolt-n">
                Cloth {i + 1} of {cloths.length}
              </span>
              <h3 id={`cloth-${i}`} className="hc-bolt-name">
                {c.title}
              </h3>
              <Rich html={c.html} className="hc-bolt-text" />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------
   The measurement appointment: a tailor's docket
   ------------------------------------------------------------ */

const MEASURES = [
  { k: 'neck', label: 'Neck', cm: 41 },
  { k: 'shoulder', label: 'Shoulder', cm: 47 },
  { k: 'chest', label: 'Chest', cm: 104 },
  { k: 'sleeve', label: 'Sleeve', cm: 64 },
  { k: 'waist', label: 'Waist', cm: 92 },
  { k: 'length', label: 'Top length', cm: 112 },
]

/** Measurement lines on the kaftan outline (370 × 440 drawing). */
const DIMS = {
  neck: 'M150 44 Q180 70 210 44',
  shoulder: 'M90 30 L270 30 M90 24 L90 36 M270 24 L270 36',
  sleeve: 'M284 50 L358 160 M279 54 L289 46 M353 164 L363 156',
  chest: 'M98 168 L262 168 M98 162 L98 174 M262 162 L262 174',
  waist: 'M98 296 L262 296 M98 290 L98 302 M262 290 L262 302',
  length: 'M76 210 L76 412 M70 210 L82 210 M70 412 L82 412',
}
const LABELS = [
  ['neck', 166, 86],
  ['shoulder', 155, 20],
  ['sleeve', 326, 98],
  ['chest', 162, 160],
  ['waist', 162, 288],
  ['length', 64, 330, 'rotate(-90 64 330)'],
]

/**
 * What is written down at the measurement appointment, as a docket beside a
 * kaftan outline. Pointing at or focusing a row lights its line on the
 * garment; cm and inches switch. The values are examples and say so. The
 * chalk lines draw on once as the docket scrolls in (visible at once under
 * reduced motion).
 */
export const MeasureDocket = ({ bookTo, bookLabel }) => {
  const scope = useRef(null)
  const [unit, setUnit] = useState('cm')
  const [on, setOn] = useState('')
  useRise(scope)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        const card = scope.current?.querySelector('.hc-docket')
        if (!belowFold(card)) return undefined
        const lines = gsap.utils.toArray('.hc-docket-dim', scope.current)
        lines.forEach((p) => {
          const len = p.getTotalLength()
          gsap.set(p, { strokeDasharray: `${len} ${len}`, strokeDashoffset: len })
        })
        gsap
          .timeline({ scrollTrigger: { trigger: card, start: 'top 78%', once: true } })
          .from(card, { y: 40, rotate: -1.2, duration: 1, ease: 'power3.out' })
          .to(lines, { strokeDashoffset: 0, duration: 0.7, stagger: 0.14, ease: 'power2.inOut' }, '-=0.55')
          .from(gsap.utils.toArray('.hc-docket-row', scope.current), { x: -10, autoAlpha: 0, duration: 0.45, stagger: 0.06, ease: 'power2.out' }, '<')
        return () => gsap.set(lines, { clearProps: 'strokeDasharray,strokeDashoffset' })
      })
    },
    { scope },
  )
  const value = (cm) => (unit === 'cm' ? `${cm} cm` : `${(cm / 2.54).toFixed(1)} in`)
  const lit = (k) => (on === k ? ' is-on' : '')
  return (
    <Section labelledBy="docket-title" className="hc-land hc-land--docket">
      <div ref={scope} className="hc-docket-grid">
        <div className="hc-docket-copy">
          <p className="hc-eyebrow">The measurement appointment</p>
          <h2 id="docket-title" className="hc-land-title" data-rise="">
            What we write down when we measure you.
          </h2>
          <p className="hc-lead">
            The appointment takes your measurements once and keeps them on your record, so the next order starts from the same numbers.
          </p>
          <ul className="hc-docket-checks">
            <li>Measurements stay on your customer record</li>
            <li>Your quote lists the cloth, the garment and the date</li>
            <li>Fittings follow before you collect</li>
          </ul>
          {bookTo && (
            <Button to={bookTo} iconEnd="arrow-right">
              {bookLabel || 'Request a measurement appointment'}
            </Button>
          )}
        </div>
        <div className="hc-docket">
          <div className="hc-docket-top">
            <span>
              Docket <b>HC-EXAMPLE</b> · kaftan
            </span>
            <span className="hc-units" role="group" aria-label="Units">
              {['cm', 'in'].map((u) => (
                <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}>
                  {u}
                </button>
              ))}
            </span>
          </div>
          <svg className="hc-docket-figure" viewBox="0 0 370 440" role="img" aria-label="Outline of a kaftan with a line for each measurement">
            <path
              className="hc-docket-garment"
              d="M150 44 Q180 70 210 44 L270 60 L345 172 L318 190 L262 124 L262 412 L98 412 L98 124 L42 190 L15 172 L90 60 Z"
            />
            <path className="hc-docket-seam" d="M180 62 L180 160 M98 124 L262 124" />
            {Object.entries(DIMS).map(([k, d]) => (
              <path key={k} className={`hc-docket-dim${lit(k)}`} d={d} />
            ))}
            {LABELS.map(([k, x, y, t]) => (
              <text key={k} className={`hc-docket-label${lit(k)}`} x={x} y={y} transform={t}>
                {k}
              </text>
            ))}
          </svg>
          <ul className="hc-docket-list">
            {MEASURES.map((m) => (
              <li
                key={m.k}
                className={`hc-docket-row${lit(m.k)}`}
                tabIndex={0}
                onPointerEnter={() => setOn(m.k)}
                onPointerLeave={() => setOn('')}
                onFocus={() => setOn(m.k)}
                onBlur={() => setOn('')}>
                <span>{m.label}</span>
                <b>{value(m.cm)}</b>
              </li>
            ))}
            <li className="hc-docket-more">Then trousers: waist, hip, thigh and length.</li>
          </ul>
          <p className="hc-docket-note">Example values. Point at a row to find it on the garment.</p>
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------
   How it works: steps on a stitch line
   ------------------------------------------------------------ */

const PROCESS = [
  { title: 'Tell us what you need', desc: 'Send an enquiry with the occasion, the date and any photos you like.' },
  { title: 'Measurement appointment', desc: 'We meet, choose the cloth and take your measurements. You get a written quote before any work starts.' },
  { title: 'Cutting and fittings', desc: 'Once the quote is agreed, the piece is cut to your pattern and fitted until it sits right.' },
  { title: 'Collect', desc: 'Pay any balance and collect. Your account shows each stage along the way.' },
]

/**
 * The steps of the How it works page (else the standard four) on a stitch
 * line that runs across as you scroll, lighting each step as it passes.
 * Fully stitched and lit at rest, below 1024px and under reduced motion.
 */
export const StitchProcess = ({ title, lead, steps, moreTo, edit }) => {
  const scope = useRef(null)
  const list = steps?.length ? steps : PROCESS
  useRise(scope)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(`${MOTION} and ${WIDE}`, () => {
        const items = gsap.utils.toArray('.hc-stitch-step', scope.current)
        const rail = scope.current?.querySelector('.hc-stitch-rail-fill')
        if (!rail || !belowFold(rail)) return undefined
        const light = (p) => items.forEach((st, i) => st.classList.toggle('is-lit', p >= i / Math.max(1, items.length - 1) - 0.02))
        light(0)
        gsap.fromTo(
          rail,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: { trigger: rail.closest('.hc-stitch'), start: 'top 80%', end: 'bottom 55%', scrub: 0.6, onUpdate: (s) => light(s.progress) },
          },
        )
        return () => items.forEach((st) => st.classList.add('is-lit'))
      })
    },
    { scope, dependencies: [list.length] },
  )
  return (
    <Section tone="paper" labelledBy="stitch-title" className="hc-land hc-land--stitch" edit={edit}>
      <div ref={scope}>
        <LandHead id="stitch-title" eyebrow="How it works" title={title || 'From first message to handover.'} lead={lead}>
          {moreTo && (
            <p>
              <Link to={moreTo} className="hc-card-link">
                The steps in full <Icon name="arrow-right" />
              </Link>
            </p>
          )}
        </LandHead>
        <div className="hc-stitch">
          <span className="hc-stitch-rail" aria-hidden="true">
            <span className="hc-stitch-rail-fill" />
          </span>
          <ol className={`hc-stitch-list hc-stitch-list--${Math.min(list.length, 5)}`}>
            {list.map((s, i) => (
              <li key={s.title} className="hc-stitch-step is-lit">
                <span className="hc-stitch-dot" aria-hidden="true" />
                <span className="hc-stitch-n">Step {i + 1}</span>
                <h3 className="hc-stitch-title">{s.title}</h3>
                <p>{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------
   Our mission: words come up to full strength as you read
   ------------------------------------------------------------ */

/**
 * The about page's mission as a large quote on ink (Word-Sweep Highlight:
 * each word brightens as the quote scrolls through the screen), with the
 * about headline, its photograph and a link to the story. Fully bright at
 * rest and under reduced motion.
 */
export const MissionBand = ({ about, mission, image, edit }) => {
  const scope = useRef(null)
  const quote = mission ? htmlText(mission.html) : ''
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        const q = scope.current?.querySelector('.hc-mission-quote')
        if (!q) return undefined
        const s = SplitText.create(q, { type: 'words' })
        gsap.fromTo(
          s.words,
          { opacity: 0.28 },
          { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: q, start: 'top 80%', end: 'bottom 45%', scrub: true } },
        )
        return () => s.revert()
      })
    },
    { scope, dependencies: [quote] },
  )
  if (!about) return null
  return (
    <Section tone="ink" labelledBy="mission-title" className="hc-land hc-land--mission" edit={edit}>
      <div ref={scope} className={`hc-mission-grid${image?.src ? '' : ' hc-mission-grid--text'}`}>
        <div className="hc-mission-copy">
          <p className="hc-eyebrow" id="mission-title">
            {mission?.title || 'About'}
          </p>
          {quote ? <blockquote className="hc-mission-quote">{quote}</blockquote> : <p className="hc-mission-quote">{about.intro || about.headline}</p>}
          <div className="hc-mission-foot">
            <span className="hc-mission-about">{about.headline}</span>
            <Link to="/about" className="hc-card-link">
              Read our story <Icon name="arrow-right" />
            </Link>
          </div>
        </div>
        {image?.src && <HcImage {...image} ratio="4 / 5" sizes="(min-width: 1024px) 34vw, 100vw" className="hc-mission-img" />}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------
   Enquire: business details beside the enquiry form
   ------------------------------------------------------------ */

const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`
const handleOf = (url) => {
  try {
    return `@${new URL(url).pathname.replace(/^\/+|\/+$/g, '').split('/')[0]}`
  } catch {
    return url
  }
}

/** One business fact. The text is always selectable; the link and the copy button are conveniences. */
const Fact = ({ label, icon, text, href, external }) => {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      },
      () => {},
    )
  }
  return (
    <div className="hc-enq-fact">
      <dt>
        <Icon name={icon} /> {label}
      </dt>
      <dd>
        {href ? (
          <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {text}
          </a>
        ) : (
          <span>{text}</span>
        )}
        <button type="button" className="hc-enq-copy" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </dd>
    </div>
  )
}

/**
 * The closing section: the contact page's headline and intro, every business
 * detail that is set (address, email, phone, WhatsApp, Instagram, hours) and
 * the enquiry form, which sends to the HeritOS enquiries inbox (contact.php).
 */
export const EnquiryBand = ({ contact, business, shopOn, edit }) => {
  const scope = useRef(null)
  useRise(scope)
  const b = business || {}
  const instagram = b.socials?.find((s) => s.key === 'instagram')
  // business.whatsapp is the checked wa.me link; show its number.
  const waNumber = b.whatsapp ? `+${String(b.whatsapp).replace(/\D/g, '')}` : ''
  return (
    <Section labelledBy="enquire-title" className="hc-land hc-land--enquire" id="enquire" edit={edit}>
      <div ref={scope} className="hc-enquire">
        <div className="hc-enquire-copy">
          <p className="hc-eyebrow">Enquire</p>
          <h2 id="enquire-title" className="hc-land-title" data-rise="">
            {contact?.headline || 'Start with one message.'}
          </h2>
          <p className="hc-lead">
            {contact?.intro || 'Tell us the garment, the occasion and the date. We reply with the next step and arrange your appointment.'}
          </p>
          <dl className="hc-enq-facts">
            {b.address && <Fact label="Visit" icon="map-pin" text={b.address} />}
            {b.email && <Fact label="Email" icon="mail" text={b.email} href={`mailto:${b.email}`} />}
            {b.phone && <Fact label="Phone" icon="phone" text={b.phone} href={telHref(b.phone)} />}
            {waNumber && <Fact label="WhatsApp" icon="whatsapp" text={waNumber} href={b.whatsapp} external />}
            {instagram && <Fact label="Instagram" icon="instagram" text={handleOf(instagram.url)} href={instagram.url} external />}
            {b.hours && <Fact label="Hours" icon="clock" text={b.hours} />}
          </dl>
        </div>
        <div className="hc-enquire-form">
          <SiteContactForm shopOn={shopOn} />
        </div>
      </div>
    </Section>
  )
}
