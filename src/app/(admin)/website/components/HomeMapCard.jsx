import { useCallback, useEffect, useState } from 'react'
import { Card, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import heritApi from '@/helpers/heritApi'
import StatusChip from '@/components/herit/StatusChip'
import { HOME_SECTIONS, homeStates, loadHome } from '@/app/(public)/site/homeMap'

/**
 * The Home page, section by section (D-031): every landing section in page
 * order, the editor that fills it, and whether visitors see it now. It reads
 * the same published content and the same rules (homeMap.js) as the public
 * Home page, so what it says is what the landing shows.
 */
const HomeMapCard = () => {
  const [state, setState] = useState({ ready: false, error: null, show: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, ready: false, error: null }))
    try {
      const [d, quotes, journal, store] = await Promise.all([
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
      ])
      const shopOn = store?.shop_enabled === true
      const products = shopOn
        ? await heritApi.store
            .catalogue()
            .then((r) => r?.products || [])
            .catch(() => [])
        : []
      setState({ ready: true, error: null, show: homeStates(d, { quotes, journal, shopOn, products }) })
    } catch (e) {
      setState({ ready: true, error: e, show: null })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const shown = state.show ? HOME_SECTIONS.filter((s) => state.show[s.key]?.shown).length : 0

  return (
    <Card className="hd-card">
      <Card.Body className="p-0">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-bottom">
          <div>
            <h2 className="h5 mb-1">Home page, section by section</h2>
            <div className="small text-muted">Each section shows only while its content is published. Hidden sections say what brings them back.</div>
          </div>
          <span className="d-inline-flex flex-wrap gap-2 align-items-center">
            {state.show && (
              <StatusChip tone="ok">
                {shown} of {HOME_SECTIONS.length} on the page
              </StatusChip>
            )}
            <Link to="/website/home" className="btn btn-primary btn-sm">
              Open the Home studio
            </Link>
          </span>
        </div>
        {!state.ready && (
          <div className="p-3">
            <Spinner animation="border" size="sm" role="status" /> <span className="ms-2 small">Checking the home page</span>
          </div>
        )}
        {state.ready && state.error && (
          <div className="p-3 small">
            The home page could not be checked.{' '}
            <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={load}>
              Try again
            </button>
          </div>
        )}
        {state.ready && state.show && (
          <ol className="list-unstyled mb-0">
            {HOME_SECTIONS.map((s, i) => {
              const st = state.show[s.key]
              return (
                <li key={s.key} className="d-flex flex-wrap justify-content-between align-items-start gap-2 px-3 py-2 border-bottom">
                  <div className="d-flex gap-3 min-w-0">
                    <span className="text-muted small font-monospace pt-1" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <div className="fw-semibold">
                        <Link to={`/website/home#${s.key}`}>{s.label}</Link>
                      </div>
                      <div className="small text-muted">{s.source}</div>
                    </div>
                  </div>
                  <span className="d-inline-flex flex-column align-items-end gap-1 text-end">
                    <StatusChip tone={st.shown ? 'ok' : 'neutral'}>{st.shown ? 'On the page' : 'Hidden'}</StatusChip>
                    <span className="small text-muted">{st.note}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </Card.Body>
    </Card>
  )
}

export default HomeMapCard
