import { useEffect, useState } from 'react';
import { Modal, Form, Row, Col, Button, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { useAuthContext } from '@/context/useAuthContext';
import { GARMENT_LABELS } from '@/helpers/format';
import ClientPicker from '@/components/herit/ClientPicker';
import DuplicateCandidates from '@/components/herit/DuplicateCandidates';
import ErrorSummary from '@/components/herit/ErrorSummary';

const GARMENTS = ['agbada', 'kaftan', 'senator', 'suit', 'shirt', 'trouser', 'other'];
const OWNER = ['super_admin', 'admin', 'manager'];
const empty = { garment_type: 'agbada', description: '', quantity: '1', due_date: '', event_date: '', price: '', job_stage: 'quote' };

/**
 * Add a job. The client is picked or typed; a phone or email that matches an
 * existing client comes back as 409 {candidates} and the owner chooses (BR-03).
 * Money is set by the quote; an owner may enter an agreed price directly.
 */
const NewOrderModal = ({ show, onHide, onCreated, presetClient }) => {
  const { user } = useAuthContext();
  const isOwner = OWNER.includes(user?.role);
  const [client, setClient] = useState({});
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) { setClient(presetClient || {}); setForm(empty); setErrors({}); setMessage(''); setCandidates([]); }
  }, [show, presetClient]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e, override = {}) => {
    e?.preventDefault?.();
    const errs = {};
    if (!client.id && !String(client.name || '').trim()) errs.client = 'Choose a client or add a new one';
    if (!/^\d+$/.test(String(form.quantity)) || Number(form.quantity) < 1) errs.quantity = 'Quantity must be a whole number from 1';
    setErrors(errs);
    if (Object.keys(errs).length) { setMessage('Please fix the highlighted fields.'); return; }
    setSaving(true); setMessage('');
    const body = {
      garment_type: form.garment_type, description: form.description, quantity: Number(form.quantity),
      due_date: form.due_date, event_date: form.event_date, job_stage: form.job_stage,
      ...(isOwner && form.price !== '' ? { price: form.price } : {}),
      ...(client.id ? { customer_id: client.id } : { customer: client.name, phone: client.phone || '', email: client.email || '' }),
      ...override,
    };
    try {
      const r = await heritApi.tailoring.create(body);
      onHide();
      onCreated?.(r);
    } catch (err) {
      if (err.status === 409 && err.data?.candidates) {
        setCandidates(err.data.candidates);
        setMessage('');
      } else {
        setMessage(err.message || 'The job was not saved. Try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down" className="hd" scrollable>
      <Form onSubmit={submit} noValidate className="d-flex flex-column h-100">
        <Modal.Header closeButton><Modal.Title as="h2" className="h5">Add job</Modal.Title></Modal.Header>
        <Modal.Body>
          <ErrorSummary message={message} errors={message ? errors : {}} />
          <DuplicateCandidates
            candidates={candidates}
            busy={saving}
            onPick={(c) => { setClient({ id: c.id, name: c.name, client_ref: c.client_ref }); setCandidates([]); submit(null, { customer_id: c.id, customer: undefined }); }}
            onConfirmNew={() => { setCandidates([]); submit(null, { confirm_new: true }); }}
          />
          <fieldset className="mb-3">
            <legend className="h6">Client</legend>
            <ClientPicker value={client} onChange={setClient} idPrefix="job-client" errors={errors} />
          </fieldset>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group controlId="job-garment">
                <Form.Label>Garment</Form.Label>
                <Form.Select value={form.garment_type} onChange={set('garment_type')}>
                  {GARMENTS.map((g) => <option key={g} value={g}>{GARMENT_LABELS[g]}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="job-qty">
                <Form.Label>Quantity</Form.Label>
                <Form.Control inputMode="numeric" value={form.quantity} onChange={set('quantity')} isInvalid={!!errors.quantity} />
                <Form.Control.Feedback type="invalid">{errors.quantity}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="job-desc">
                <Form.Label>Description</Form.Label>
                <Form.Control value={form.description} onChange={set('description')} maxLength={255} />
                <Form.Text>Style, fabric or occasion, in a few words.</Form.Text>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="job-due">
                <Form.Label>Promised date</Form.Label>
                <Form.Control type="date" value={form.due_date} onChange={set('due_date')} />
                <Form.Text>The date you promise the client.</Form.Text>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="job-event">
                <Form.Label>Event date</Form.Label>
                <Form.Control type="date" value={form.event_date} onChange={set('event_date')} />
                <Form.Text>The client's wedding or occasion, if any.</Form.Text>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="job-start">
                <Form.Label>Starts at</Form.Label>
                <Form.Select value={form.job_stage} onChange={set('job_stage')}>
                  <option value="quote">Quote (price not agreed yet)</option>
                  <option value="confirmed">Confirmed (price agreed)</option>
                </Form.Select>
              </Form.Group>
            </Col>
            {isOwner && (
              <Col xs={12} md={6}>
                <Form.Group controlId="job-price">
                  <Form.Label>Agreed price (₦)</Form.Label>
                  <Form.Control inputMode="decimal" value={form.price} onChange={set('price')} />
                  <Form.Text>Leave empty to send a quote instead.</Form.Text>
                </Form.Group>
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? <><Spinner size="sm" className="me-1" /> Saving</> : 'Add job'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default NewOrderModal;
