import { useState } from 'react'
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import heritApi from '@/helpers/heritApi'
import { newRequestKey } from '@/helpers/requestKey'
import { fmtUtc } from '@/helpers/format'
import SaveState from '@/components/herit/SaveState'
import StatusChip from '@/components/herit/StatusChip'

// Company job tabs (Phase 5): Items, Sample, Company and Handover by item.
// All data comes from company_jobs.php?action=job (`cj`); every change returns
// the same shape, so each panel hands it to onData().

const ITEM_TONE = { pending: 'neutral', in_production: 'warn', ready: 'ok', handed_over: 'ok', cancelled: 'neutral' }
const MEAS = {
  attached: ['ok', 'Measurements attached'],
  available: ['warn', 'Approved set available'],
  pending: ['warn', 'Measurements pending'],
  missing: ['bad', 'No measurements'],
  not_needed: ['neutral', 'No wearer'],
}
const SAMPLE_TONE = { submitted: 'warn', approved: 'ok', changes_requested: 'bad', withdrawn: 'neutral' }
const SAMPLE_LABEL = { submitted: 'Waiting for the company', approved: 'Approved', changes_requested: 'Changes requested', withdrawn: 'Replaced' }
const JOB_SAMPLE = { not_required: 'Not required', pending: 'Not sent yet', submitted: 'Waiting for the company', approved: 'Approved', changes_requested: 'Changes requested' }
const CHANNELS = [
  ['in_person', 'In person'],
  ['whatsapp', 'WhatsApp'],
  ['email', 'Email'],
  ['phone', 'Phone'],
]

/** Run one company job action and report the save state. */
const useAction = (jobId, onData) => {
  const [save, setSave] = useState({ state: null, error: '' })
  const run = async (action, data, after) => {
    setSave({ state: 'saving', error: '' })
    try {
      const r = await heritApi.companyJobs.act(action, jobId, data)
      if (r?.job) onData(r)
      setSave({ state: 'saved', error: r?.warning || '' })
      after?.(r)
      return r
    } catch (e) {
      setSave({ state: 'failed', error: e.message })
      return null
    }
  }
  return [save, run]
}

/* ---- Items ---------------------------------------------------------------------- */

