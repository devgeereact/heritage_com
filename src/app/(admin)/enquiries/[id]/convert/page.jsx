import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import { newRequestKey } from '@/helpers/requestKey';
import { fmtDate, GARMENT_LABELS } from '@/helpers/format';
import LoadError from '@/components/herit/LoadError';
import PageHeader from '@/components/herit/PageHeader';
import ClientPicker from '@/components/herit/ClientPicker';
import DuplicateCandidates from '@/components/herit/DuplicateCandidates';
import ErrorSummary from '@/components/herit/ErrorSummary';

const GARMENTS = ['agbada', 'kaftan', 'senator', 'suit', 'shirt', 'trouser', 'other'];
const STEPS = ['Client', 'Job', 'Check and convert'];

/**
 * Convert an enquiry into a client and a job (owner). One request key per
 * wizard open, so a double tap or a retry after a dropped connection returns
 * the same client and job (BR-02). A phone or email match answers 409
 * {candidates}; the owner picks the existing client or confirms a new one.
 */
const ConvertEnquiryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [requestKey] = useState(newRequestKey);
  const [e, setE] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [client, setClient] = useState({});
  const [confirmNew, setConfirmNew] = useState(false);
  const [job, setJob] = useState({ garment_type: 'agbada', description: '', quantity: '1', event_date: '', due_date: '', next_action: '', next_action_date: '', fabric_source: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await heritApi.enquiries.get(id);
      setE(r);
      if (r.job_id) { navigate(`/jobs/${r.job_id}`, { replace: true }); return; }
      setClient(r.client ? { id: r.client.id, name: r.client.name, client_ref: r.client.client_ref, phone: r.client.phone } : { name: r.name, phone: r.phone, email: r.email });
      setJob((j) => ({ ...j, description: r.interest || '', quantity: String(r.quantity || 1), event_date: r.desired_date || '' }));
      setState('ready');
    } catch (err) {
      setError(err); setState('error');
    }
  }, [id, navigate]);
  useEffect(() => { load(); }, [load]);

  const setJ = (k) => (ev) => setJob((j) => ({ ...j, [k]: ev.target.value }));

  const validate = (s) => {
    const errs = {};
    if (s === 0 && !client.id && !String(client.name || '').trim()) errs.name = 'Enter the client’s name or pick an existing client';
    if (s === 1 && (!/^\d+$/.test(String(job.quantity)) || Number(job.quantity) < 1)) errs.quantity = 'Quantity must be a whole number from 1';
    setErrors(errs);
    setMessage(Object.keys(errs).length ? 'Please fix the highlighted fields.' : '');
    return !Object.keys(errs).length;
  };

  const convert = async (clientOverride, newOverride) => {
    const c = clientOverride || client;
    const asNew = newOverride ?? confirmNew;
    setSaving(true); setMessage('');
    try {
      const r = await heritApi.enquiries.convert(id, {
        request_key: requestKey,
        client: c.id ? { id: c.id } : { name: c.name, phone: c.phone || '', email: c.email || '', ...(asNew ? { confirm_new: true } : {}) },
        job: { ...job, quantity: Number(job.quantity) },
      });
      navigate(`/jobs/${r.job_id}`, { state: { notice: r.duplicate ? 'This enquiry was already converted. Here is its job.' : 'Client and job created.' } });
    } catch (err) {
      if (err.status === 409 && err.data?.candidates) {
        setCandidates(err.data.candidates);
        setStep(0);
      } else {
        setMessage(err.message || 'The conversion did not go through. Try again; it will not create a duplicate.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading') return <div className="hd text-center py-5"><Spinner role="status" /></div>;
  if (state === 'error') return <div className="hd"><LoadError what="this enquiry" error={error} onRetry={load} /></div>;

  return (
    <div className="hd" style={{ maxWidth: 720 }}>
      <PageTitle title="Convert enquiry" />
      <PageHeader back={{ to: `/enquiries/${id}`, label: e.name }} title="Convert to client and job" />

      <ol className="d-flex gap-2 list-unstyled mb-3 small" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex-fill hd-step ${i < step ? 'hd-step--done' : ''} ${i === step ? 'hd-step--current' : ''}`} aria-current={i === step ? 'step' : undefined}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <ErrorSummary message={message} errors={message ? errors : {}} />

      <Card className="hd-card">
        <Card.Body>
          {step === 0 && (
            <>
              <h2 className="h5">Who is the client?</h2>
              <DuplicateCandidates
                candidates={candidates}
                busy={saving}
                onPick={(c) => { const picked = { id: c.id, name: c.name, client_ref: c.client_ref }; setClient(picked); setCandidates([]); setConfirmNew(false); setStep(2); }}
                onConfirmNew={() => { setCandidates([]); setConfirmNew(true); setStep(2); }}
              />
              {e.candidates?.length > 0 && !candidates.length && !client.id && (
                <Alert variant="warning">
                  <div className="fw-semibold mb-2">This phone or email matches an existing client.</div>
                  {e.candidates.map((c) => (
                    <div key={c.id} className="d-flex justify-content-between align-items-center gap-2 border rounded p-2 mb-1 bg-body">
                      <span>{c.name} <span className="small text-muted">{c.client_ref} · {c.phone_masked} · {c.job_count} jobs</span></span>
                      <Button variant="outline-secondary" onClick={() => setClient({ id: c.id, name: c.name, client_ref: c.client_ref })}>Use this client</Button>
                    </div>
                  ))}
                </Alert>
              )}
              <ClientPicker value={client} onChange={(v) => { setClient(v); setConfirmNew(false); }} idPrefix="conv" errors={errors} />
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="h5">The job</h2>
              <Row className="g-3">
                <Col xs={12} md={6}>
                  <Form.Group controlId="conv-garment">
                    <Form.Label>Garment</Form.Label>
                    <Form.Select value={job.garment_type} onChange={setJ('garment_type')}>
                      {GARMENTS.map((g) => <option key={g} value={g}>{GARMENT_LABELS[g]}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group controlId="conv-qty">
                    <Form.Label>Quantity</Form.Label>
                    <Form.Control inputMode="numeric" value={job.quantity} onChange={setJ('quantity')} isInvalid={!!errors.quantity} />
                    <Form.Control.Feedback type="invalid">{errors.quantity}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group controlId="conv-desc">
                    <Form.Label>Description</Form.Label>
                    <Form.Control value={job.description} onChange={setJ('description')} maxLength={255} />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group controlId="conv-event">
                    <Form.Label>Event date</Form.Label>
                    <Form.Control type="date" value={job.event_date} onChange={setJ('event_date')} />
                    <Form.Text>The client's occasion.</Form.Text>
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group controlId="conv-due">
                    <Form.Label>Promised date</Form.Label>
                    <Form.Control type="date" value={job.due_date} onChange={setJ('due_date')} />
                    <Form.Text>Can be set later by the quote.</Form.Text>
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group controlId="conv-na">
                    <Form.Label>Next action</Form.Label>
                    <Form.Control value={job.next_action} onChange={setJ('next_action')} maxLength={160} />
                    <Form.Text>For example: send quote.</Form.Text>
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group controlId="conv-nad">
                    <Form.Label>Next action date</Form.Label>
                    <Form.Control type="date" value={job.next_action_date} onChange={setJ('next_action_date')} />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group controlId="conv-fabric">
                    <Form.Label>Fabric from</Form.Label>
                    <Form.Select value={job.fabric_source} onChange={setJ('fabric_source')}>
                      <option value="">Not decided</option>
                      <option value="client">The client</option>
                      <option value="herit">Herit</option>
                      <option value="mixed">Both</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="h5">Check and convert</h2>
              <dl className="hd-dl mb-3">
                <dt>Client</dt>
                <dd>{client.name}{client.client_ref ? ` (${client.client_ref})` : confirmNew ? ' (new client)' : client.id ? '' : ' (new client)'}</dd>
                <dt>Job</dt><dd>{GARMENT_LABELS[job.garment_type]} × {job.quantity}</dd>
                {job.description && <><dt>Description</dt><dd>{job.description}</dd></>}
                {job.event_date && <><dt>Event</dt><dd>{fmtDate(job.event_date)}</dd></>}
                {job.due_date && <><dt>Promised</dt><dd>{fmtDate(job.due_date)}</dd></>}
                {job.next_action && <><dt>Next action</dt><dd>{job.next_action}{job.next_action_date ? `, ${fmtDate(job.next_action_date)}` : ''}</dd></>}
              </dl>
              <p className="text-muted small mb-0">The job starts at Quote. Send a quote from the job when you are ready.</p>
            </>
          )}
        </Card.Body>
        <Card.Footer className="bg-transparent d-flex justify-content-between gap-2">
          {step > 0 ? <Button variant="outline-secondary" onClick={() => setStep(step - 1)} disabled={saving}>Back</Button> : <Link className="btn btn-outline-secondary" to={`/enquiries/${id}`}>Cancel</Link>}
          {step < 2 ? (
            <Button variant="primary" onClick={() => validate(step) && setStep(step + 1)}>Continue</Button>
          ) : (
            <Button variant="primary" onClick={() => convert()} disabled={saving}>{saving ? <><Spinner size="sm" className="me-1" /> Converting</> : 'Convert'}</Button>
          )}
        </Card.Footer>
      </Card>
    </div>
  );
};

export default ConvertEnquiryPage;
