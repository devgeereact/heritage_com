import { useEffect, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import newRequestKey from '@/helpers/requestKey';
import { APPT_TYPE_LABELS, GARMENT_LABELS } from '@/helpers/format';
import ClientPicker from '@/components/herit/ClientPicker';
import ErrorSummary from '@/components/herit/ErrorSummary';
import TimeChooser, { emptyTime, timeBody } from './TimeChooser';
import ClashNotice from './ClashNotice';

const fresh = (preset = {}) => ({
  type: preset.type || 'consultation', client: preset.client || null, job_id: preset.job_id || '',
  duration_min: '', client_note: '', notes_internal: '', time: emptyTime(),
});

/**
 * Book an appointment (owner). Free times come from the slot list; a time typed
 * by hand that clashes answers 409 with can_override, and the owner can book it
 * anyway with a reason. One request key per opening, so a retry never doubles.
 */
const NewAppointmentModal = ({ show, onHide, onCreated, preset }) => {
  const [f, setF] = useState(fresh(preset));
  const [key, setKey] = useState(newRequestKey());
  const [jobs, setJobs] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [clash, setClash] = useState(null);
  const [override, setOverride] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (show) { setF(fresh(preset)); setKey(newRequestKey()); setErrors({}); setMessage(''); setClash(null); setOverride(''); }
  }, [show, preset]);

  const cid = f.client?.id;
  useEffect(() => {
    if (!cid) { setJobs([]); return undefined; }
    let live = true;
    heritApi.customers.get(cid).then((c) => { if (live) setJobs((c.jobs || []).filter((j) => !['handed_over', 'cancelled'].includes(j.job_stage))); })
      .catch(() => { if (live) setJobs([]); });
    return () => { live = false; };
  }, [cid]);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    const t = timeBody(f.time);
    if (t.error) errs.time = t.error;
    if (!f.client?.id && !(f.client?.name || '').trim()) errs.client = 'Choose a client or type a name';
    if (clash && !override.trim()) errs.override = 'Give a reason to book a time that is not free, or choose another time';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = {
      type: f.type, ...t, request_key: key,
      duration_min: f.duration_min || undefined,
      client_note: f.client_note, notes_internal: f.notes_internal,
      ...(f.client?.id ? { customer_id: f.client.id } : { contact_name: f.client.name, contact_phone: f.client.phone, contact_email: f.client.email }),
      ...(f.job_id ? { job_id: Number(f.job_id) } : {}),
      ...(clash ? { override_reason: override.trim() } : {}),
    };
    setBusy(true); setMessage('');
    try {
      const r = await heritApi.appointments.create(body);
      onCreated?.(r);
      onHide();
    } catch (err) {
      if (err.status === 409 && err.data?.can_override) { setClash(err.data); setMessage(''); }
      else setMessage(err.message);
    } finally { setBusy(false); }
  };

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down" className="hd" scrollable size="lg">
      <Form onSubmit={submit} noValidate>
        <Modal.Header closeButton><Modal.Title as="h2" className="h5">Book appointment</Modal.Title></Modal.Header>
        <Modal.Body>
          <ErrorSummary errors={errors} message={message} />
          <Form.Group controlId="na-type" className="mb-3">
            <Form.Label>Type</Form.Label>
            <Form.Select value={f.type} onChange={(e) => { set('type')(e); setF((x) => ({ ...x, time: { ...x.time, slot: null } })); setClash(null); }}>
              {Object.entries(APPT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Form.Select>
          </Form.Group>
          <div className="mb-3">
            <div className="form-label">Client</div>
            <ClientPicker value={f.client} onChange={(client) => setF((x) => ({ ...x, client, job_id: '' }))} idPrefix="na-client" errors={errors} />
            {errors.client && <div className="text-danger small">{errors.client}</div>}
          </div>
          {jobs.length > 0 && (
            <Form.Group controlId="na-job" className="mb-3">
              <Form.Label>Job <span className="text-muted fw-normal">(optional)</span></Form.Label>
              <Form.Select value={f.job_id} onChange={set('job_id')}>
                <option value="">Not linked to a job</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.code} · {GARMENT_LABELS[j.garment_type] || j.garment_type}</option>)}
              </Form.Select>
            </Form.Group>
          )}
          <div className="mb-3">
            <TimeChooser type={f.type} value={f.time} idPrefix="na" error={errors.time}
              onChange={(time) => { setF((x) => ({ ...x, time })); setClash(null); }} />
          </div>
          {f.time.mode !== 'all_day' && (
            <Form.Group controlId="na-dur" className="mb-3">
              <Form.Label>Length</Form.Label>
              <Form.Select value={f.duration_min} onChange={set('duration_min')}>
                <option value="">Usual length for this type</option>
                {[30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </Form.Select>
            </Form.Group>
          )}
          <Form.Group controlId="na-cnote" className="mb-3">
            <Form.Label>Note for the client <span className="text-muted fw-normal">(optional)</span></Form.Label>
            <Form.Control as="textarea" rows={2} maxLength={500} value={f.client_note} onChange={set('client_note')} />
            <Form.Text>The client can see this in their portal.</Form.Text>
          </Form.Group>
          <Form.Group controlId="na-inote">
            <Form.Label>Internal note <span className="text-muted fw-normal">(optional)</span></Form.Label>
            <Form.Control as="textarea" rows={2} value={f.notes_internal} onChange={set('notes_internal')} />
            <Form.Text>Only staff see this.</Form.Text>
          </Form.Group>
          <ClashNotice clash={clash} reason={override} onReason={setOverride} idPrefix="na" />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy && <Spinner size="sm" className="me-1" />}{clash ? 'Book anyway' : 'Book appointment'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default NewAppointmentModal;
