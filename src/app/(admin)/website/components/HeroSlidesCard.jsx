import { useEffect, useState } from 'react'
import { Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import heritApi from '@/helpers/heritApi'
import StatusChip from '@/components/herit/StatusChip'
import { toImage } from '@/app/(public)/site/siteData'

const STEP_MS = 4500

/**
 * Home hero slides (D-023): what visitors see at the top of the home page.
 * The slides come from published content: the home page first, then up to
 * four services that have a photograph, in service order. A live preview
 * crossfades through them; each row links to the editor that changes it.
 */
const HeroSlidesCard = () => {
  const [state, setState] = useState({ ready: false, slides: [], waiting: [] })
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    let live = true
    Promise.all([heritApi.site.home(), heritApi.cms.list('service')])
      .then(([home, list]) => {
        if (!live) return
        const ids = Object.fromEntries((list?.items || []).map((x) => [x.slug, x.id]))
        const page = home?.page || {}
        const services = home?.services || []
        const slides = [
          {
            key: 'home',
            label: 'Home page',
            title: page.headline || 'Home page headline',
            lead: page.intro,
            image: toImage(page.hero),
            to: '/website/pages/home',
          },
          ...services
            .filter((s) => s.hero?.url)
            .slice(0, 4)
            .map((s) => ({
              key: s.slug,
              label: 'Service',
              title: s.title,
              lead: s.summary,
              image: toImage(s.hero),
              to: ids[s.slug] ? `/website/services/${ids[s.slug]}` : '/website/services',
            })),
        ]
        const waiting = services
          .filter((s) => !s.hero?.url)
          .map((s) => ({ key: s.slug, title: s.title, to: ids[s.slug] ? `/website/services/${ids[s.slug]}` : '/website/services' }))
        setState({ ready: true, slides, waiting })
      })
      .catch(() => live && setState({ ready: true, slides: [], waiting: [], error: true }))
    return () => {
      live = false
    }
  }, [])

  const n = state.slides.length
  useEffect(() => {
    if (n < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const t = setInterval(() => setIdx((v) => (v + 1) % n), STEP_MS)
    return () => clearInterval(t)
  }, [n])

  return (
    <Card className="hd-card">
      <Card.Body className="p-0">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-bottom">
          <div>
            <h2 className="h5 mb-0">Home hero slides</h2>
            <div className="small text-muted">The home page photograph first, then each published service that has a photograph (up to four).</div>
          </div>
          {state.ready && !state.error && (
            <StatusChip tone={n > 1 ? 'ok' : 'neutral'}>
              {n} {n === 1 ? 'slide' : 'slides'}
            </StatusChip>
          )}
        </div>
        {!state.ready && <p className="p-3 mb-0 text-muted">Loading the preview…</p>}
        {state.error && <p className="p-3 mb-0 text-muted">The preview could not load. The slides still show on the website.</p>}
        {state.ready && !state.error && (
          <div className="hd-hero-editor">
            <div className="hd-hero-preview" aria-label="Preview of the home hero">
              {state.slides.map((s, i) => (
                <div key={s.key} className={`hd-hero-slide${i === idx % n ? ' is-on' : ''}`} aria-hidden={i === idx % n ? undefined : true}>
                  {s.image?.src && <img src={s.image.src} alt="" />}
                  <span className="hd-hero-scrim" />
                  <div className="hd-hero-copy">
                    <span className="hd-hero-eyebrow">{i === 0 ? 'Made to measure' : 'What I make'}</span>
                    <strong>{s.title}</strong>
                    {s.lead && <span className="hd-hero-lead">{s.lead}</span>}
                  </div>
                </div>
              ))}
              <div className="hd-hero-bars">
                {state.slides.map((s, i) => (
                  <button
                    key={s.key}
                    type="button"
                    className={i === idx % n ? 'is-on' : ''}
                    aria-label={`Show slide ${i + 1}`}
                    onClick={() => setIdx(i)}
                  />
                ))}
              </div>
            </div>
            <ol className="hd-hero-list">
              {state.slides.map((s, i) => (
                <li key={s.key} className={i === idx % n ? 'is-on' : ''}>
                  <span className="hd-hero-thumb">{s.image?.src ? <img src={s.image.src} alt="" /> : null}</span>
                  <span className="min-w-0 flex-grow-1">
                    <span className="d-block fw-semibold text-truncate">{s.title}</span>
                    <span className="d-block small text-muted">
                      {i + 1}. {s.label}
                      {!s.image?.src && ' · no photograph yet, so this slide is text only'}
                    </span>
                  </span>
                  <Link to={s.to} className="small fw-semibold">
                    Edit
                  </Link>
                </li>
              ))}
              {state.waiting.map((s) => (
                <li key={s.key} className="is-waiting">
                  <span className="hd-hero-thumb" />
                  <span className="min-w-0 flex-grow-1">
                    <span className="d-block fw-semibold text-truncate">{s.title}</span>
                    <span className="d-block small text-muted">Add a photograph to show this service as a slide</span>
                  </span>
                  <Link to={s.to} className="small fw-semibold">
                    Add photo
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Card.Body>
    </Card>
  )
}

export default HeroSlidesCard
