import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { newRequestKey } from '@/helpers/requestKey';
import { fmtUtc, naira } from '@/helpers/format';
import ErrorSummary from '@/components/herit/ErrorSummary';
import SaveState from '@/components/herit/SaveState';
import StatusChip from '@/components/herit/StatusChip';

const CHECKS = [
  ['garment_count', 'Garment count checked'], ['fit', 'Fit checked'], ['finishing', 'Finishing checked'],
  ['packaging', 'Packed'], ['accessories', 'Accessories included'], ['instructions', 'Care instructions given'],
];
const H_TONE = { planned: 'warn', dispatched: 'warn', completed: 'ok', failed: 'bad', cancelled: 'neutral' };
const H_LABEL = { planned: 'Planned', dispatched: 'On the way', completed: 'Handed over', failed: 'Failed', cancelled: 'Cancelled' };

/**
 * Collection and delivery records. Partial handovers are allowed: the job
 * reaches "Collected or delivered" only when every piece is out. Handing over
 * with a balance still owed is allowed, with a warning, and the balance is kept.
 */
const HandoverPanel = ({ job, isOwner, onChanged }) => {
  const remaining = Math.max(1, job.quantity || 1) - (job.handed_over_qty || 0);
  const closed = ['quote', 'cancelled', 'handed_over'].includes(job.job_stage);
  const blank = () => ({ method: 'collection', quantity: String(remaining > 0 ? remaining : 1), planned_for: '', address: '', courier: '', contact_name: '', contact_phone: '', tracking_url: '' });
  const [plan, setPlan] = useState(blank);
  const [planKey, setPlanKey] = useState(newRequestKey);
  const [planSave, setPlanSave] = useState({ state: null, error: '' });
  const [completing, setCompleting] = useState(null);
  const [done, setDone] = useState({ received_by: '', evidence_note: '', checklist: {} });
  const [doneSave, setDoneSave] = useState({ state: null, error: '' });
  const [result, setResult] = useState(null);

  useEffect(() => {
    const left = Math.max(1, job.quantity || 1) - (job.handed_over_qty || 0);
    setPlan((p) => ({ ...p, quantity: String(left > 0 ? left : 1) }));
  }, [job.handed_over_qty, job.quantity]);
  const setP = (k) => (e) => setPlan((p) => ({ ...p, [k]: e.target.value }));

  const savePlan = async (e) => {
    e.preventDefault();
    setPlanSave({ state: 'saving', error: '' });
    try {
      await heritApi.tailoring.handoverSave(job.id, { ...plan, quantity: Number(plan.quantity), request_key: planKey });
      setPlanSave({ state: 'saved', error: '' }); setPlanKey(newRequestKey()); setPlan(blank());
      onChanged?.();
    } catch (err) { setPlanSave({ state: 'failed', error: err.message }); }
  };

  const complete = async (e) => {
    e.preventDefault();
    setDoneSave({ state: 'saving', error: '' });
    try {
      const r = await heritApi.tailoring.handoverComplete(job.id, completing.id, done);
      setResult(r); setDoneSave({ state: 'saved', error: '' }); setCompleting(null);
      setDone({ received_by: '', evidence_note: '', checklist: {} });
      onChanged?.();
    } catch (err) { setDoneSave({ state: 'failed', error: err.message }); }
  };

  const bal = Number(job.money?.balance || 0);
  return (
    <>
      <p className="mb-3"><span className="fw-semibold tnum">{job.handed_over_qty || 0} of {job.quantity || 1}</span> handed over.</p>
      {result && (
        <Alert variant={result.warning ? 'warning' : 'success'} role="status">
          {result.progress}.{result.job_stage === 'handed_over' ? ' The job is complete.' : ''} {result.warning || ''}
        </Alert>
      )}

      {(job.handovers || []).length > 0 && (
        <Card className="hd-card mb-3">
          {(job.handovers || []).map((h) => (
            <div key={h.id} className="hd-row flex-wrap">
              <span className="hd-row-main">
                <span className="hd-row-title d-block">{h.method === 'delivery' ? 'Delivery' : 'Collection'} · {h.quantity} piece{h.quantity === 1 ? '' : 's'}</span>
                <span className="hd-row-sub d-block">
                  {h.completed_at ? `Done ${fmtUtc(h.completed_at)}${h.received_by ? ` · received by ${h.received_by}` : ''}` : h.planned_for ? `Planned ${fmtUtc(h.planned_for)}` : 'No time set'}
                  {h.courier ? ` · ${h.courier}` : ''}
                  {isOwner && h.balance_at_handover && Number(h.balance_at_handover) > 0 ? ` · balance then ${naira(h.balance_at_handover)}` : ''}
                </span>
              </span>
              <span className="d-flex gap-2 align-items-center">
                <StatusChip tone={H_TONE[h.status]}>{H_LABEL[h.status] || h.status}</StatusChip>
                {['planned', 'dispatched'].includes(h.status) && <Button size="sm" variant="primary" onClick={() => { setCompleting(h); setResult(null); setDoneSave({ state: null, error: '' }); }}>Complete</Button>}
              </span>
            </div>
          ))}
        </Card>
      )}

      {completing && (
        <Card className="hd-card mb-3">
          <Card.Body>
            <Form onSubmit={complete}>
              <h2 className="h6">Final check · {completing.quantity} piece{completing.quantity === 1 ? '' : 's'}</h2>
              {isOwner && bal > 0 && <Alert variant="warning" className="py-2">{naira(bal)} is still to pay. You can hand over anyway; the balance is recorded.</Alert>}
              <div className="mb-2">
                {CHECKS.map(([k, l]) => (
                  <Form.Check key={k} type="checkbox" id={`hc-${k}`} label={l} checked={!!done.checklist[k]}
                    onChange={(e) => setDone((d) => ({ ...d, checklist: { ...d.checklist, [k]: e.target.checked } }))} />
                ))}
              </div>
              <Row className="g-2">
                <Col xs={12} md={6}><Form.Group controlId="hc-rb"><Form.Label>Received by</Form.Label><Form.Control value={done.received_by} onChange={(e) => setDone((d) => ({ ...d, received_by: e.target.value }))} maxLength={120} /></Form.Group></Col>
                <Col xs={12} md={6}><Form.Group controlId="hc-ev"><Form.Label>Note</Form.Label><Form.Control value={done.evidence_note} onChange={(e) => setDone((d) => ({ ...d, evidence_note: e.target.value }))} maxLength={255} /><Form.Text>For example: photo sent on WhatsApp.</Form.Text></Form.Group></Col>
              </Row>
              <div className="d-flex align-items-center gap-2 mt-3">
                <Button type="submit" variant="primary" disabled={doneSave.state === 'saving'}>{doneSave.state === 'saving' ? <Spinner size="sm" /> : 'Mark as handed over'}</Button>
                <Button variant="outline-secondary" onClick={() => setCompleting(null)}>Cancel</Button>
                <SaveState state={doneSave.state} error={doneSave.error} />
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {closed ? (
        <p className="text-muted">{job.job_stage === 'quote' ? 'Confirm the job before planning a handover.' : job.job_stage === 'handed_over' ? 'Every piece has been handed over.' : 'This job was cancelled.'}</p>
      ) : remaining > 0 && !completing && (
        <Card className="hd-card">
          <Card.Body>
            <Form onSubmit={savePlan} noValidate>
              <h2 className="h6">Plan a collection or delivery</h2>
              <ErrorSummary message={planSave.state === 'failed' ? planSave.error : ''} />
              <Row className="g-3">
                <Col xs={12} md={4}>
                  <Form.Group controlId="ho-m"><Form.Label>Method</Form.Label>
                    <Form.Select value={plan.method} onChange={setP('method')}><option value="collection">Client collects</option><option value="delivery">Delivery</option></Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={6} md={4}><Form.Group controlId="ho-q"><Form.Label>Pieces</Form.Label><Form.Control inputMode="numeric" value={plan.quantity} onChange={setP('quantity')} /><Form.Text>{remaining} left to hand over.</Form.Text></Form.Group></Col>
                <Col xs={6} md={4}><Form.Group controlId="ho-t"><Form.Label>When (Lagos time)</Form.Label><Form.Control type="datetime-local" value={plan.planned_for} onChange={setP('planned_for')} /></Form.Group></Col>
                {plan.method === 'delivery' && (
                  <>
                    <Col xs={12}><Form.Group controlId="ho-a"><Form.Label>Address</Form.Label><Form.Control as="textarea" rows={2} value={plan.address} onChange={setP('address')} /></Form.Group></Col>
                    <Col xs={12} md={4}><Form.Group controlId="ho-c"><Form.Label>Courier</Form.Label><Form.Control value={plan.courier} onChange={setP('courier')} maxLength={80} /></Form.Group></Col>
                    <Col xs={12} md={4}><Form.Group controlId="ho-cn"><Form.Label>Contact name</Form.Label><Form.Control value={plan.contact_name} onChange={setP('contact_name')} maxLength={120} /></Form.Group></Col>
                    <Col xs={12} md={4}><Form.Group controlId="ho-cp"><Form.Label>Contact phone</Form.Label><Form.Control type="tel" inputMode="tel" value={plan.contact_phone} onChange={setP('contact_phone')} maxLength={40} /></Form.Group></Col>
                    <Col xs={12}><Form.Group controlId="ho-url"><Form.Label>Tracking link</Form.Label><Form.Control type="url" value={plan.tracking_url} onChange={setP('tracking_url')} /><Form.Text>Must start with https://</Form.Text></Form.Group></Col>
                  </>
                )}
              </Row>
              <div className="d-flex align-items-center gap-3 mt-3">
                <Button type="submit" variant={(job.handovers || []).some((h) => ['planned', 'dispatched'].includes(h.status)) ? 'outline-secondary' : 'primary'} disabled={planSave.state === 'saving'}>Save plan</Button>
                <SaveState state={planSave.state === 'failed' ? null : planSave.state} />
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}
    </>
  );
};

export default HandoverPanel;
