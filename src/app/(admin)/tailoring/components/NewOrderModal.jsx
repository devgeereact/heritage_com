import { useEffect, useState } from 'react';
import { Modal, Form, Row, Col, Button, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const GARMENTS = ['agbada', 'kaftan', 'senator', 'suit', 'shirt', 'trouser', 'other'];
const MEASURE_FIELDS = ['chest', 'waist', 'hip', 'shoulder', 'sleeve', 'length', 'neck'];

const empty = {
  customer: '', phone: '', garment_type: 'agbada', fabric: '',
  price: '', deposit: '', due_date: '', assigned_tailor_id: '', notes: '',
};

const NewOrderModal = ({ show, onHide, tailors, onCreated }) => {
  const [form, setForm] = useState(empty);
  const [m, setM] = useState({});
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotificationContext();

  useEffect(() => {
    if (show) { setForm(empty); setM({}); }
  }, [show]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setMeasure = (k) => (e) => setM((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer.trim()) {
      showNotification({ message: 'Customer name is required', variant: 'danger' });
      return;
    }
    setSaving(true);
    try {
      const measurements = Object.fromEntries(
        Object.entries(m).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)])
      );
      await heritApi.tailoring.create({
        ...form,
        price: Number(form.price) || 0,
        deposit: Number(form.deposit) || 0,
        measurements,
      });
      showNotification({ message: 'Tailoring order created', variant: 'success' });
      onCreated?.();
      onHide();
    } catch (err) {
      showNotification({ message: err.message || 'Could not create order', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>New tailoring order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Customer name *</Form.Label>
              <Form.Control value={form.customer} onChange={set('customer')} placeholder="e.g. Chukwu Okafor" />
            </Col>
            <Col md={6}>
              <Form.Label>Phone</Form.Label>
              <Form.Control value={form.phone} onChange={set('phone')} placeholder="+234..." />
            </Col>
            <Col md={6}>
              <Form.Label>Garment</Form.Label>
              <Form.Select value={form.garment_type} onChange={set('garment_type')}>
                {GARMENTS.map((g) => <option key={g} value={g}>{g}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Fabric</Form.Label>
              <Form.Control value={form.fabric} onChange={set('fabric')} placeholder="Ankara, Adire, Aso-oke..." />
            </Col>
            <Col md={4}>
              <Form.Label>Price (₦)</Form.Label>
              <Form.Control type="number" min="0" value={form.price} onChange={set('price')} />
            </Col>
            <Col md={4}>
              <Form.Label>Deposit (₦)</Form.Label>
              <Form.Control type="number" min="0" value={form.deposit} onChange={set('deposit')} />
            </Col>
            <Col md={4}>
              <Form.Label>Due date</Form.Label>
              <Form.Control type="date" value={form.due_date} onChange={set('due_date')} />
            </Col>
            <Col md={6}>
              <Form.Label>Assign tailor</Form.Label>
              <Form.Select value={form.assigned_tailor_id} onChange={set('assigned_tailor_id')}>
                <option value="">Unassigned</option>
                {(tailors || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Notes</Form.Label>
              <Form.Control value={form.notes} onChange={set('notes')} placeholder="Style details, deadline notes..." />
            </Col>

            <Col xs={12}>
              <hr className="my-1" />
              <Form.Label className="fw-semibold">Measurements (inches)</Form.Label>
              <Row className="g-2">
                {MEASURE_FIELDS.map((field) => (
                  <Col xs={6} md={3} key={field}>
                    <Form.Control
                      type="number" step="0.5" min="0"
                      placeholder={field}
                      value={m[field] ?? ''}
                      onChange={setMeasure(field)}
                    />
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
            {saving ? <Spinner size="sm" /> : 'Create order'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default NewOrderModal;
