import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { STAGE_LABELS } from '@/helpers/format';
import SaveState from '@/components/herit/SaveState';

const FLOW = ['quote', 'confirmed', 'measurements_approved', 'in_production', 'fitting', 'quality_check', 'ready', 'handed_over'];

/**
 * Stage progress bar shown under the job header on every tab (D-023 prototype).
 * The current step scrolls into view on narrow screens.
 */
export const StageStepper = ({ current, stages = [] }) => {
  const label = (k) => stages.find((s) => s.key === k)?.label || STAGE_LABELS[k] || k;
  const idx = FLOW.indexOf(current);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current?.querySelector('.hd-step--current');
    if (el && ref.current) ref.current.scrollLeft = el.offsetLeft - ref.current.offsetLeft - 16;
  }, [current]);
  return (
    <ol ref={ref} className="hd-stepper list-unstyled mb-3" aria-label="Job stages">
      {FLOW.map((s, i) => (
        <li key={s} className={`hd-step ${current !== 'cancelled' && i < idx ? 'hd-step--done' : ''} ${s === current ? 'hd-step--current' : ''}`}
          aria-current={s === current ? 'step' : undefined}>
          {label(s)}
        </li>
      ))}
    </ol>
  );
};

/**
 * Stage control:  the next steps the server allows, an owner-only
 * forced move with a reason, and the "ready or collected?" prompt for jobs
 * carried over as "done" from the old board.
 */
const StagePanel = ({ job, stages, isOwner, onChanged }) => {
  const [save, setSave] = useState({ state: null, error: '' });
  const [allowed, setAllowed] = useState(null);
  const [force, setForce] = useState({ open: false, stage: '', reason: '' });
  const [cancelAsk, setCancelAsk] = useState(false);
  const label = (k) => stages.find((s) => s.key === k)?.label || STAGE_LABELS[k] || k;
  const current = job.job_stage;
  const next = (allowed || job.allowed_next || []).filter((s) => s !== 'handed_over');
  const forward = next.filter((s) => s !== 'cancelled');
  const canCancel = next.includes('cancelled');

  const move = async (to, extra = {}) => {
    setSave({ state: 'saving', error: '' });
    try {
      await heritApi.tailoring.moveStage(job.id, { stage: to, ...extra });
      setSave({ state: 'saved', error: '' });
      setAllowed(null); setForce({ open: false, stage: '', reason: '' }); setCancelAsk(false);
      onChanged?.();
    } catch (e) {
      if (e.status === 409 && Array.isArray(e.data?.allowed)) setAllowed(e.data.allowed);
      setSave({ state: 'failed', error: e.message });
    }
  };

  const confirmReview = async (outcome) => {
    setSave({ state: 'saving', error: '' });
    try { await heritApi.tailoring.confirmReview(job.id, outcome); setSave({ state: 'saved', error: '' }); onChanged?.(); }
    catch (e) { setSave({ state: 'failed', error: e.message }); }
  };

  return (
    <Card className="hd-card mb-3">
      <Card.Body>
        <h2 className="h6">Stage</h2>
        {current === 'cancelled' && <Alert variant="secondary">This job was cancelled.</Alert>}

        {job.stage_review ? (
          <Alert variant="warning">
            <div className="fw-semibold mb-2">This job was marked “done” on the old board. Is it still here, or did the client collect it?</div>
            {isOwner ? (
              <div className="d-flex gap-2 flex-wrap">
                <Button variant="outline-secondary" onClick={() => confirmReview('ready')}>Still here, ready</Button>
                <Button variant="outline-secondary" onClick={() => confirmReview('handed_over')}>Already collected</Button>
              </div>
            ) : <div className="small">The owner needs to confirm this.</div>}
          </Alert>
        ) : null}

        {forward.length > 0 && (
          <div className="d-flex gap-2 flex-wrap mb-2">
            {forward.map((s, i) => (
              <Button key={s} variant={i === 0 && current !== 'ready' ? 'primary' : 'outline-secondary'} disabled={save.state === 'saving'} onClick={() => move(s)}>
                {save.state === 'saving' ? <Spinner size="sm" /> : `Move to ${label(s).toLowerCase()}`}
              </Button>
            ))}
          </div>
        )}
        {forward.includes('measurements_approved') && !job.has_approved_snapshot && (
          <p className="small text-muted">Attach an approved measurement set (Measurements tab) before moving to Measurements approved.</p>
        )}
        {current === 'ready' && <p className="small text-muted">Record the collection or delivery in the Handover tab to finish the job.</p>}
        {allowed && <p className="small">That move is not allowed from {label(current).toLowerCase()}. The buttons above show the allowed steps.</p>}
        <SaveState state={save.state} error={save.error} />

        <div className="d-flex gap-3 flex-wrap mt-2">
          {canCancel && !cancelAsk && <Button variant="link" className="px-0 text-danger" onClick={() => setCancelAsk(true)}>Cancel this job</Button>}
          {isOwner && !force.open && <Button variant="link" className="px-0" onClick={() => setForce({ open: true, stage: '', reason: '' })}>Move to another stage…</Button>}
        </div>
        {cancelAsk && (
          <Alert variant="danger" className="mt-2">
            <div className="mb-2">Cancel {job.code}? Payments stay on record; refund any credit from the Payments tab.</div>
            <div className="d-flex gap-2"><Button variant="outline-danger" onClick={() => move('cancelled')}>Yes, cancel the job</Button><Button variant="outline-secondary" onClick={() => setCancelAsk(false)}>Keep it</Button></div>
          </Alert>
        )}
        {force.open && (
          <Form className="mt-2 border-top pt-3" onSubmit={(e) => { e.preventDefault(); move(force.stage, { force: true, reason: force.reason }); }}>
            <Row className="g-2">
              <Col xs={12} md={5}>
                <Form.Group controlId="force-stage">
                  <Form.Label>Move to</Form.Label>
                  <Form.Select value={force.stage} onChange={(e) => setForce((f) => ({ ...f, stage: e.target.value }))}>
                    <option value="">Choose…</option>
                    {stages.filter((s) => s.key !== current && s.key !== 'handed_over').map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={7}>
                <Form.Group controlId="force-reason">
                  <Form.Label>Reason (recorded)</Form.Label>
                  <Form.Control value={force.reason} onChange={(e) => setForce((f) => ({ ...f, reason: e.target.value }))} />
                  <Form.Text>At least 5 characters, for example: client asked to restart.</Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex gap-2 mt-2">
              <Button type="submit" variant="outline-secondary" disabled={!force.stage || force.reason.trim().length < 5}>Move with reason</Button>
              <Button variant="link" onClick={() => setForce({ open: false, stage: '', reason: '' })}>Never mind</Button>
            </div>
          </Form>
        )}
      </Card.Body>
    </Card>
  );
};

export default StagePanel;
