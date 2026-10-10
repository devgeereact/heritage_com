import { useEffect, useState } from 'react';
import { Modal, Form, Row, Col, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import heritApi from '@/helpers/heritApi';
import DuplicateCandidates from '@/components/herit/DuplicateCandidates';
import ErrorSummary from '@/components/herit/ErrorSummary';

const empty = { name: '', phone: '', email: '', company_name: '', preferred_contact: '', notes: '' };

/**
 * Add a client. A phone or email that matches an existing client answers 409
 * {candidates}: open the existing client, or confirm this is someone new
 * (BR-03, never merged silently). Measurements are added afterwards as a set.
 */
const NewCustomerModal = ({ show, onHide, onCreated }) => {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { if (show) { setForm(empty); setErrors({}); setMessage(''); setCandidates([]); } }, [show]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e, confirmNew = false) => {
    e?.preventDefault?.();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Enter the client’s name';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'That email address looks wrong';
    setErrors(errs);
    if (Object.keys(errs).length) { setMessage('Please fix the highlighted fields.'); return; }
    setSaving(true); setMessage('');
    try {
      const r = await heritApi.customers.create({ ...form, ...(confirmNew ? { confirm_new: true } : {}) });
      onHide();
      onCreated?.(r.id);
    } catch (err) {
      if (err.status === 409 && err.data?.candidates) setCandidates(err.data.candidates);
      else setMessage(err.message || 'The client was not saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down" className="hd" scrollable>
      <Form onSubmit={submit} noValidate>
        <Modal.Header closeButton><Modal.Title as="h2" className="h5">Add client</Modal.Title></Modal.Header>
        <Modal.Body>
          <ErrorSummary message={message} errors={message ? errors : {}} />
          <DuplicateCandidates
            candidates={candidates}
            busy={saving}
            pickLabel="Open this client"
            onPick={(c) => { onHide(); navigate(`/clients/${c.id}`); }}
            onConfirmNew={() => { setCandidates([]); submit(null, true); }}
          />
          <Row className="g-3">
            <Col xs={12}>
              <Form.Group controlId="nc-name">
                <Form.Label>Name <span aria-hidden="true">*</span></Form.Label>
                <Form.Control value={form.name} onChange={set('name')} isInvalid={!!errors.name} required />
                <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="nc-phone">
                <Form.Label>Phone or WhatsApp</Form.Label>
                <Form.Control type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} />
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="nc-email">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" value={form.email} onChange={set('email')} isInvalid={!!errors.email} />
                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="nc-company">
                <Form.Label>Company</Form.Label>
                <Form.Control value={form.company_name} onChange={set('company_name')} maxLength={160} />
                <Form.Text>Only if they order for a company.</Form.Text>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="nc-pref">
                <Form.Label>Prefers to be contacted by</Form.Label>
                <Form.Select value={form.preferred_contact} onChange={set('preferred_contact')}>
                  <option value="">Not stated</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Phone call</option>
                  <option value="email">Email</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="nc-notes">
                <Form.Label>Notes</Form.Label>
                <Form.Control as="textarea" rows={2} value={form.notes} onChange={set('notes')} />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? <><Spinner size="sm" className="me-1" /> Saving</> : 'Add client'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default NewCustomerModal;
