import { useEffect, useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';

// `prefill` shapes the modal: { to, subject, in_reply_to, references } for a
// reply, or null/{} for a fresh compose.
const ComposeModal = ({ show, prefill, onClose, onSent }) => {
  const [form, setForm] = useState({ to: '', subject: '', body: '' });
  const [meta, setMeta] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (show) {
      setForm({ to: prefill?.to || '', subject: prefill?.subject || '', body: '' });
      setMeta({ in_reply_to: prefill?.in_reply_to, references: prefill?.references });
      setError('');
    }
  }, [show, prefill]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.to.trim()) { setError('Recipient is required.'); return; }
    if (!form.subject.trim()) { setError('Subject is required.'); return; }
    if (!form.body.trim()) { setError('Message is required.'); return; }
    setBusy(true); setError('');
    try {
      // Plain text → minimal HTML (newlines → <br>).
      const htmlBody = form.body.split('\n').map((l) => l || '&nbsp;').join('<br>');
      await heritApi.mail.send({
        to: form.to.trim(), subject: form.subject.trim(), body: htmlBody,
        in_reply_to: meta.in_reply_to, references: meta.references,
      });
      onSent();
    } catch (err) { setError(err.message || 'Could not send.'); setBusy(false); }
  };

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title className="fs-5">{prefill?.in_reply_to ? 'Reply' : 'New email'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          <Form.Group className="mb-2">
            <Form.Label>To</Form.Label>
            <Form.Control type="email" value={form.to} onChange={set('to')} placeholder="name@example.com" />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Subject</Form.Label>
            <Form.Control value={form.subject} onChange={set('subject')} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Message</Form.Label>
            <Form.Control as="textarea" rows={10} value={form.body} onChange={set('body')} autoFocus />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? <><Spinner size="sm" /> Sending…</> : 'Send'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ComposeModal;
