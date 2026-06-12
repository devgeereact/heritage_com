import { useEffect, useState } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { STAFF_ROLES, ROLE_LABELS } from '@/helpers/roles';

const STATUSES = ['active', 'invited', 'suspended'];

// `staff` null = hidden. isSelf locks the role/status fields (server blocks it too).
const EditStaffModal = ({ staff, isSelf, onClose, onDone }) => {
  const [form, setForm] = useState({ name: '', phone: '', role: 'employee', status: 'active' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (staff) setForm({ name: staff.name || '', phone: staff.phone || '', role: staff.role, status: staff.status });
    setError('');
  }, [staff]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setBusy(true); setError('');
    try {
      await heritApi.team.update(staff.id, {
        name: form.name.trim(), phone: form.phone.trim(), role: form.role, status: form.status,
      });
      onDone();
    } catch (err) { setError(err.message || 'Could not save.'); setBusy(false); }
  };

  return (
    <Modal show={!!staff} onHide={onClose} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title className="fs-5">Edit {staff?.name}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Full name</Form.Label>
            <Form.Control value={form.name} onChange={set('name')} autoFocus />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Phone</Form.Label>
            <Form.Control value={form.phone} onChange={set('phone')} placeholder="+234..." />
          </Form.Group>
          <Row className="g-2">
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>Role</Form.Label>
                <Form.Select value={form.role} onChange={set('role')} disabled={isSelf}>
                  {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>Status</Form.Label>
                <Form.Select value={form.status} onChange={set('status')} disabled={isSelf}>
                  {STATUSES.map((s) => <option key={s} value={s} className="text-capitalize">{s}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          {isSelf && <Form.Text className="text-muted">You can't change your own role or status.</Form.Text>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? <><Spinner size="sm" /> Saving…</> : 'Save changes'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditStaffModal;
