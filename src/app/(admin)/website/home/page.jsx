import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Spinner } from 'react-bootstrap'
import gsap from 'gsap'
import Lenis from 'lenis'
import PageTitle from '@/components/PageTitle'
import PageHeader from '@/components/herit/PageHeader'
import LoadError from '@/components/herit/LoadError'
import SaveState from '@/components/herit/SaveState'
import StatusChip from '@/components/herit/StatusChip'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import heritApi from '@/helpers/heritApi'
import { htmlToText, textToHtml } from '@/helpers/richText'
import { HOME_SECTIONS, homeStates, loadHome, madeToMeasureOf } from '@/app/(public)/site/homeMap'
import { toImage } from '@/app/(public)/site/siteData'
import StudioPreview from '../components/StudioPreview'

/*
 * What each Home section edits here. `page` is the CMS page whose draft the
 * fields write to (saved as you type, published from the bar below); `fields`
 * are [key, label, kind]; `more` links to the full editor for the rest
 * (lists, images, the long text). Sections with no page are filled from lists
 * edited elsewhere, or are fixed by design.
 */
const STUDIO = {
  hero: { more: { to: '/website/slides', label: 'Edit the hero slides' } },
  paths: {
    page: 'home',
    fields: [['body', 'Introduction beside the two cards', 'rich']],
    more: { to: '/website/pages/home', label: 'All home page fields' },
  },
  cloth: {
    page: 'fabrics',
    fields: [
      ['headline', 'Headline', 'text'],
      ['intro', 'Introduction', 'textarea'],
    ],
    more: { to: '/website/pages/fabrics', label: 'Edit the cloth descriptions' },
  },
  services: {
    page: 'services_intro',
    fields: [
      ['headline', 'Headline', 'text'],
      ['intro', 'Introduction', 'textarea'],
    ],
    more: { to: '/website/services', label: 'Add or change services' },
  },
  docket: { fixed: true },
  work: { more: { to: '/website/work', label: 'Open Our work' } },
  process: {
    page: 'how_it_works',
    fields: [
      ['headline', 'Headline', 'text'],
      ['intro', 'Introduction', 'textarea'],
    ],
    more: { to: '/website/pages/how_it_works', label: 'Edit the steps' },
  },
  mission: {
    page: 'about',
    fields: [['headline', 'About headline, under the quote', 'text']],
    more: { to: '/website/pages/about', label: 'Edit the mission and the About page' },
  },
  shop: { more: { to: '/channels', label: 'Shop settings' } },
  reviews: { more: { to: '/content', label: 'Open testimonials' } },
  faqs: { more: { to: '/website/faqs', label: 'Choose the questions for Home' } },
  journal: { more: { to: '/content', label: 'Open the journal' } },
  enquire: {
    page: 'contact',
    fields: [
      ['headline', 'Headline', 'text'],
      ['intro', 'Introduction', 'textarea'],
    ],
    more: { to: '/website/profile', label: 'Business details shown beside the form' },
  },
}
const PAGE_KEYS = ['home', 'fabrics', 'services_intro', 'how_it_works', 'about', 'contact', 'company']
const DRAFT_ENTITIES = [
  ['page', 'Pages'],
  ['slide', 'Hero slides'],
  ['service', 'Services'],
  ['project', 'Our work'],
  ['faq', 'Questions'],
]
const MAX = { headline: 160, intro: 600 }

/** A tiny drawing of each landing section for the map. */
const Thumb = ({ k }) => {
  const dark = ['hero', 'cloth', 'mission'].includes(k)
  return (
    <span className={`hw-thumb${dark ? ' hw-thumb--dark' : ''}`} aria-hidden="true">
      {k === 'paths' || k === 'journal' || k === 'cloth' ? (
        <span className={`hw-thumb-cols hw-thumb-cols--${k === 'paths' ? 2 : 3}`}>
          <i className={k !== 'paths' ? 'hw-print hw-print--0' : ''} />
          <i className={k !== 'paths' ? 'hw-print hw-print--1' : ''} />
          {k !== 'paths' && <i className="hw-print hw-print--2" />}
        </span>
      ) : (
        <span className="hw-thumb-bars">
          <i />
          <i />
          <i />
        </span>
      )}
    </span>
  )
}

