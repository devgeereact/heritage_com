import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Spinner } from 'react-bootstrap'
import { Link, Navigate, useParams } from 'react-router-dom'
import PageTitle from '@/components/PageTitle'
import PageHeader from '@/components/herit/PageHeader'
import LoadError from '@/components/herit/LoadError'
import SaveState from '@/components/herit/SaveState'
import heritApi from '@/helpers/heritApi'
import { fmtUtc } from '@/helpers/format'
import { entityByPath } from '../components/cmsSchema'
import CmsStatus from '../components/CmsStatus'

/**
 * One Website section: services, work, questions (ordered lists with Up and
 * Down), or the fixed pages and policies (every key listed, created on first
 * save).
 */
const WebsiteListPage = () => {
  const { section } = useParams()
  const ent = entityByPath(section)
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [save, setSave] = useState({ state: null, error: '' })

  const load = useCallback(async () => {
    if (!ent) return
    setError(null)
    try {
      const r = await heritApi.cms.list(ent.entity)
      setItems(r.items || [])
    } catch (e) {
      setError(e)
    }
  }, [ent])
  useEffect(() => {
    setItems(null)
    load()
  }, [load])

  if (!ent) return <Navigate to="/website" replace />

  const move = async (i, d) => {
    const next = [...items]
    const [x] = next.splice(i, 1)
    next.splice(i + d, 0, x)
    setItems(next)
    setSave({ state: 'saving', error: '' })
    try {
      await heritApi.cms.reorder(
        ent.entity,
        next.map((n) => n.id),
      )
      setSave({ state: 'saved', error: '' })
    } catch (e) {
      setSave({ state: 'failed', error: e.message })
      load()
    }
  }

  // Fixed pages and policies: one row per key, whether or not it exists yet.
  const rows = ent.keyed
    ? Object.entries(ent.keys).map(([key, label]) => ({ key, label, item: (items || []).find((i) => i.key === key) || null }))
    : (items || []).map((item) => ({ key: item.id, label: item.title || '(no title yet)', item }))

  return (
    <div className="hd hd-website">
      <PageTitle title={`Website: ${ent.label}`} />
      <PageHeader
        title={ent.label}
        subtitle={ent.intro}
        back={{ to: '/website', label: 'Website' }}
        actions={
          !ent.keyed && (
            <Button as={Link} to={`/website/${section}/new`} variant="primary">
              New {ent.one}
            </Button>
          )
        }
      />
      {error && <LoadError what={ent.label.toLowerCase()} onRetry={load} error={error} />}
      {!items && !error && <Spinner animation="border" role="status" />}
      {items && (
        <Card className="hd-card">
          <Card.Body className="p-0">
            {rows.length === 0 && <p className="p-3 mb-0 text-muted">Nothing here yet. Use New {ent.one} to add the first one.</p>}
            <ul className="list-unstyled mb-0">
              {rows.map((r, i) => (
                <li key={r.key} className="hd-cms-row d-flex flex-wrap align-items-center gap-2 p-3 border-bottom">
                  <div className="flex-grow-1 min-w-0">
                    <Link to={`/website/${section}/${ent.keyed ? r.key : r.item.id}`} className="fw-semibold">
                      {r.label}
                    </Link>
                    <div className="small text-muted mt-1">
                      {r.item ? (r.item.updated_at ? `Last changed ${fmtUtc(r.item.updated_at)}` : '') : 'Not written yet'}
                      {ent.slugged && r.item?.slug ? ` · ${ent.publicPath(r.item)}` : ''}
                    </div>
                  </div>
                  {r.item ? <CmsStatus item={r.item} /> : null}
                  {ent.ordered && r.item && (
                    <span className="d-inline-flex gap-1">
                      <Button size="sm" variant="outline-secondary" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${r.label} up`}>
                        Up
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        disabled={i === rows.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={`Move ${r.label} down`}>
                        Down
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      )}
      <SaveState state={save.state} error={save.error} />
    </div>
  )
}

export default WebsiteListPage
