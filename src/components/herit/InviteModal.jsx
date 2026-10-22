import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { fmtWhen } from '@/helpers/format';

/**
 * Make a single-use access link for a client (customer_id) or for a waiting
 * access request (challenge_id). Herit sends it by hand: WhatsApp link, or copy
 * the message. Nothing is sent automatically.
 */
const InviteModal = ({ show, onHide, customerId, challengeId, clientName, onCreated }) => {
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => { if (show) { setRes(null); setError(''); setCopied(''); } }, [show]);

  const create = async () => {
    setBusy(true); setError('');
    try {
      const r = await heritApi.access.invite(challengeId ? { challenge_id: challengeId } : { customer_id: customerId });
      setRes(r); onCreated?.(r);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); } catch { setCopied('select'); }
  };

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down" className="hd">
      <Modal.Header closeButton><Modal.Title as="h2" className="h5">Access link{clientName ? ` for ${clientName}` : ''}</Modal.Title></Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {!res && (
          <>
            <p>This makes a private link that lets the client open their jobs without a code. It works once and expires after a day.</p>
            <p className="small text-muted mb-0">Only send it to the client's own number or email. Anyone with the link can open their jobs until it is used.</p>
          </>
        )}
        {res && (
          <>
            <p className="mb-2">Link ready. It works once and expires {fmtWhen(res.expires_at_local)}.</p>
            {res.wa_link && <a className="btn btn-primary w-100 mb-3" href={res.wa_link} target="_blank" rel="noopener noreferrer">Send by WhatsApp</a>}
            <Form.Group controlId="inv-msg" className="mb-2">
              <Form.Label>Message</Form.Label>
              <Form.Control as="textarea" rows={4} readOnly value={res.message_text} onFocus={(e) => e.target.select()} />
            </Form.Group>
            <div className="d-flex flex-wrap gap-2">
              <Button variant="outline-secondary" onClick={() => copy(res.message_text, 'message')}>Copy message</Button>
              <Button variant="outline-secondary" onClick={() => copy(res.invite_url, 'link')}>Copy link only</Button>
            </div>
            <div className="small mt-2" role="status">
              {copied === 'select' ? 'Copying is blocked here; select the text and copy it.' : copied ? `Copied the ${copied}.` : ''}
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>{res ? 'Done' : 'Cancel'}</Button>
        {!res && <Button variant="primary" onClick={create} disabled={busy}>{busy && <Spinner size="sm" className="me-1" />}Create link</Button>}
      </Modal.Footer>
    </Modal>
  );
};

export default InviteModal;
