/* ============================================================
   Public page sections built from the UI kit (ui/). No counters,
   marquees or logo strips (the home hero slider is the one carousel,
   D-023): every section shows real data or is not rendered at all.
   ============================================================ */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Section, SectionHead } from './ui/Section'
import Button from './ui/Button'
import Icon from './ui/Icon'
import HcImage from './ui/HcImage'

export { SectionHead }

/* Published pieces from the live catalogue (shop only). Hidden when empty. */
export const Lookbook = ({ eyebrow, title, products, formatNgn }) => {
  if (!products?.length) return null
  return (
    <Section>
      <SectionHead eyebrow={eyebrow} title={title}>
        <p>
          <Link to="/shop" className="hc-card-link">
            View all pieces <Icon name="arrow-right" />
          </Link>
        </p>
      </SectionHead>
      <div className="hc-grid hc-grid--4">
        {products.map((p) => (
          <Link key={p.slug} to={`/shop/${p.slug}`} className="hc-product" data-reveal="">
            <div className="hc-tile hc-product-media" />
            <div className="hc-product-body">
              {p.fabric && <span className="hc-product-fab">{p.fabric}</span>}
              <span className="hc-product-name">{p.name}</span>
              <span className="hc-product-price">{formatNgn(p.priceNgn)}</span>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------
   Shared informative bands (D-023). Their copy describes how the
   service really works in HeritOS (enquiry, appointment and quote,
   fittings, collection, the online account, company orders); it
   holds no numbers, offers or client claims (CONTENT.md, BR-20).
   ------------------------------------------------------------ */

const FACTS = [
  { icon: 'ruler', title: 'Made to your measurements', desc: 'A pattern is drafted from your own measurements, not a standard size.' },
  { icon: 'clock', title: 'Fittings by appointment', desc: 'You choose the time. The date for your piece is agreed in the written quote.' },
  { icon: 'notes', title: 'Follow your order online', desc: 'Your account shows the stage, the payments and the next fitting.' },
]

const PROCESS = [
  { title: 'Tell me what you need', desc: 'Send an enquiry with the occasion, the date and any photos you like.' },
  { title: 'Measurement appointment', desc: 'We meet, choose the cloth and take your measurements. You get a written quote before any work starts.' },
  { title: 'Cutting and fittings', desc: 'Once the quote is agreed, the piece is cut to your pattern and fitted until it sits right.' },
  { title: 'Collect', desc: 'Pay any balance and collect. Your account shows each stage along the way.' },
]

const COMPANY_POINTS = [
  'One quote billed to your company',
  'Each wearer measured and listed by name',
  'The sample approved before production starts',
  'Handover recorded item by item',
]

/* Statement beside three facts about the way the work is done. `children` (CMS rich text) replaces the default statement. */
export const PromiseBand = ({ eyebrow = 'The Herit way', statement, tone = 'paper', children }) => (
  <Section tone={tone} className="hc-section--promise" aria-label={eyebrow}>
    <div className="hc-promise">
      <div className="hc-promise-copy" data-reveal="">
        <p className="hc-eyebrow">{eyebrow}</p>
        {children || <p className="hc-promise-statement">{statement}</p>}
      </div>
      <ul className="hc-facts-list" data-reveal="">
        {FACTS.map((f) => (
          <li key={f.title}>
            <Icon name={f.icon} />
            <div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </Section>
)

/* Four steps on a rail that fills amber as the steps are revealed. */
export const ProcessBand = ({ tone = 'paper', title = 'From first message to handover', lead, moreTo }) => (
  <Section tone={tone} labelledBy="process-title" className="hc-section--process">
    <SectionHead id="process-title" eyebrow="How it works" title={title} lead={lead}>
      {moreTo && (
        <p>
          <Link to={moreTo} className="hc-card-link">
            The steps in full <Icon name="arrow-right" />
          </Link>
        </p>
      )}
    </SectionHead>
    <ol className="hc-process">
      {PROCESS.map((s, i) => (
        <li key={s.title} data-reveal="" style={{ '--hc-reveal-delay': `${i * 90}ms` }}>
          <span className="hc-process-n">Step {i + 1}</span>
          <h3>{s.title}</h3>
          <p>{s.desc}</p>
        </li>
      ))}
    </ol>
  </Section>
)

/* Company orders: photograph, what a company gets, one action. */
export const CompanyBand = ({ title, lead, image, to, tone }) => (
  <Section tone={tone} labelledBy="company-band" className="hc-section--band">
    <div className={`hc-band${image?.src ? '' : ' hc-band--text'}`}>
      {image?.src && <HcImage {...image} ratio="5 / 6" sizes="(min-width: 1024px) 50vw, 100vw" className="hc-band-media" />}
      <div className="hc-band-copy" data-reveal="">
        <p className="hc-eyebrow">Company orders</p>
        <h2 id="company-band" className="hc-h2">
          {title || 'Uniforms and event wear for your whole team'}
        </h2>
        <p className="hc-lead">
          {lead ||
            'For teams, events and wedding parties: one brief, many wearers, and a clear record of who has been measured and who has collected.'}
        </p>
        <ul className="hc-ticks">
          {COMPANY_POINTS.map((p) => (
            <li key={p}>
              <Icon name="check" /> <span>{p}</span>
            </li>
          ))}
        </ul>
        <Button {...(String(to).startsWith('#') ? { href: to } : { to })} iconEnd="arrow-right">
          Ask about a company order
        </Button>
      </div>
    </div>
  </Section>
)

/* Numbered steps with the amber rule that fills as each step is revealed. */
export const ProcessSteps = ({ eyebrow, title, lead, steps, tone }) => (
  <Section tone={tone}>
    <SectionHead eyebrow={eyebrow} title={title} lead={lead} />
    <ol className="hc-steps">
      {steps.map((s) => (
        <li key={s.title} data-reveal="">
          <h3>{s.title}</h3>
          <p>{s.desc}</p>
        </li>
      ))}
    </ol>
  </Section>
)

/*
 * Consented, published testimonials only, as in the approved prototype: one
 * large centred quote that rotates every 6.5s with dots to choose. It pauses
 * on hover and focus, never moves under reduced motion, and is not rendered
 * when there are no published reviews.
 */
export const Testimonials = ({ eyebrow = 'What clients say', quotes }) => {
  const n = quotes?.length || 0
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  // Stopped by the pause button or by choosing a review (WCAG 2.2.2).
  const [stopped, setStopped] = useState(false)
  const [still] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const moving = n > 1 && !paused && !stopped && !still
  useEffect(() => {
    if (!moving) return undefined
    const t = setInterval(() => setI((v) => (v + 1) % n), 6500)
    return () => clearInterval(t)
  }, [n, moving])
  if (!n) return null
  const q = quotes[i % n]
  return (
    <Section tone="alt" className="hc-section--voice" labelledBy="voice-title">
      <div
        className="hc-voice"
        data-reveal=""
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}>
        <h2 id="voice-title" className="hc-eyebrow">
          {eyebrow}
        </h2>
        <figure key={i} className="hc-voice-quote" aria-live={moving ? 'off' : 'polite'}>
          <blockquote>“{q.text}”</blockquote>
          <figcaption>{[q.name, q.role || q.location].filter(Boolean).join(', ')}</figcaption>
        </figure>
        {n > 1 && (
          <div className="hc-voice-dots" role="group" aria-label="Choose a review">
            {quotes.map((r, k) => (
              <button
                key={`${r.name}-${k}`}
                type="button"
                aria-label={`Review ${k + 1} of ${n}`}
                aria-pressed={k === i % n}
                onClick={() => {
                  setI(k)
                  setStopped(true)
                }}
              />
            ))}
            {!still && (
              <button
                type="button"
                className="hc-voice-toggle"
                aria-label={stopped ? 'Play reviews' : 'Pause reviews'}
                aria-pressed={stopped}
                onClick={() => setStopped((v) => !v)}>
                <Icon name={stopped ? 'play' : 'pause'} />
              </button>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}

/* Published journal posts only. Not rendered when there are none. */
export const JournalGrid = ({ eyebrow, title, posts }) => {
  if (!posts?.length) return null
  return (
    <Section>
      <SectionHead eyebrow={eyebrow} title={title} />
      <div className="hc-grid hc-grid--3">
        {posts.slice(0, 3).map((p) => (
          <article key={p.slug} className="hc-journal-card" data-reveal="">
            {p.cat && <span className="hc-journal-date">{p.cat}</span>}
            <div className="hc-journal-body">
              {p.date && <span className="hc-journal-date">{p.date}</span>}
              <h3 className="hc-h4">
                <Link to={p.to || `/journal/${p.slug}`}>{p.title}</Link>
              </h3>
              {p.excerpt && <p>{p.excerpt}</p>}
            </div>
          </article>
        ))}
      </div>
    </Section>
  )
}

/* Closing action: one primary, one secondary, over an optional dimmed photograph. */
export const ClosingAction = ({ eyebrow = 'Start here', title, text, primary, secondary, image }) => (
  <Section className={`hc-section--closing${image?.src ? ' hc-section--closing-media' : ''}`}>
    {image?.src && (
      <div className="hc-closing-media" aria-hidden="true">
        <HcImage {...image} alt="" sizes="100vw" />
      </div>
    )}
    <div className="hc-cta-band" data-reveal="">
      {eyebrow && <p className="hc-eyebrow">{eyebrow}</p>}
      <h2 className="hc-h2">{title}</h2>
      {text && <p>{text}</p>}
      <div className="hc-cta-actions">
        {primary && (
          <Button to={primary.to} iconEnd="arrow-right">
            {primary.label}
          </Button>
        )}
        {secondary && (
          <Button to={secondary.to} variant="secondary">
            {secondary.label}
          </Button>
        )}
      </div>
    </div>
  </Section>
)
