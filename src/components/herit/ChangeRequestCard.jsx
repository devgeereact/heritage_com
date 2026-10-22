import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import heritApi from '@/helpers/heritApi';
import { CHANGE_KIND_LABELS, fmtUtc, fmtWhen, naira, STAGE_LABELS } from '@/helpers/format';
import { ChangeChip } from '@/components/herit/StatusChip';
import SaveState from '@/components/herit/SaveState';

/**
 * A client's change request and the owner's decision. Once cutting has started,
 * approving a measurement or garment change needs a stated price or date effect
 * (the server answers 422 otherwise, BR-30). A reschedule is applied through the
 * booking lock and may clash.
 */
const ChangeRequestCard = ({ cr, showJob = false, onDecided }) => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ response: '', price_effect: '', date_effect: '', override_reason: '' });
  const [clash, setClash] = useState(false);
  const [save, setSave] = useState({ state: null, error: '' });
  const [note, setNote] = useState('');
  const p = cr.payload || {};
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const decide = async (decision) => {
    setSave({ state: 'saving', error: '' });
    try {
      const r = await heritApi.messages.changeDecide(cr.id, {
        decision, response: f.response.trim(),
        ...(f.price_effect !== '' ? { price_effect: f.price_effect } : {}),
        ...(f.date_effect ? { date_effect: f.date_effect } : {}),
        ...(clash && f.override_reason.trim() ? { override_reason: f.override_reason.trim() } : {}),
      });
      setSave({ state: 'saved', error: '' }); setOpen(false); setNote(r.note || '');
      onDecided?.(r);
    } catch (e) {
      if (e.status === 409 && e.data?.can_override) setClash(true);
      setSave({ state: 'failed', error: e.message });
    }
  };

  return (
    <Card className="hd-card mb-2">
      <Card.Body>
        <div className="d-flex flex-wrap justify-content-between gap-2">
          <div>
            <h3 className="h6 mb-1">{CHANGE_KIND_LABELS[cr.kind] || cr.kind}</h3>
            <div className="small text-muted">
              {showJob && <><Link to={`/jobs/${cr.job_id}?tab=messages`}>{cr.code}</Link> · {cr.client_name} · </>}
              {cr.job_stage ? `${STAGE_LABELS[cr.job_stage] || cr.job_stage} · ` : ''}asked {fmtUtc(cr.created_at)}
            </div>
          </div>
          <ChangeChip status={cr.status} />
        </div>
        {p.details && <p className="mt-2 mb-1" style={{ whiteSpace: 'pre-wrap' }}>{p.details}</p>}
        {p.address && <p className="mb-1"><span className="text-muted">New address:</span> <span style={{ whiteSpace: 'pre-wrap' }}>{p.address}</span></p>}
        {p.start && <p className="mb-1"><span className="text-muted">Asked for:</span> {fmtWhen(p.start)}</p>}
        {cr.measurement_set_id && <p className="mb-1 small">Proposed measurement set #{cr.measurement_set_id}. <Link to={`/clients/${cr.customer_id}?tab=measurements`}>Review it</Link>.</p>}
        {cr.status !== 'open' && (
          <p className="small mb-0 mt-2">
            {cr.owner_response && <>Your reply: {cr.owner_response}. </>}
            {cr.price_effect !== null && cr.price_effect !== undefined && <>Price effect {naira(cr.price_effect)}. </>}
            {cr.date_effect && <>New date {cr.date_effect}. </>}
          </p>
        )}
        {note && <Alert variant="info" className="mt-2 mb-0">{note}</Alert>}
        {cr.status === 'open' && !open && <Button className="mt-2" variant="outline-secondary" onClick={() => setOpen(true)}>Decide</Button>}
        {cr.status === 'open' && open && (
          <div className="border-top mt-2 pt-2">
            <Form.Group controlId={`cr-${cr.id}-resp`} className="mb-2">
              <Form.Label>Reply to the client</Form.Label>
              <Form.Control as="textarea" rows={2} maxLength={500} value={f.response} onChange={set('response')} />
              <Form.Text>The client sees the decision and this reply in their messages.</Form.Text>
            </Form.Group>
            {cr.kind !== 'reschedule' && (
              <Row className="g-2 mb-2">
                <Col xs={12} sm={6}>
                  <Form.Group controlId={`cr-${cr.id}-price`}>
                    <Form.Label>Price effect <span className="text-muted fw-normal">(₦, optional)</span></Form.Label>
                    <Form.Control inputMode="decimal" value={f.price_effect} onChange={set('price_effect')} />
                    <Form.Text>For example 5,000 or -2000. Use 0 for no change.</Form.Text>
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Group controlId={`cr-${cr.id}-date`}>
                    <Form.Label>New promised date <span className="text-muted fw-normal">(optional)</span></Form.Label>
                    <Form.Control type="date" value={f.date_effect} onChange={set('date_effect')} />
                  </Form.Group>
                </Col>
              </Row>
            )}
            {clash && (
              <Form.Group controlId={`cr-${cr.id}-ov`} className="mb-2">
                <Form.Label>Reason to move it to a time that is not free</Form.Label>
                <Form.Control value={f.override_reason} onChange={set('override_reason')} maxLength={255} />
              </Form.Group>
            )}
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <Button variant="primary" onClick={() => decide('approve')}>Approve</Button>
              <Button variant="outline-danger" onClick={() => decide('decline')}>Decline</Button>
              <Button variant="outline-secondary" onClick={() => setOpen(false)}>Back</Button>
            </div>
          </div>
        )}
        <SaveState state={save.state} error={save.error} />
      </Card.Body>
    </Card>
  );
};

export default ChangeRequestCard;
