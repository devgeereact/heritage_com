import { useEffect, useState } from 'react';
import { Modal, Form, Row, Col, Button, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const MEASURE_FIELDS = ['chest', 'waist', 'hip', 'shoulder', 'sleeve', 'length', 'neck'];
const empty = { name: '', phone: '', email: '', notes: '' };

const NewCustomerModal = ({ show, onHide, onCreated }) => {
  const [form, setForm] = useState(empty);
  const [m, setM] = useState({});
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotificationContext();

  useEffect(() => { if (show) { setForm(empty); setM({}); } }, [show]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setMeasure = (k) => (e) => setM((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showNotification({ message: 'Customer name is required', variant: 'danger' }); return; }
    setSaving(true);
    try {
      const measurements = Object.fromEntries(
        Object.entries(m).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)])
      );
      await heritApi.customers.create({ ...form, measurements });
      showNotification({ message: 'Customer added', variant: 'success' });
      onCreated?.();
      onHide();
    } catch (err) {
      showNotification({ message: err.message || 'Could not add customer', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title>New customer</Modal.Title></Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Name *</Form.Label>
              <Form.Control value={form.name} onChange={set('name')} placeholder="e.g. Chukwu Okafor" />
            </Col>
            <Col md={6}>
              <Form.Label>Phone / WhatsApp</Form.Label>
              <Form.Control value={form.phone} onChange={set('phone')} placeholder="+234..." />
            </Col>
            <Col md={6}>
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={form.email} onChange={set('email')} />
            </Col>
            <Col md={6}>
              <Form.Label>Notes</Form.Label>
              <Form.Control value={form.notes} onChange={set('notes')} placeholder="Preferences, style notes..." />
            </Col>
            <Col xs={12}>
              <hr className="my-1" />
              <Form.Label className="fw-semibold">Measurements (inches) — optional</Form.Label>
              <Row className="g-2">
                {MEASURE_FIELDS.map((field) => (
                  <Col xs={6} md={3} key={field}>
                    <Form.Control type="number" step="0.5" min="0" placeholder={field}
                      value={m[field] ?? ''} onChange={setMeasure(field)} />
                    <Form.Text className="text-muted text-capitalize">{field}</Form.Text>
                  </Col>
                ))}
              </Row>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? <Spinner size="sm" /> : 'Add customer'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default NewCustomerModal;