const HomeStudioPage = () => {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [pages, setPages] = useState({})
  const [form, setForm] = useState({})
  const [drafts, setDrafts] = useState([])
  const [save, setSave] = useState({ state: null, error: '' })
  const [publishing, setPublishing] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [device, setDevice] = useState('desktop')
  const sel = HOME_SECTIONS.some((s) => s.key === hash.slice(1)) ? hash.slice(1) : 'paths'
  const timers = useRef({})
  const formRef = useRef({})
  const editorRef = useRef(null)

  const loadDrafts = useCallback(async () => {
    const lists = await Promise.all(DRAFT_ENTITIES.map(([e]) => heritApi.cms.list(e).catch(() => ({ items: [] }))))
    setDrafts(
      lists.flatMap((l, i) =>
        (l.items || [])
          .filter((x) => x.has_draft)
          .map((x) => ({ entity: DRAFT_ENTITIES[i][0], group: DRAFT_ENTITIES[i][1], id: x.id, title: x.title || x.key || x.slug, key: x.key, slug: x.slug })),
      ),
    )
  }, [])

  const load = useCallback(async () => {
    setError(null)
    try {
      const [d, quotes, journal, store, ...items] = await Promise.all([
        loadHome(false),
        heritApi.store
          .testimonials()
          .then((r) => r?.testimonials || [])
          .catch(() => []),
        heritApi.site
          .journal()
          .then((r) => (r?.enabled ? r.items || [] : []))
          .catch(() => []),
        heritApi.store.config().catch(() => null),
        ...PAGE_KEYS.map((key) =>
          heritApi.cms
            .get('page', { key })
            .then((r) => r.item)
            .catch(() => null),
        ),
      ])
      const byKey = {}
      PAGE_KEYS.forEach((key, i) => (byKey[key] = items[i]))
      setPages(byKey)
      formRef.current = Object.fromEntries(PAGE_KEYS.map((key) => [key, { ...(byKey[key]?.editable || {}) }]))
      setForm(formRef.current)
      setData({ d, quotes, journal, shopOn: store?.shop_enabled === true })
      await loadDrafts()
    } catch (e) {
      setError(e)
    }
  }, [loadDrafts])

  useEffect(() => {
    load()
    const t = timers.current
    return () => Object.values(t).forEach(clearTimeout)
  }, [load])

  // Smooth wheel scrolling while the studio is open (D-031); native under
  // reduced motion. GSAP's ticker drives it, so there is one animation loop.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const lenis = new Lenis({ autoRaf: false, lerp: 0.12, smoothWheel: true })
    const tick = (t) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])

  // The editor slides in when the section changes.
  useEffect(() => {
    if (!editorRef.current || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(editorRef.current, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: 'power3.out' })
  }, [sel])

  const states = useMemo(
    () => (data ? homeStates(data.d, { quotes: data.quotes, journal: data.journal, shopOn: data.shopOn, products: [] }) : {}),
    [data],
  )

  /** Save one page's draft a moment after typing stops. */
  const change = (key, field, value) => {
    formRef.current = { ...formRef.current, [key]: { ...formRef.current[key], [field]: value } }
    setForm(formRef.current)
    setSave({ state: 'saving', error: '' })
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(async () => {
      try {
        const item = pages[key]
        const body = { data: formRef.current[key] }
        if (item?.id) body.id = item.id
        else body.key = key
        const r = await heritApi.cms.saveDraft('page', body)
        setPages((p) => ({ ...p, [key]: r.item }))
        setSave({ state: 'saved', error: '' })
        loadDrafts()
      } catch (e) {
        setSave({ state: 'failed', error: e.message })
      }
    }, 900)
  }

  /** Publish every unpublished draft; anything the server refuses is listed with a link to fix it. */
  const publishAll = async () => {
    setPublishing(true)
    setOutcome(null)
    const failed = []
    for (const it of drafts) {
      try {
        await heritApi.cms.publish(it.entity, it.id)
      } catch (e) {
        failed.push({ ...it, why: e.status === 409 ? 'It may contain a phone number, an email or a job reference. Check it before publishing.' : e.data?.problems ? Object.values(e.data.problems).flat().join(', ') : e.message })
      }
    }
    setOutcome({ done: drafts.length - failed.length, failed })
    setPublishing(false)
    await load()
  }

  const section = HOME_SECTIONS.find((s) => s.key === sel)
  const cfg = STUDIO[sel] || {}
  const st = states[sel] || { shown: false, note: '' }
  const pageKey = cfg.page
  const pageItem = pageKey ? pages[pageKey] : null
  const pageForm = pageKey ? form[pageKey] || {} : {}
  const sectionDraft = (key) => !!STUDIO[key]?.page && !!pages[STUDIO[key].page]?.has_draft

  const d = data?.d || {}
  const mtmService = madeToMeasureOf(d.services || [])
  const ctx = {
    homeHeadline: form.home?.headline,
    slides: (d.slides || []).map((s) => ({ headline: s.headline, eyebrow: s.eyebrow, lead: s.lead, image: toImage(s.hero)?.src })),
    services: d.services || [],
    faqs: d.faqs || [],
    journal: data?.journal || [],
    mtm: mtmService && { tag: 'Made to measure', title: mtmService.title, image: toImage(mtmService.hero)?.src },
    company: d.company && { tag: 'Company orders', title: form.company?.headline || d.company.headline, image: toImage(d.company.hero)?.src },
  }
  const shownCount = HOME_SECTIONS.filter((s) => states[s.key]?.shown).length
  const pick = (key) => navigate({ hash: key }, { replace: true })

  return (
    <div className="hd hw">
      <PageTitle title="Home page" />
      <PageHeader
        back={{ to: '/website', label: 'Website' }}
        title="The Home page, section by section"
        subtitle="Pick a section on the map to edit it. Changes save as drafts while you type; nothing changes on the website until you publish."
        actions={
          <>
            {data && <StatusChip tone="ok">{shownCount} of {HOME_SECTIONS.length} sections on the page</StatusChip>}
            <a className="btn btn-outline-secondary" href="/?preview=1" target="_blank" rel="noopener noreferrer">
              Preview the home page
            </a>
          </>
        }
      />
      {error && <LoadError what="the home page" onRetry={load} error={error} />}
      {!data && !error && <Spinner animation="border" role="status" />}

      {data && (
        <div className="hw-studio">
          <aside className="hw-map" aria-label="Home page map">
            <div className="hw-map-h">
              <b>Home, top to bottom</b>
              <span className="tnum">
                {shownCount} of {HOME_SECTIONS.length} on
              </span>
            </div>
            <ol className="hw-minis">
              {HOME_SECTIONS.map((s, i) => {
                const on = states[s.key]?.shown
                const draft = sectionDraft(s.key)
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      className={`hw-mini${on ? '' : ' is-hidden'}`}
                      aria-current={s.key === sel ? 'true' : undefined}
                      onClick={() => pick(s.key)}>
                      <span className="hw-mini-n tnum">{String(i + 1).padStart(2, '0')}</span>
                      <span className="hw-mini-body">
                        <b>{s.label}</b>
                        <Thumb k={s.key} />
                      </span>
                      <span
                        className={`hw-dot ${draft ? 'is-draft' : on ? 'is-on' : 'is-off'}`}
                        title={draft ? 'Draft not live' : on ? 'On the page' : 'Hidden'}
                      />
                      <span className="visually-hidden">{draft ? ', draft not live' : on ? ', on the page' : ', hidden'}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </aside>

          <section className="hw-editor" ref={editorRef} aria-labelledby="hw-ed-title">
            <div className="hw-ed-top">
              <div>
                <p className="hw-over">
                  Section {HOME_SECTIONS.indexOf(section) + 1} of {HOME_SECTIONS.length}
                </p>
                <h2 id="hw-ed-title">{section.label}</h2>
                <p className="hw-ed-note">{st.note}</p>
              </div>
              {pageItem?.has_draft ? (
                <StatusChip tone="warn">Draft</StatusChip>
              ) : st.shown ? (
                <StatusChip tone="ok">Live</StatusChip>
              ) : (
                <StatusChip tone="neutral">Hidden</StatusChip>
              )}
            </div>
            <div className="hw-ed-body">
              <div className="hw-src">
                <IconifyIcon icon="solar:info-circle-linear" aria-hidden="true" />
                <span>
                  <b>Filled from:</b> {section.source}.{pageKey ? ' What you type here is saved to that page as a draft.' : ''}
                </span>
              </div>
              {cfg.fixed && <p className="hw-why">This section explains the measurement appointment with example values. Its words are part of the site design, so they are not edited here.</p>}
              {!cfg.fixed && !st.shown && (
                <p className="hw-why">
                  <b>Why it is hidden.</b> {st.note}.
                </p>
              )}
              {pageKey &&
                (cfg.fields || []).map(([field, label, kind]) => {
                  const id = `hw-${pageKey}-${field}`
                  const value = kind === 'rich' ? htmlToText(pageForm[field] || '') : pageForm[field] || ''
                  const set = (v) => change(pageKey, field, kind === 'rich' ? textToHtml(v) : v)
                  return (
                    <div key={id} className="hw-field">
                      <label htmlFor={id}>
                        {label}
                        {MAX[field] && (
                          <small className="tnum">
                            {value.length} of {MAX[field]}
                          </small>
                        )}
                      </label>
                      {kind === 'text' ? (
                        <input id={id} className="form-control" value={value} maxLength={MAX[field]} onChange={(e) => set(e.target.value)} />
                      ) : (
                        <textarea
                          id={id}
                          className="form-control"
                          rows={kind === 'rich' ? 6 : 4}
                          value={value}
                          maxLength={MAX[field]}
                          onChange={(e) => set(e.target.value)}
                        />
                      )}
                      {kind === 'rich' && <span className="form-text">A blank line starts a new paragraph.</span>}
                    </div>
                  )
                })}
              {pageKey && <SaveState state={save.state} error={save.error} />}
              {cfg.more && (
                <Link to={cfg.more.to} className="hw-more">
                  {cfg.more.label} <IconifyIcon icon="solar:arrow-right-linear" aria-hidden="true" />
                </Link>
              )}
            </div>
          </section>

          <section className="hw-proof" aria-label="Preview">
            <div className="hw-proof-h">
              <span>As visitors will see it</span>
              <span className="hd-seg" role="group" aria-label="Preview size">
                {['desktop', 'phone'].map((dv) => (
                  <button key={dv} type="button" aria-pressed={device === dv} onClick={() => setDevice(dv)}>
                    {dv === 'desktop' ? 'Desktop' : 'Phone'}
                  </button>
                ))}
              </span>
            </div>
            <div className={`hw-frame${device === 'phone' ? ' is-phone' : ''}`}>
              <div className="hw-frame-bar">
                <i />
                <i />
                <i />
                <span>
                  heritclothing.com/#{sel}
                  {pageItem?.has_draft ? ' · draft' : ''}
                </span>
              </div>
              <div className="hw-site hc-paper">
                <div className="hw-site-nav">
                  <b>Herit</b>
                  <span>Services</span>
                  <span>About</span>
                  <em>Book</em>
                </div>
                <div className="hw-site-tape" />
                <StudioPreview section={section} page={pageForm} ctx={ctx} shown={st.shown} note={st.note} />
              </div>
            </div>
          </section>
        </div>
      )}

      {data && (
        <div className={`hw-pub${drafts.length ? ' is-dirty' : ''}`} role="status">
          <span className="hw-pub-dot" aria-hidden="true" />
          <p>
            {drafts.length
              ? `${drafts.length} ${drafts.length === 1 ? 'change is' : 'changes are'} not live yet`
              : outcome?.done
                ? `Published. ${outcome.done} ${outcome.done === 1 ? 'change is' : 'changes are'} now on the website.`
                : 'Everything is live'}
            <small>
              {drafts.length
                ? drafts
                    .slice(0, 4)
                    .map((x) => `${x.group}: ${x.title}`)
                    .join(' · ') + (drafts.length > 4 ? ` and ${drafts.length - 4} more` : '')
                : 'The website matches what you see here.'}
            </small>
          </p>
          <div className="hw-pub-actions">
            <button type="button" className="btn btn-primary" disabled={!drafts.length || publishing} onClick={publishAll}>
              {publishing ? 'Publishing…' : drafts.length ? `Publish ${drafts.length} ${drafts.length === 1 ? 'change' : 'changes'}` : 'Published'}
            </button>
          </div>
        </div>
      )}
      {outcome?.failed?.length > 0 && (
        <div className="hw-failed" role="alert">
          <b>Not published:</b>
          <ul>
            {outcome.failed.map((f) => (
              <li key={`${f.entity}-${f.id}`}>
                <Link to={f.entity === 'page' ? `/website/pages/${f.key}` : `/website/${DRAFT_PATHS[f.entity]}/${f.id}`}>
                  {f.group}: {f.title}
                </Link>{' '}
                {f.why}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const DRAFT_PATHS = { slide: 'slides', service: 'services', project: 'work', faq: 'faqs' }

export default HomeStudioPage
