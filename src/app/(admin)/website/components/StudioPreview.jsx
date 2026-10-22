import { htmlText, splitSections } from '@/app/(public)/site/storySections'

/**
 * One Home section drawn in the public site's look, small enough to sit beside
 * the editor (Home studio, D-031). It is a proof, not the page itself: text
 * comes from the drafts being edited, lists (services, questions, posts) from
 * what is published. Colours are the site's paper and ink tokens, scoped to
 * `.hw-site` so they never leak into the admin theme.
 *
 * `section` is a HOME_SECTIONS entry; `page` the draft page data behind it
 * ({headline, intro, body}); `ctx` holds the published lists and images.
 */
const Hidden = ({ label, why }) => (
  <div className="hw-s-hidden">
    <b>{label} is hidden</b>
    {why}
  </div>
)

const StudioPreview = ({ section, page, ctx, shown, note }) => {
  const k = section.key
  const h = page?.headline || ''
  const intro = page?.intro || ''
  if (!shown) return <Hidden label={section.label} why={note} />
  switch (k) {
    case 'hero': {
      const s = ctx.slides?.[0]
      return (
        <div className="hw-s hw-s--dark hw-s--hero hc-ink" style={s?.image ? { backgroundImage: `url(${s.image})` } : undefined}>
          {s?.eyebrow && <p className="hw-s-over hw-s-over--gold">{s.eyebrow}</p>}
          <p className="hw-s-h hw-s-h--xl">{s?.headline || ctx.homeHeadline}</p>
          {s?.lead && <p className="hw-s-p">{s.lead}</p>}
          <div className="hw-s-btns">
            <span>Request a measurement appointment</span>
            <span>Discuss a company order</span>
          </div>
        </div>
      )
    }
    case 'paths':
      return (
        <div className="hw-s">
          <p className="hw-s-over">Two ways to order</p>
          <p className="hw-s-h">
            For you, or for <em>your whole team.</em>
          </p>
          <p className="hw-s-p">{htmlText(page?.body) || intro}</p>
          <div className="hw-s-cards">
            {[ctx.mtm, ctx.company].filter(Boolean).map((c) => (
              <div key={c.tag} className="hw-s-card">
                <div className="hw-s-im" style={c.image ? { backgroundImage: `url(${c.image})` } : undefined} />
                <div>
                  <span className="hw-s-tag">{c.tag}</span>
                  <b>{c.title}</b>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    case 'cloth': {
      const cloths = splitSections(page?.body).sections
      return (
        <div className="hw-s hw-s--dark hc-ink">
          <p className="hw-s-over">The cloth</p>
          <p className="hw-s-h">{h}</p>
          {intro && <p className="hw-s-p">{intro}</p>}
          <div className="hw-s-bolts">
            {cloths.slice(0, 3).map((c, i) => (
              <div key={c.title} className="hw-s-bolt">
                <div className={`hw-s-im hw-print hw-print--${i % 3}`} />
                <b>{c.title}</b>
                <span>{htmlText(c.html).split('. ')[0]}.</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    case 'services':
      return (
        <div className="hw-s">
          <p className="hw-s-over">Services</p>
          <p className="hw-s-h">{h || 'Services, cut to measure'}</p>
          {intro && <p className="hw-s-p">{intro}</p>}
          <ul className="hw-s-list">
            {(ctx.services || []).map((s) => (
              <li key={s.slug}>
                {s.title}
                <span aria-hidden="true">→</span>
              </li>
            ))}
          </ul>
        </div>
      )
    case 'docket':
      return (
        <div className="hw-s">
          <p className="hw-s-over">The measurement appointment</p>
          <p className="hw-s-h">What we write down when we measure you.</p>
          <ul className="hw-s-list hw-s-list--mono">
            <li>
              Neck<span>41 cm</span>
            </li>
            <li>
              Chest<span>104 cm</span>
            </li>
            <li>
              Sleeve<span>64 cm</span>
            </li>
          </ul>
          <p className="hw-s-note">Example values, as on the site.</p>
        </div>
      )
    case 'process': {
      const steps = splitSections(page?.body).sections
      return (
        <div className="hw-s hw-s--alt">
          <p className="hw-s-over">How it works</p>
          <p className="hw-s-h">{h || 'From first message to handover.'}</p>
          {intro && <p className="hw-s-p">{intro}</p>}
          <div className="hw-s-steps">
            {(steps.length ? steps : [{ title: 'Tell us what you need' }, { title: 'Measurement appointment' }, { title: 'Cutting and fittings' }, { title: 'Collect' }])
              .slice(0, 4)
              .map((s) => (
                <div key={s.title}>
                  <i />
                  <b>{s.title}</b>
                </div>
              ))}
          </div>
        </div>
      )
    }
    case 'mission': {
      const m = splitSections(page?.body).sections.find((x) => /mission/i.test(x.title))
      return (
        <div className="hw-s hw-s--dark hc-ink">
          <p className="hw-s-over">{m?.title || 'About'}</p>
          <p className="hw-s-quote">{m ? htmlText(m.html) : intro || h}</p>
          <p className="hw-s-p hw-s-p--small">{h}</p>
        </div>
      )
    }
    case 'faqs':
      return (
        <div className="hw-s">
          <p className="hw-s-over">Before you ask</p>
          <p className="hw-s-h">Questions people ask first</p>
          <ul className="hw-s-list">
            {(ctx.faqs || []).map((f) => (
              <li key={f.id}>
                {f.question}
                <span aria-hidden="true">+</span>
              </li>
            ))}
          </ul>
        </div>
      )
    case 'journal':
      return (
        <div className="hw-s">
          <p className="hw-s-over">Journal</p>
          <p className="hw-s-h">Notes on cloth and craft</p>
          <div className="hw-s-cards hw-s-cards--3">
            {(ctx.journal || []).slice(0, 3).map((p, i) => (
              <div key={p.slug} className="hw-s-card">
                <div className={`hw-s-im hw-print hw-print--${i % 3}`} />
                <div>
                  <b>{p.title}</b>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    case 'enquire':
      return (
        <div className="hw-s">
          <p className="hw-s-over">Enquire</p>
          <p className="hw-s-h">{h || 'Start with one message.'}</p>
          {intro && <p className="hw-s-p">{intro}</p>}
          <div className="hw-s-form">
            <i />
            <i />
            <i />
            <i />
            <i className="hw-s-form-wide" />
          </div>
        </div>
      )
    default:
      return (
        <div className="hw-s">
          <p className="hw-s-h">{section.label}</p>
          <p className="hw-s-p">{note}</p>
        </div>
      )
  }
}

export default StudioPreview
