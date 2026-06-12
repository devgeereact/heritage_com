import { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';

const empty = { name: '', contact: '', phone: '', email: '', address: '', notes: '' };

const NewSupplierModal = ({ show, onClose, onDone }) => {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Supplier name is required.'); return; }
    setBusy(true); setError('');
    try {
      await heritApi.suppliers.create(form);
      setForm(empty); onDone();
    } catch (err) { setError(err.message || 'Could not save.'); setBusy(false); }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title className="fs-5">New supplier</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control value={form.name} onChange={set('name')} placeholder="e.g. Ajuwon Fabrics Ltd" autoFocus />
          </Form.Group>
          <Row className="g-2">
            <Col md={6}><Form.Group className="mb-3"><Form.Label>Contact person</Form.Label><Form.Control value={form.contact} onChange={set('contact')} /></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-3"><Form.Label>Phone</Form.Label><Form.Control value={form.phone} onChange={set('phone')} placeholder="+234..." /></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" value={form.email} onChange={set('email')} /></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-3"><Form.Label>Address</Form.Label><Form.Control value={form.address} onChange={set('address')} /></Form.Group></Col>
          </Row>
          <Form.Group><Form.Label>Notes</Form.Label><Form.Control as="textarea" rows={2} value={form.notes} onChange={set('notes')} /></Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? <><Spinner size="sm" /> Saving…</> : 'Add supplier'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default NewSupplierModal;
