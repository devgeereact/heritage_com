import { useState } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { APPT_TYPE_LABELS, fmtTime, fmtWhen } from '@/helpers/format';
import SaveState from '@/components/herit/SaveState';

const SRC = { public: 'Website', portal: 'Client portal', owner: 'Staff' };

/** Requests waiting for the owner: confirm in one tap, or decline with a reason. */
const RequestsQueue = ({ items = [], onOpen, onChanged }) => {
  const [declining, setDeclining] = useState(null);
  const [reason, setReason] = useState('');
  const [save, setSave] = useState({ state: null, error: '' });

  const act = async (id, action, why) => {
    setSave({ state: 'saving', error: '' });
    try {
      await heritApi.appointments.setStatus(id, action, why);
      setSave({ state: 'saved', error: '' });
      setDeclining(null); setReason('');
      onChanged?.(action === 'confirm' ? 'Request confirmed' : 'Request declined');
    } catch (e) { setSave({ state: 'failed', error: e.message }); }
  };

  if (!items.length) {
    return <Card className="hd-card"><Card.Body className="text-muted">No requests waiting. Requests from the website and the client portal appear here.</Card.Body></Card>;
  }
  return (
    <Card className="hd-card">
      <SaveState state={save.state} error={save.error} />
      {items.map((a) => (
        <div key={a.id} className="hd-row flex-wrap">
          <button type="button" className="hd-row-main btn btn-link text-start p-0 text-decoration-none" onClick={() => onOpen(a.id)}>
            <span className="hd-row-title d-block">{fmtWhen(a.starts_at_local)} to {fmtTime(a.ends_at_local)} · {APPT_TYPE_LABELS[a.type] || a.type}</span>
            <span className="hd-row-sub d-block text-truncate">
              {a.client_name || a.contact_name}{a.job_code ? ` · ${a.job_code}` : ''} · {SRC[a.source] || a.source}
              {a.hold_expires_at_local ? ` · held until ${fmtWhen(a.hold_expires_at_local)}` : ''}
            </span>
          </button>
          {declining === a.id ? (
            <div className="d-flex flex-wrap gap-2 align-items-end w-100 mt-2">
              <Form.Group controlId={`rq-reason-${a.id}`} className="flex-grow-1">
                <Form.Label>Reason for declining</Form.Label>
                <Form.Control value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
              </Form.Group>
              <Button variant="outline-danger" disabled={!reason.trim()} onClick={() => act(a.id, 'decline', reason.trim())}>Decline</Button>
              <Button variant="outline-secondary" onClick={() => { setDeclining(null); setReason(''); }}>Back</Button>
            </div>
          ) : (
            <span className="d-flex gap-2">
              <Button variant="primary" onClick={() => act(a.id, 'confirm')}>Confirm</Button>
              <Button variant="outline-secondary" onClick={() => setDeclining(a.id)}>Decline</Button>
            </span>
          )}
        </div>
      ))}
    </Card>
  );
};

export default RequestsQueue;