const ItemRow = ({ it, isOwner, jobId, onData }) => {
  const [save, run] = useAction(jobId, onData)
  const [ready, setReady] = useState(it.qty_ready)
  const [edit, setEdit] = useState(null)
  const meas = MEAS[it.measurement_state] || ['neutral', it.measurement_state]
  const cancelled = it.item_stage === 'cancelled'

  const saveEdit = async (e) => {
    e.preventDefault()
    const r = await run('item_save', { item_id: it.id, ...edit, qty: Number(edit.qty) })
    if (r) setEdit(null)
  }

  return (
    <li className="border-bottom p-3">
      <div className="d-flex flex-wrap justify-content-between gap-2">
        <div className="min-w-0">
          <div className="fw-semibold">
            {it.qty} × {it.description}
            {it.size_label ? ` · ${it.size_label}` : ''}
          </div>
          <div className="small text-muted">
            {it.wearer_name ? (
              <>
                Wearer: <Link to={`/clients/${it.wearer_customer_id}`}>{it.wearer_name}</Link>
                {it.wearer_label ? ` (${it.wearer_label})` : ''}
              </>
            ) : (
              it.wearer_label || 'No wearer named'
            )}
          </div>
        </div>
        <span className="d-inline-flex flex-wrap gap-2">
          <StatusChip tone={ITEM_TONE[it.item_stage]}>{it.stage_label}</StatusChip>
          {!cancelled && <StatusChip tone={meas[0]}>{meas[1]}</StatusChip>}
        </span>
      </div>
      {!cancelled && (
        <div className="d-flex flex-wrap gap-2 align-items-end mt-2">
          <Form.Group controlId={`ready-${it.id}`} style={{ maxWidth: 140 }}>
            <Form.Label className="small mb-1">Ready (of {it.qty})</Form.Label>
            <Form.Control type="number" min={it.qty_handed_over} max={it.qty} value={ready} onChange={(e) => setReady(e.target.value)} />
          </Form.Group>
          <Button variant="outline-secondary" disabled={Number(ready) === it.qty_ready} onClick={() => run('item_progress', { item_id: it.id, qty_ready: Number(ready) })}>
            Save ready count
          </Button>
          <span className="small text-muted">{it.qty_handed_over} handed over</span>
          {isOwner && !edit && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setEdit({ description: it.description, qty: it.qty, size_label: it.size_label || '', wearer_label: it.wearer_label || '', wearer_customer_id: it.wearer_customer_id || '', effect_note: '' })}>
              Edit
            </Button>
          )}
          {isOwner && it.wearer_customer_id && (
            <Button variant="link" size="sm" onClick={() => run('wearer_invite', { item_id: it.id }, (r) => r && window.open(r.wa_link || r.invite_url, '_blank', 'noopener'))}>
              Invite wearer
            </Button>
          )}
          <SaveState state={save.state} error={save.error} />
        </div>
      )}
      {edit && (
        <Form onSubmit={saveEdit} className="mt-2 border rounded p-2">
          <Row className="g-2">
            <Col sm={6}>
              <Form.Label className="small mb-1" htmlFor={`d-${it.id}`}>Description</Form.Label>
              <Form.Control id={`d-${it.id}`} value={edit.description} maxLength={160} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </Col>
            <Col xs={4} sm={2}>
              <Form.Label className="small mb-1" htmlFor={`q-${it.id}`}>Quantity</Form.Label>
              <Form.Control id={`q-${it.id}`} type="number" min={Math.max(1, it.qty_handed_over)} max={999} value={edit.qty} onChange={(e) => setEdit({ ...edit, qty: e.target.value })} />
            </Col>
            <Col xs={8} sm={4}>
              <Form.Label className="small mb-1" htmlFor={`s-${it.id}`}>Size (optional)</Form.Label>
              <Form.Control id={`s-${it.id}`} value={edit.size_label} maxLength={20} onChange={(e) => setEdit({ ...edit, size_label: e.target.value })} />
            </Col>
            {it.item_stage !== 'pending' && (
              <Col xs={12}>
                <Form.Label className="small mb-1" htmlFor={`e-${it.id}`}>Effect on price or date (required, work has started)</Form.Label>
                <Form.Control id={`e-${it.id}`} value={edit.effect_note} maxLength={255} onChange={(e) => setEdit({ ...edit, effect_note: e.target.value })} />
              </Col>
            )}
          </Row>
          <div className="d-flex gap-2 mt-2">
            <Button type="submit" size="sm">Save item</Button>
            <Button size="sm" variant="outline-secondary" onClick={() => setEdit(null)}>Cancel</Button>
          </div>
        </Form>
      )}
    </li>
  )
}

