import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageTitle from '@/components/PageTitle'
import PageHeader from '@/components/herit/PageHeader'
import LoadError from '@/components/herit/LoadError'
import SaveState from '@/components/herit/SaveState'
import StatusChip, { StageChip } from '@/components/herit/StatusChip'
import ClientPicker from '@/components/herit/ClientPicker'
import heritApi from '@/helpers/heritApi'
import { newRequestKey } from '@/helpers/requestKey'
import { fmtDate } from '@/helpers/format'
import { useAuthContext } from '@/context/useAuthContext'

const OWNER = ['super_admin', 'admin', 'manager']
const PERMS = [
  ['can_view_jobs', 'Sees jobs in the portal'],
  ['can_approve_samples', 'May approve samples'],
  ['is_invoice_recipient', 'Receives invoices'],
]

/** Company details (invoice block and staff notes). */
const DetailsCard = ({ co, onSaved }) => {
  const [f, setF] = useState({
    name: co.name || '', invoice_name: co.invoice_name || '', invoice_address: co.invoice_address || '',
    invoice_email: co.invoice_email || '', tax_id: co.tax_id || '', notes_internal: co.notes_internal || '',
  })
  const [errors, setErrors] = useState({})
  const [save, setSave] = useState({ state: null, error: '' })
  const submit = async (e) => {
    e.preventDefault()
    setSave({ state: 'saving', error: '' })
    setErrors({})
    try {
      await heritApi.companies.save({ id: co.id, ...f })
      setSave({ state: 'saved', error: '' })
      onSaved()
    } catch (err) {
      setErrors(err.data?.errors || {})
      setSave({ state: 'failed', error: err.message })
    }
  }
  const field = (k, label, props = {}) => (
    <Form.Group className="mb-2" controlId={`co-${k}`}>
      <Form.Label>{label}</Form.Label>
      <Form.Control value={f[k]} isInvalid={!!errors[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} />
      <Form.Control.Feedback type="invalid">{errors[k]}</Form.Control.Feedback>
    </Form.Group>
  )
  return (
    <Card className="hd-card h-100">
      <Card.Body>
        <Form onSubmit={submit}>
          <h2 className="h6">Details</h2>
          {field('name', 'Company name', { maxLength: 160 })}
          {field('invoice_name', 'Name on invoices (optional)', { maxLength: 160 })}
          {field('invoice_address', 'Invoice address (optional)', { as: 'textarea', rows: 2, maxLength: 2000 })}
          {field('invoice_email', 'Invoice email (optional)', { type: 'email', maxLength: 190 })}
          {field('tax_id', 'Tax ID (optional)', { maxLength: 40 })}
          {field('notes_internal', 'Staff notes (never shown to the company)', { as: 'textarea', rows: 2, maxLength: 5000 })}
          <Button type="submit">Save details</Button> <SaveState state={save.state} error={save.error} />
        </Form>
      </Card.Body>
    </Card>
  )
}

/** Contacts: people acting for the company, with what each may do. */
const ContactsCard = ({ co, contacts, onSaved }) => {
  const [person, setPerson] = useState(null)
  const [role, setRole] = useState('')
  const [cands, setCands] = useState(null)
  const [save, setSave] = useState({ state: null, error: '' })
  const run = async (fn) => {
    setSave({ state: 'saving', error: '' })
    try {
      await fn()
      setSave({ state: 'saved', error: '' })
      onSaved()
      return true
    } catch (e) {
      if (e.status === 409 && e.data?.candidates) {
        setCands(e.data.candidates)
        setSave({ state: null, error: '' })
      } else setSave({ state: 'failed', error: e.message })
      return false
    }
  }
  const add = async (confirmNew = false, existingId = null) => {
    const body = { company_id: co.id, role_title: role }
    if (existingId || person?.id) body.customer_id = existingId || person.id
    else body.person = { name: person?.name || '', phone: person?.phone || '', email: person?.email || '', confirm_new: confirmNew }
    if (await run(() => heritApi.companies.contactSave(body))) {
      setPerson(null)
      setRole('')
      setCands(null)
    }
  }
  return (
    <Card className="hd-card h-100">
      <Card.Body>
        <h2 className="h6">Contacts</h2>
        {contacts.length === 0 && <p className="text-muted">No contacts yet. A company job needs at least one.</p>}
        <ul className="list-unstyled">
          {contacts.map((c) => (
            <li key={c.id} className="border-bottom py-2">
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <span>
                  <Link to={`/clients/${c.customer_id}`}>{c.name}</Link>
                  {c.role_title ? `, ${c.role_title}` : ''}
                </span>
                {c.active ? <StatusChip tone="ok">Active</StatusChip> : <StatusChip tone="neutral">Deactivated</StatusChip>}
              </div>
              {c.active === 1 ? (
                <div className="d-flex flex-wrap gap-3 mt-1">
                  {PERMS.map(([k, label]) => (
                    <Form.Check
                      key={k}
                      id={`p-${c.id}-${k}`}
                      type="switch"
                      label={label}
                      checked={!!c[k]}
                      onChange={(e) => run(() => heritApi.companies.contactSave({ company_id: co.id, id: c.id, role_title: c.role_title || '', [k]: e.target.checked ? 1 : 0 }))}
                    />
                  ))}
                  <Button variant="link" size="sm" className="p-0" onClick={() => run(() => heritApi.companies.contactDeactivate(c.id))}>
                    Deactivate
                  </Button>
                </div>
              ) : (
                <Button variant="link" size="sm" className="p-0" onClick={() => run(() => heritApi.companies.contactSave({ company_id: co.id, id: c.id, role_title: c.role_title || '' }))}>
                  Reactivate
                </Button>
              )}
            </li>
          ))}
        </ul>
        <h3 className="h6 mt-3">Add a contact</h3>
        <ClientPicker value={person} onChange={setPerson} idPrefix="cc" />
        <Form.Group className="mt-2" controlId="cc-role">
          <Form.Label>Role (optional)</Form.Label>
          <Form.Control value={role} maxLength={80} onChange={(e) => setRole(e.target.value)} placeholder="For example HR manager" />
        </Form.Group>
        {cands && (
          <Alert variant="warning" className="mt-2">
            <p className="mb-1">This may already be a client:</p>
            <ul className="mb-2">
              {cands.map((c) => (
                <li key={c.id}>
                  {c.name} ({c.client_ref}, {c.phone_masked}){' '}
                  <Button size="sm" variant="link" className="p-0" onClick={() => add(false, c.id)}>
                    Use this client
                  </Button>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="outline-secondary" onClick={() => add(true)}>
              No, add a new client
            </Button>
          </Alert>
        )}
        <Button className="mt-2" disabled={!person?.id && !person?.name} onClick={() => add(false)}>
          Add contact
        </Button>{' '}
        <SaveState state={save.state} error={save.error} />
      </Card.Body>
    </Card>
  )
}

const emptyItem = () => ({ description: '', qty: 1, size_label: '', wearer: null, wearer_label: '' })

/** New company job: contact, PO, measuring method, sample, date and items with optional wearers. */
const NewJobCard = ({ co, contacts }) => {
  const navigate = useNavigate()
  const active = contacts.filter((c) => c.active)
  const [f, setF] = useState({ contact_id: active[0]?.id || '', description: '', po_number: '', measurement_method: 'individual', sample_required: false, due_date: '' })
  const [items, setItems] = useState([emptyItem()])
  const [key] = useState(newRequestKey)
  const [save, setSave] = useState({ state: null, error: '' })
  const setItem = (i, k, v) => setItems(items.map((it, n) => (n === i ? { ...it, [k]: v } : it)))
  const submit = async (e) => {
    e.preventDefault()
    setSave({ state: 'saving', error: '' })
    try {
      const r = await heritApi.companyJobs.create({
        company_id: co.id,
        ...f,
        contact_id: Number(f.contact_id),
        sample_required: f.sample_required ? 1 : 0,
        items: items
          .filter((it) => it.description.trim())
          .map((it) => ({ description: it.description, qty: Number(it.qty), size_label: it.size_label, wearer_label: it.wearer_label, wearer_customer_id: it.wearer?.id || null })),
        request_key: key,
      })
      navigate(`/jobs/${r.job.id}?tab=items`)
    } catch (err) {
      setSave({ state: 'failed', error: err.message })
    }
  }
  if (!active.length) return <Alert variant="info">Add an active contact before creating a company job.</Alert>
  return (
    <Card className="hd-card">
      <Card.Body>
        <Form onSubmit={submit}>
          <h2 className="h6">New company job</h2>
          <Row className="g-2">
            <Col md={4}>
              <Form.Label htmlFor="nj-contact">Main contact</Form.Label>
              <Form.Select id="nj-contact" value={f.contact_id} onChange={(e) => setF({ ...f, contact_id: e.target.value })}>
                {active.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label htmlFor="nj-po">PO number (optional)</Form.Label>
              <Form.Control id="nj-po" maxLength={60} value={f.po_number} onChange={(e) => setF({ ...f, po_number: e.target.value })} />
            </Col>
            <Col md={4}>
              <Form.Label htmlFor="nj-due">Promised date (optional)</Form.Label>
              <Form.Control id="nj-due" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
            </Col>
            <Col md={8}>
              <Form.Label htmlFor="nj-desc">Description (optional)</Form.Label>
              <Form.Control id="nj-desc" maxLength={255} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder={`${co.name} order`} />
            </Col>
            <Col md={4}>
              <Form.Label htmlFor="nj-meth">Measured by</Form.Label>
              <Form.Select id="nj-meth" value={f.measurement_method} onChange={(e) => setF({ ...f, measurement_method: e.target.value })}>
                <option value="individual">Each wearer measured</option>
                <option value="sizes">Standard sizes</option>
                <option value="mixed">Mixed</option>
              </Form.Select>
            </Col>
          </Row>
          <Form.Check className="mt-2" id="nj-sample" type="checkbox" label="A sample must be approved before production" checked={f.sample_required} onChange={(e) => setF({ ...f, sample_required: e.target.checked })} />
          <h3 className="h6 mt-3">Items</h3>
          <p className="small text-muted">One line per garment type or wearer. The total quantity is worked out from the lines. No discount is applied automatically.</p>
          {items.map((it, i) => (
            <div key={i} className="border rounded p-2 mb-2">
              <Row className="g-2">
                <Col sm={6}>
                  <Form.Label className="small mb-1" htmlFor={`ni-d-${i}`}>Garment</Form.Label>
                  <Form.Control id={`ni-d-${i}`} maxLength={160} value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} />
                </Col>
                <Col xs={4} sm={2}>
                  <Form.Label className="small mb-1" htmlFor={`ni-q-${i}`}>Quantity</Form.Label>
                  <Form.Control id={`ni-q-${i}`} type="number" min={1} max={999} value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} />
                </Col>
                <Col xs={8} sm={4}>
                  <Form.Label className="small mb-1" htmlFor={`ni-s-${i}`}>Size (optional)</Form.Label>
                  <Form.Control id={`ni-s-${i}`} maxLength={20} value={it.size_label} onChange={(e) => setItem(i, 'size_label', e.target.value)} />
                </Col>
                <Col sm={8}>
                  <div className="small mb-1">Wearer (optional, an existing client)</div>
                  <ClientPicker value={it.wearer} onChange={(v) => setItem(i, 'wearer', v)} idPrefix={`nw-${i}`} allowNew={false} />
                </Col>
                <Col sm={4}>
                  <Form.Label className="small mb-1" htmlFor={`ni-l-${i}`}>Staff label (optional)</Form.Label>
                  <Form.Control id={`ni-l-${i}`} maxLength={80} value={it.wearer_label} onChange={(e) => setItem(i, 'wearer_label', e.target.value)} placeholder="For example Driver 2" />
                </Col>
              </Row>
              {items.length > 1 && (
                <Button variant="link" size="sm" className="p-0 mt-1" onClick={() => setItems(items.filter((_, n) => n !== i))}>
                  Remove line
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline-secondary" size="sm" onClick={() => setItems([...items, emptyItem()])}>
            Add line
          </Button>
          <div className="mt-3 d-flex gap-2 align-items-center">
            <Button type="submit" disabled={!items.some((it) => it.description.trim()) || save.state === 'saving'}>
              Create company job
            </Button>
            <SaveState state={save.state} error={save.error} />
          </div>
        </Form>
      </Card.Body>
    </Card>
  )
}

/** One company: details, contacts with permissions, jobs and a new company job. */
const CompanyPage = () => {
  const { id } = useParams()
  const { user } = useAuthContext()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const load = useCallback(async () => {
    setError(null)
    try {
      setData(await heritApi.companies.get(id))
    } catch (e) {
      setError(e)
    }
  }, [id])
  useEffect(() => {
    load()
  }, [load])

  if (!OWNER.includes(user?.role)) {
    return (
      <div className="hd">
        <Alert variant="info">Companies are managed by the owner.</Alert>
      </div>
    )
  }
  if (error) {
    return (
      <div className="hd">
        <LoadError what="this company" onRetry={load} error={error} />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="hd text-center py-5">
        <Spinner role="status" />
      </div>
    )
  }
  const co = data.company

  return (
    <div className="hd">
      <PageTitle title={co.name} />
      <PageHeader title={co.name} back={{ to: '/clients/companies', label: 'Companies' }} subtitle={co.company_ref} />
      <Row className="g-3 mb-3">
        <Col lg={6}>
          <DetailsCard key={co.updated_at} co={co} onSaved={load} />
        </Col>
        <Col lg={6}>
          <ContactsCard co={co} contacts={data.contacts} onSaved={load} />
        </Col>
      </Row>
      <Card className="hd-card mb-3">
        <Card.Header>
          <h2 className="h6 mb-0">Jobs</h2>
        </Card.Header>
        {data.jobs.length === 0 && <Card.Body className="text-muted">No jobs yet.</Card.Body>}
        {data.jobs.map((j) => (
          <Link key={j.id} to={`/jobs/${j.id}`} className="hd-row">
            <span className="hd-row-main">
              <span className="hd-row-title d-block">
                {j.description} · {j.quantity} pieces
              </span>
              <span className="hd-row-sub d-block">
                {j.code}
                {j.po_number ? ` · PO ${j.po_number}` : ''}
                {j.due_date ? ` · promised ${fmtDate(j.due_date)}` : ''}
              </span>
            </span>
            <StageChip stage={j.job_stage} label={j.stage_label} />
          </Link>
        ))}
      </Card>
      <NewJobCard co={co} contacts={data.contacts} />
    </div>
  )
}

export default CompanyPage
