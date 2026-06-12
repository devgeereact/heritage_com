import { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { STAFF_ROLES, ROLE_LABELS } from '@/helpers/roles';

const empty = { name: '', email: '', role: 'employee', phone: '', password: '' };

const NewStaffModal = ({ show, onClose, onDone }) => {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { temp_password } after create
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const close = () => { setForm(empty); setError(''); setDone(null); setBusy(false); onClose(); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    setBusy(true); setError('');
    try {
      const res = await heritApi.team.create({
        name: form.name.trim(), email: form.email.trim(), role: form.role,
        phone: form.phone.trim(), password: form.password.trim() || undefined,
      });
      setDone(res); // show temp password, then close on confirm
    } catch (err) { setError(err.message || 'Could not create.'); setBusy(false); }
  };

  return (
    <Modal show={show} onHide={close} centered>
      {done ? (
        <>
          <Modal.Header closeButton><Modal.Title className="fs-5">Staff added</Modal.Title></Modal.Header>
          <Modal.Body>
            <p className="mb-2"><strong>{form.name}</strong> can now sign in with <strong>{form.email}</strong>.</p>
            <Alert variant="info" className="mb-0">
              Temporary password — copy and hand it over now, it won't be shown again:
              <div className="fs-5 fw-bold mt-1 font-monospace">{done.temp_password}</div>
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => { onDone(); setForm(empty); setDone(null); }}>Done</Button>
          </Modal.Footer>
        </>
      ) : (
        <Form onSubmit={submit}>
          <Modal.Header closeButton><Modal.Title className="fs-5">Add staff</Modal.Title></Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger" className="py-2">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Full name</Form.Label>
              <Form.Control value={form.name} onChange={set('name')} placeholder="e.g. Funke Adeyemi" autoFocus />
            </Form.Group>
            <Row className="g-2">
              <Col md={7}><Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" value={form.email} onChange={set('email')} placeholder="name@heritclothing.com" /></Form.Group></Col>
              <Col md={5}><Form.Group className="mb-3"><Form.Label>Phone</Form.Label><Form.Control value={form.phone} onChange={set('phone')} placeholder="+234..." /></Form.Group></Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select value={form.role} onChange={set('role')}>
                {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </Form.Select>
              <Form.Text>Role decides which modules they see. Manage the full map under Permissions.</Form.Text>
            </Form.Group>
            <Form.Group>
              <Form.Label>Password <span className="text-muted">(optional)</span></Form.Label>
              <Form.Control value={form.password} onChange={set('password')} placeholder="Leave blank to auto-generate a temporary one" />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={close} disabled={busy}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={busy}>{busy ? <><Spinner size="sm" /> Saving…</> : 'Add staff'}</Button>
          </Modal.Footer>
        </Form>
      )}
    </Modal>
  );
};

export default NewStaffModal;