export const CompanyItemsPanel = ({ cj, isOwner, onData }) => {
  const [save, run] = useAction(cj.job.id, onData)
  const [add, setAdd] = useState({ description: '', qty: 1, size_label: '' })
  const items = cj.items || []
  const active = items.filter((i) => i.item_stage !== 'cancelled')
  const submitAdd = async (e) => {
    e.preventDefault()
    const r = await run('item_save', { ...add, qty: Number(add.qty) })
    if (r) setAdd({ description: '', qty: 1, size_label: '' })
  }
  return (
    <>
      {cj.suggested_stage && cj.suggested_stage !== cj.job.job_stage && (
        <Alert variant="info">
          The items suggest the job is now <strong>{cj.suggested_stage.replace('_', ' ')}</strong>. Move the stage on the Overview tab when it is.
        </Alert>
      )}
      <Card className="hd-card mb-3">
        <Card.Header className="d-flex justify-content-between flex-wrap gap-2">
          <h2 className="h6 mb-0">Items</h2>
          <span className="small text-muted">
            {active.reduce((n, i) => n + i.qty_ready, 0)} of {active.reduce((n, i) => n + i.qty, 0)} ready · {cj.job.progress}
          </span>
        </Card.Header>
        <ul className="list-unstyled mb-0">
          {items.map((it) => (
            <ItemRow key={`${it.id}-${it.lock_version}`} it={it} isOwner={isOwner} jobId={cj.job.id} onData={onData} />
          ))}
        </ul>
      </Card>
      {isOwner && (
        <Card className="hd-card">
          <Card.Body>
            <Form onSubmit={submitAdd}>
              <h2 className="h6">Add an item</h2>
              <Row className="g-2 align-items-end">
                <Col sm={5}>
                  <Form.Label className="small mb-1" htmlFor="add-desc">Description</Form.Label>
                  <Form.Control id="add-desc" value={add.description} maxLength={160} onChange={(e) => setAdd({ ...add, description: e.target.value })} />
                </Col>
                <Col xs={4} sm={2}>
                  <Form.Label className="small mb-1" htmlFor="add-qty">Quantity</Form.Label>
                  <Form.Control id="add-qty" type="number" min={1} max={999} value={add.qty} onChange={(e) => setAdd({ ...add, qty: e.target.value })} />
                </Col>
                <Col xs={8} sm={2}>
                  <Form.Label className="small mb-1" htmlFor="add-size">Size</Form.Label>
                  <Form.Control id="add-size" value={add.size_label} maxLength={20} onChange={(e) => setAdd({ ...add, size_label: e.target.value })} />
                </Col>
                <Col sm={3}>
                  <Button type="submit" className="w-100" disabled={!add.description.trim()}>Add item</Button>
                </Col>
              </Row>
              <SaveState state={save.state} error={save.error} />
            </Form>
          </Card.Body>
        </Card>
      )}
    </>
  )
}

/* ---- Sample --------------------------------------------------------------------- */

