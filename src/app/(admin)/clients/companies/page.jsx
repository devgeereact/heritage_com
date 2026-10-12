import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import PageTitle from '@/components/PageTitle'
import PageHeader from '@/components/herit/PageHeader'
import LoadError from '@/components/herit/LoadError'
import SaveState from '@/components/herit/SaveState'
import heritApi from '@/helpers/heritApi'
import { useAuthContext } from '@/context/useAuthContext'

const OWNER = ['super_admin', 'admin', 'manager']

/** Companies (Phase 5, owner roles): list, search and add. A similar name is flagged, never merged. */
const CompaniesPage = () => {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [matches, setMatches] = useState(null)
  const [save, setSave] = useState({ state: null, error: '' })

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await heritApi.companies.list(q.trim())
      setItems(r.items || [])
    } catch (e) {
      setError(e)
    }
  }, [q])
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  if (!OWNER.includes(user?.role)) {
    return (
      <div className="hd">
        <Alert variant="info">Companies are managed by the owner.</Alert>
      </div>
    )
  }

  const create = async (e, confirmNew = false) => {
    e?.preventDefault()
    setSave({ state: 'saving', error: '' })
    try {
      const r = await heritApi.companies.save({ name, confirm_new: confirmNew })
      navigate(`/clients/companies/${r.company.id}`)
    } catch (err) {
      if (err.status === 409 && err.data?.matches) {
        setMatches(err.data.matches)
        setSave({ state: null, error: '' })
      } else setSave({ state: 'failed', error: err.message })
    }
  }

  return (
    <div className="hd">
      <PageTitle title="Companies" />
      <PageHeader title="Companies" back={{ to: '/clients', label: 'Clients' }} subtitle="Organisations that order for several people, with one quote, PO and invoice per job." />
      <Card className="hd-card mb-3">
        <Card.Body>
          <Form onSubmit={(e) => create(e)} className="d-flex flex-wrap gap-2 align-items-end">
            <Form.Group controlId="co-name" className="flex-grow-1" style={{ minWidth: 220 }}>
              <Form.Label>New company</Form.Label>
              <Form.Control
                value={name}
                maxLength={160}
                onChange={(e) => {
                  setName(e.target.value)
                  setMatches(null)
                }}
                placeholder="Company name"
              />
            </Form.Group>
            <Button type="submit" disabled={!name.trim() || save.state === 'saving'}>
              Add company
            </Button>
            <SaveState state={save.state} error={save.error} />
          </Form>
          {matches && (
            <Alert variant="warning" className="mt-3 mb-0">
              <p className="mb-1">A company with a similar name already exists:</p>
              <ul className="mb-2">
                {matches.map((m) => (
                  <li key={m.id}>
                    <Link to={`/clients/companies/${m.id}`}>{m.name}</Link> ({m.company_ref})
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="outline-secondary" onClick={() => create(null, true)}>
                No, this is a different company
              </Button>
            </Alert>
          )}
        </Card.Body>
      </Card>
      <Form.Control className="mb-3" type="search" placeholder="Search companies" aria-label="Search companies" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 360 }} />
      {error && <LoadError what="companies" onRetry={load} error={error} />}
      {!items && !error && <Spinner animation="border" role="status" />}
      {items && (
        <Card className="hd-card">
          {items.length === 0 && <Card.Body className="text-muted">No companies yet.</Card.Body>}
          {items.map((c) => (
            <Link key={c.id} to={`/clients/companies/${c.id}`} className="hd-row">
              <span className="hd-row-main">
                <span className="hd-row-title d-block">{c.name}</span>
                <span className="hd-row-sub d-block">
                  {c.company_ref} · {c.contacts} active contact{c.contacts === 1 ? '' : 's'} · {c.jobs} job{c.jobs === 1 ? '' : 's'}
                </span>
              </span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  )
}

export default CompaniesPage
