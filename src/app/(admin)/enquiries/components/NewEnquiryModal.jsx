import { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { newRequestKey } from '@/helpers/requestKey';
import ErrorSummary from '@/components/herit/ErrorSummary';

const TYPES = [['bespoke', 'Bespoke'], ['fitting', 'Fitting'], ['wholesale', 'Wholesale or group'], ['general', 'General']];
const empty = { name: '', phone: '', email: '', type: 'bespoke', interest: '', company: '', quantity: '', desired_date: '', message: '', source: 'phone' };

/** Staff-entered enquiry (a call, walk-in or WhatsApp message). Idempotent per open. */
const NewEnquiryModal = ({ show, onHide, onCreated }) => {
  const [form, setForm] = useState(empty);
  const [key, setKey] = useState(newRequestKey);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (show) { setForm(empty); setKey(newRequestKey()); setErrors({}); setMessage(''); } }, [show]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Enter the person’s name';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'That email address looks wrong';
    if (form.quantity && !/^\d+$/.test(form.quantity)) errs.quantity = 'Quantity must be a whole number';
    setErrors(errs);
    if (Object.keys(errs).length) { setMessage('Please fix the highlighted fields.'); return; }
    setSaving(true); setMessage('');
    try {
      const r = await heritApi.enquiries.create({ ...form, request_key: key });
      onHide();
      onCreated?.(r.id);
    } catch (err) {
      setMessage(err.message || 'The enquiry was not saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down" className="hd" scrollable>
      <Form onSubmit={submit} noValidate>
        <Modal.Header closeButton><Modal.Title as="h2" className="h5">Add enquiry</Modal.Title></Modal.Header>
        <Modal.Body>
          <ErrorSummary message={message} errors={message ? errors : {}} />
          <Row className="g-3">
            <Col xs={12}>
              <Form.Group controlId="enq-name">
                <Form.Label>Name <span aria-hidden="true">*</span></Form.Label>
                <Form.Control value={form.name} onChange={set('name')} isInvalid={!!errors.name} required />
                <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="enq-phone">
                <Form.Label>Phone or WhatsApp</Form.Label>
                <Form.Control type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} />
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="enq-email">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" value={form.email} onChange={set('email')} isInvalid={!!errors.email} />
                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="enq-type">
                <Form.Label>Type</Form.Label>
                <Form.Select value={form.type} onChange={set('type')}>
                  {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="enq-source">
                <Form.Label>How they got in touch</Form.Label>
                <Form.Select value={form.source} onChange={set('source')}>
                  <option value="phone">Phone call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="instagram">Instagram</option>
                  <option value="referral">Referral</option>
                  <option value="staff">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="enq-interest">
                <Form.Label>What they want</Form.Label>
                <Form.Control value={form.interest} onChange={set('interest')} maxLength={120} />
                <Form.Text>For example: wedding agbada, two senators.</Form.Text>
              </Form.Group>
            </Col>
            <Col xs={6}>
              <Form.Group controlId="enq-qty">
                <Form.Label>Quantity</Form.Label>
                <Form.Control inputMode="numeric" value={form.quantity} onChange={set('quantity')} isInvalid={!!errors.quantity} />
                <Form.Control.Feedback type="invalid">{errors.quantity}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={6}>
              <Form.Group controlId="enq-date">
                <Form.Label>Needed by</Form.Label>
                <Form.Control type="date" value={form.desired_date} onChange={set('desired_date')} />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="enq-company">
                <Form.Label>Company</Form.Label>
                <Form.Control value={form.company} onChange={set('company')} maxLength={160} />
                <Form.Text>Only for company or group orders.</Form.Text>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="enq-msg">
                <Form.Label>Notes from the conversation</Form.Label>
                <Form.Control as="textarea" rows={3} value={form.message} onChange={set('message')} />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? <><Spinner size="sm" className="me-1" /> Saving</> : 'Add enquiry'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default NewEnquiryModal;