export const CompanySamplePanel = ({ cj, onData }) => {
  const [save, run] = useAction(cj.job.id, onData)
  const [desc, setDesc] = useState('')
  const [decision, setDecision] = useState({ channel: 'in_person', note: '' })
  const samples = [...(cj.samples || [])].reverse()
  const waiting = samples.find((s) => s.status === 'submitted')
  return (
    <>
      <Card className="hd-card mb-3">
        <Card.Header className="d-flex justify-content-between flex-wrap gap-2">
          <h2 className="h6 mb-0">Sample</h2>
          <StatusChip tone={{ approved: 'ok', submitted: 'warn', changes_requested: 'bad' }[cj.job.sample_status] || 'neutral'}>{JOB_SAMPLE[cj.job.sample_status]}</StatusChip>
        </Card.Header>
        {samples.length === 0 && <Card.Body className="text-muted">No sample versions yet.</Card.Body>}
        <ul className="list-unstyled mb-0">
          {samples.map((s) => (
            <li key={s.id} className="border-bottom p-3">
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <span className="fw-semibold">Version {s.version}: {s.description}</span>
                <StatusChip tone={SAMPLE_TONE[s.status]}>{SAMPLE_LABEL[s.status]}</StatusChip>
              </div>
              {s.decided_at && (
                <div className="small text-muted">
                  Decided {fmtUtc(s.decided_at)} by {s.decided_channel?.replace('_', ' ')}
                  {s.decision_note ? `: ${s.decision_note}` : ''}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
      {waiting && (
        <Card className="hd-card mb-3">
          <Card.Body>
            <h2 className="h6">Record the company&apos;s decision on version {waiting.version}</h2>
            <p className="small text-muted">Approvers can also decide in their portal. Record it here when they told you another way.</p>
            <Row className="g-2">
              <Col sm={4}>
                <Form.Label className="small mb-1" htmlFor="dec-ch">How they told you</Form.Label>
                <Form.Select id="dec-ch" value={decision.channel} onChange={(e) => setDecision({ ...decision, channel: e.target.value })}>
                  {CHANNELS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col sm={8}>
                <Form.Label className="small mb-1" htmlFor="dec-note">Note (what they said)</Form.Label>
                <Form.Control id="dec-note" maxLength={500} value={decision.note} onChange={(e) => setDecision({ ...decision, note: e.target.value })} />
              </Col>
            </Row>
            <div className="d-flex flex-wrap gap-2 mt-2">
              <Button onClick={() => run('sample_record_decision', { sample_id: waiting.id, decision: 'approve', ...decision })}>Record approval</Button>
              <Button variant="outline-secondary" onClick={() => run('sample_record_decision', { sample_id: waiting.id, decision: 'changes', ...decision })}>Record changes requested</Button>
              <SaveState state={save.state} error={save.error} />
            </div>
          </Card.Body>
        </Card>
      )}
      <Card className="hd-card">
        <Card.Body>
          <Form
            onSubmit={(e) => {
              e.preventDefault()
              run('sample_submit', { description: desc, request_key: newRequestKey() }, () => setDesc(''))
            }}>
            <Form.Label htmlFor="sample-desc">{samples.length ? 'Send a new sample version' : 'Send a sample for approval'}</Form.Label>
            <div className="d-flex gap-2 flex-wrap">
              <Form.Control id="sample-desc" style={{ maxWidth: 420 }} maxLength={255} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What the sample is" />
              <Button type="submit" variant="outline-primary" disabled={!desc.trim()}>Submit for approval</Button>
            </div>
            {waiting && <Form.Text>Submitting replaces version {waiting.version}, which is still waiting.</Form.Text>}
          </Form>
        </Card.Body>
      </Card>
    </>
  )
}

/* ---- Company (PO, invoice recipient, bill-to) -------------------------------------- */

export const CompanyDetailsPanel = ({ cj, onData }) => {
  const [save, run] = useAction(cj.job.id, onData)
  const [f, setF] = useState({ po_number: cj.job.po_number || '', invoice_contact_id: cj.job.invoice_contact_id || '', measurement_method: cj.job.measurement_method || 'individual' })
  const b = cj.bill_to
  return (
    <Row className="g-3">
      <Col lg={6}>
        <Card className="hd-card h-100">
          <Card.Body>
            <h2 className="h6">
              Company: <Link to={`/clients/companies/${cj.company?.id}`}>{cj.company?.name}</Link>
            </h2>
            <Form
              onSubmit={(e) => {
                e.preventDefault()
                run('set', { ...f, invoice_contact_id: f.invoice_contact_id ? Number(f.invoice_contact_id) : 0 })
              }}>
              <Form.Group className="mb-2" controlId="cj-po">
                <Form.Label>PO number</Form.Label>
                <Form.Control maxLength={60} value={f.po_number} onChange={(e) => setF({ ...f, po_number: e.target.value })} />
              </Form.Group>
              <Form.Group className="mb-2" controlId="cj-inv">
                <Form.Label>Invoice goes to</Form.Label>
                <Form.Select value={f.invoice_contact_id} onChange={(e) => setF({ ...f, invoice_contact_id: e.target.value })}>
                  <option value="">The company&apos;s invoice contact</option>
                  {(cj.contacts || [])
                    .filter((c) => c.active)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.role_title ? `, ${c.role_title}` : ''}
                      </option>
                    ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-2" controlId="cj-meth">
                <Form.Label>Measured by</Form.Label>
                <Form.Select value={f.measurement_method} onChange={(e) => setF({ ...f, measurement_method: e.target.value })}>
                  <option value="individual">Each wearer measured</option>
                  <option value="sizes">Standard sizes</option>
                  <option value="mixed">Mixed</option>
                </Form.Select>
              </Form.Group>
              <Button type="submit">Save</Button> <SaveState state={save.state} error={save.error} />
            </Form>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={6}>
        <Card className="hd-card h-100">
          <Card.Body>
            <h2 className="h6">Bill to (as it stands now)</h2>
            {b ? (
              <address className="mb-2">
                <strong>{b.invoice_name}</strong>
                {b.address && <div style={{ whiteSpace: 'pre-line' }}>{b.address}</div>}
                {b.email && <div>{b.email}</div>}
                {b.tax_id && <div>Tax ID {b.tax_id}</div>}
                {b.po_number && <div>PO {b.po_number}</div>}
                {b.recipient && <div>For the attention of {b.recipient.name}</div>}
              </address>
            ) : (
              <p className="text-muted">No bill-to yet.</p>
            )}
            <p className="small text-muted mb-0">Sending a quote freezes these details on it; later changes do not alter a sent quote.</p>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}

/* ---- Handover by item ------------------------------------------------------------- */

export const CompanyHandoverPanel = ({ cj, onData }) => {
  const [save, run] = useAction(cj.job.id, onData)
  const items = (cj.items || []).filter((i) => i.item_stage !== 'cancelled')
  const [qty, setQty] = useState({})
  const [method, setMethod] = useState('collection')
  const [receivedBy, setReceivedBy] = useState('')
  const lines = Object.entries(qty)
    .filter(([, n]) => Number(n) > 0)
    .map(([id, n]) => ({ item_id: Number(id), qty: Number(n) }))
  const total = lines.reduce((n, l) => n + l.qty, 0)
  const submit = (e) => {
    e.preventDefault()
    run('handover', { items: lines, method, received_by: receivedBy, request_key: newRequestKey() }, (r) => {
      if (!r) return
      setQty({})
      setReceivedBy('')
    })
  }
  return (
    <>
      <Card className="hd-card mb-3">
        <Card.Header className="d-flex justify-content-between flex-wrap gap-2">
          <h2 className="h6 mb-0">Hand over</h2>
          <span className="fw-semibold">{cj.job.progress}</span>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={submit}>
            <ul className="list-unstyled mb-3">
              {items.map((it) => {
                const left = it.qty_ready - it.qty_handed_over
                return (
                  <li key={it.id} className="d-flex flex-wrap align-items-center gap-2 py-2 border-bottom">
                    <span className="flex-grow-1 min-w-0">
                      {it.description}
                      {it.size_label ? ` · ${it.size_label}` : ''}
                      {it.wearer_name ? ` · ${it.wearer_name}` : ''}
                      <span className="d-block small text-muted">
                        {it.qty_handed_over} of {it.qty} out · {left > 0 ? `${left} ready to go` : 'none ready to go'}
                      </span>
                    </span>
                    <Form.Label className="visually-hidden" htmlFor={`ho-${it.id}`}>
                      Pieces of {it.description} to hand over
                    </Form.Label>
                    <Form.Control id={`ho-${it.id}`} type="number" min={0} max={left} disabled={left < 1} style={{ width: 90 }} value={qty[it.id] ?? ''} onChange={(e) => setQty({ ...qty, [it.id]: e.target.value })} />
                  </li>
                )
              })}
            </ul>
            <Row className="g-2 align-items-end">
              <Col sm={4}>
                <Form.Label className="small mb-1" htmlFor="ho-method">Method</Form.Label>
                <Form.Select id="ho-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="collection">Collected</option>
                  <option value="delivery">Delivered</option>
                </Form.Select>
              </Col>
              <Col sm={5}>
                <Form.Label className="small mb-1" htmlFor="ho-by">Received by (optional)</Form.Label>
                <Form.Control id="ho-by" maxLength={120} value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
              </Col>
              <Col sm={3}>
                <Button type="submit" className="w-100" disabled={total < 1}>
                  Hand over {total || ''}
                </Button>
              </Col>
            </Row>
            <SaveState state={save.state} error={save.error} />
          </Form>
        </Card.Body>
      </Card>
      {(cj.handovers || []).length > 0 && (
        <Card className="hd-card">
          <Card.Header>
            <h2 className="h6 mb-0">Handed over</h2>
          </Card.Header>
          <ul className="list-unstyled mb-0">
            {cj.handovers.map((h) => (
              <li key={h.id} className="p-3 border-bottom small">
                <strong>{h.quantity} piece(s)</strong> · {h.method === 'delivery' ? 'Delivered' : 'Collected'} {h.completed_at ? fmtUtc(h.completed_at) : ''}
                {h.received_by ? ` · received by ${h.received_by}` : ''}
                <div className="text-muted">{(h.items || []).map((i) => `${i.qty} × ${i.description}`).join(', ')}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
