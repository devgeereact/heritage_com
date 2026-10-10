import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Nav, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';
import { useAuthContext } from '@/context/useAuthContext';
import { fmtDate, naira, waLink, GARMENT_LABELS } from '@/helpers/format';
import LoadError from '@/components/herit/LoadError';
import PageHeader from '@/components/herit/PageHeader';
import SaveState from '@/components/herit/SaveState';
import MeasurementSetList from '@/components/herit/MeasurementSetList';
import { PaymentChip, StageChip } from '@/components/herit/StatusChip';
import NewOrderModal from '@/app/(admin)/tailoring/components/NewOrderModal';

const OWNER = ['super_admin', 'admin', 'manager'];
const WORKSHOP = [...OWNER, 'tailor'];
const PREF = { whatsapp: 'WhatsApp', phone: 'Phone call', email: 'Email' };

const ClientDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuthContext();
  const isOwner = OWNER.includes(user?.role);
  const canMeasure = WORKSHOP.includes(user?.role);
  const [params, setParams] = useSearchParams();
  const tabs = ['jobs', ...(canMeasure ? ['measurements'] : []), ...(isOwner ? ['payments'] : []), 'details'];
  const tab = tabs.includes(params.get('tab')) ? params.get('tab') : 'jobs';
  const [c, setC] = useState(null);
  const [state, setState] = useState('loading');
  // Keep the active tab visible when the tab strip scrolls sideways on phones.
  useEffect(() => {
    document.querySelector('.hd .nav-tabs .nav-link.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [tab, state]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({});
  const [save, setSave] = useState({ state: null, error: '' });
  const [dupes, setDupes] = useState([]);
  const [showJob, setShowJob] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const d = await heritApi.customers.get(id);
      setC(d);
      setForm({
        name: d.name || '', phone: d.phone || '', email: d.email || '', company_name: d.company_name || '',
        preferred_contact: d.preferred_contact || '', comm_notes: d.comm_notes || '', notes: d.notes || '', birthday: d.birthday || '',
      });
      setState('ready');
    } catch (e) {
      setError(e); setState(e.status === 404 ? 'missing' : 'error');
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const saveDetails = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setSave({ state: 'failed', error: 'Name is required' }); return; }
    setSave({ state: 'saving', error: '' });
    try {
      const r = await heritApi.customers.update(id, form);
      setDupes(r.candidates || []);
      setSave({ state: 'saved', error: '' });
      setC((x) => ({ ...x, ...form }));
    } catch (err) {
      setSave({ state: 'failed', error: err.message });
    }
  };

  if (state === 'loading') return <div className="hd text-center py-5"><Spinner role="status" /></div>;
  if (state === 'missing') return <div className="hd"><p>This client does not exist. <Link to="/clients">Back to clients</Link></p></div>;
  if (state === 'error') return <div className="hd"><LoadError what="this client" error={error} onRetry={load} /></div>;

  const wa = waLink(c.phone);
  const ps = c.payments_summary;
  const TAB_LABEL = { jobs: `Jobs (${c.jobs.length})`, measurements: `Measurements (${c.measurement_sets.length})`, payments: 'Payments', details: 'Details' };

  return (
    <div className="hd">
      <PageTitle title={c.name} />
      <PageHeader
        back={{ to: '/clients', label: 'Clients' }}
        title={c.name}
        subtitle={[c.client_ref, c.company_name, c.preferred_contact ? `Prefers ${PREF[c.preferred_contact]}` : null].filter(Boolean).join(' · ')}
        actions={
          tab === 'measurements'
            ? <Link className="btn btn-primary" to={`/clients/${id}/measurements/new`}><IconifyIcon icon="solar:ruler-bold" className="me-1" aria-hidden="true" />Add measurements</Link>
            : <Button variant="primary" onClick={() => setShowJob(true)}><IconifyIcon icon="solar:add-circle-bold" className="me-1" aria-hidden="true" />Add job</Button>
        }
      />
      <div className="d-flex gap-2 flex-wrap mb-3">
        {c.phone && <a className="btn btn-outline-secondary" href={`tel:${c.phone}`}><IconifyIcon icon="solar:phone-bold" className="me-1" aria-hidden="true" />{c.phone}</a>}
        {wa && <a className="btn btn-outline-secondary" href={wa} target="_blank" rel="noopener noreferrer"><IconifyIcon icon="mdi:whatsapp" className="me-1" aria-hidden="true" />WhatsApp</a>}
        {c.email && <a className="btn btn-outline-secondary" href={`mailto:${c.email}`}><IconifyIcon icon="solar:letter-bold" className="me-1" aria-hidden="true" />Email</a>}
      </div>
      {c.comm_notes && <p className="small text-muted">{c.comm_notes}</p>}

      <Nav variant="tabs" className="mb-3" activeKey={tab} onSelect={(k) => setParams({ tab: k })} role="tablist">
        {tabs.map((t) => (
          <Nav.Item key={t}><Nav.Link eventKey={t} role="tab" aria-selected={t === tab}>{TAB_LABEL[t]}</Nav.Link></Nav.Item>
        ))}
        <Nav.Item><Nav.Link disabled title="Coming in the next update">Messages</Nav.Link></Nav.Item>
      </Nav>

      {tab === 'jobs' && (
        <Card className="hd-card">
          {c.jobs.length === 0 ? <Card.Body className="text-muted">No jobs yet. Add the first job for {c.name}.</Card.Body> : c.jobs.map((j) => (
            <Link key={j.id} to={`/jobs/${j.id}`} className="hd-row">
              <span className="hd-row-main">
                <span className="hd-row-title d-block">{GARMENT_LABELS[j.garment_type] || j.garment_type}{j.quantity > 1 ? ` × ${j.quantity}` : ''} · {j.code}</span>
                <span className="hd-row-sub d-block">{j.description || ''}{j.due_date ? ` · promised ${fmtDate(j.due_date)}` : ''}</span>
              </span>
              <StageChip stage={j.job_stage} label={j.stage_label} />
              {isOwner && <PaymentChip state={j.payment_state} />}
              <IconifyIcon icon="solar:alt-arrow-right-linear" aria-hidden="true" className="text-muted" />
            </Link>
          ))}
        </Card>
      )}

      {tab === 'measurements' && (
        <MeasurementSetList sets={c.measurement_sets} isOwner={isOwner} recheckDays={c.measurement_recheck_days} onChanged={load} />
      )}

      {tab === 'payments' && ps && (
        <Card className="hd-card">
          <Card.Body>
            <dl className="hd-dl" style={{ maxWidth: 420 }}>
              <dt>Paid and verified</dt><dd>{naira(ps.paid_verified)}</dd>
              <dt>Balance to collect</dt><dd>{naira(ps.balance_due)}</dd>
              <dt>Credit or refund due</dt><dd>{naira(ps.credit)}</dd>
              <dt>Waiting for verification</dt><dd>{ps.unverified_count} · {naira(ps.unverified_total)}</dd>
            </dl>
            <p className="small text-muted mt-3 mb-0">Open a job to record or verify a payment.</p>
          </Card.Body>
        </Card>
      )}

      {tab === 'details' && (
        <Card className="hd-card">
          <Card.Body>
            {dupes.length > 0 && (
              <Alert variant="warning">
                Another client shares this phone or email: {dupes.map((d) => <Link key={d.id} to={`/clients/${d.id}`} className="me-2">{d.name} ({d.client_ref})</Link>)}
                Nothing was merged.
              </Alert>
            )}
            <Form onSubmit={saveDetails} noValidate>
              <Row className="g-3">
                <Col xs={12} md={6}><Form.Group controlId="cd-name"><Form.Label>Name</Form.Label><Form.Control value={form.name} onChange={set('name')} required /></Form.Group></Col>
                <Col xs={12} md={6}><Form.Group controlId="cd-company"><Form.Label>Company</Form.Label><Form.Control value={form.company_name} onChange={set('company_name')} /></Form.Group></Col>
                <Col xs={12} md={6}><Form.Group controlId="cd-phone"><Form.Label>Phone or WhatsApp</Form.Label><Form.Control type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} /></Form.Group></Col>
                <Col xs={12} md={6}><Form.Group controlId="cd-email"><Form.Label>Email</Form.Label><Form.Control type="email" value={form.email} onChange={set('email')} /></Form.Group></Col>
                <Col xs={12} md={6}>
                  <Form.Group controlId="cd-pref"><Form.Label>Prefers to be contacted by</Form.Label>
                    <Form.Select value={form.preferred_contact} onChange={set('preferred_contact')}>
                      <option value="">Not stated</option><option value="whatsapp">WhatsApp</option><option value="phone">Phone call</option><option value="email">Email</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}><Form.Group controlId="cd-bday"><Form.Label>Birthday</Form.Label><Form.Control type="date" value={form.birthday} onChange={set('birthday')} /></Form.Group></Col>
                <Col xs={12}><Form.Group controlId="cd-comm"><Form.Label>Contact notes</Form.Label><Form.Control value={form.comm_notes} onChange={set('comm_notes')} maxLength={255} /><Form.Text>For example: call after 6pm.</Form.Text></Form.Group></Col>
                <Col xs={12}><Form.Group controlId="cd-notes"><Form.Label>Notes</Form.Label><Form.Control as="textarea" rows={3} value={form.notes} onChange={set('notes')} /></Form.Group></Col>
              </Row>
              <div className="d-flex align-items-center gap-3 mt-3">
                <Button type="submit" variant="outline-secondary" disabled={save.state === 'saving'}>Save details</Button>
                <SaveState state={save.state} error={save.error} />
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      <NewOrderModal
        show={showJob}
        onHide={() => setShowJob(false)}
        presetClient={{ id: c.id, name: c.name, client_ref: c.client_ref, phone: c.phone }}
        onCreated={(r) => (r?.id ? navigate(`/jobs/${r.id}`) : load())}
      />
    </div>
  );
};

export default ClientDetailPage;
