import { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { newRequestKey } from '@/helpers/requestKey';
import { lagosToday, METHOD_LABELS, naira } from '@/helpers/format';
import ErrorSummary from './ErrorSummary';
import SaveState from './SaveState';

const METHODS = ['cash', 'transfer', 'pos_card', 'gateway', 'other'];
const AMOUNT = /^\d{1,3}(,\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/;

/**
 * Record a payment (or a refund) on a job. The request key is made when the
 * modal opens and resent on retry, so a double tap never records twice
 * (BR-22). Typed values stay if saving fails.
 */
const RecordPaymentModal = ({ show, onHide, job, kind = 'payment', onSaved, verifiedMethods = ['cash'], credit }) => {
  const [form, setForm] = useState({ amount: '', method: 'cash', external_ref: '', received_on: lagosToday(), note: '', reason: '' });
  const [key, setKey] = useState(newRequestKey);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [state, setState] = useState(null);
  const [force, setForce] = useState(false);

  useEffect(() => {
    if (show) {
      setForm({ amount: '', method: kind === 'refund' ? 'transfer' : 'cash', external_ref: '', received_on: lagosToday(), note: '', reason: '' });
      setKey(newRequestKey()); setErrors({}); setMessage(''); setState(null); setForce(false);
    }
  }, [show, kind]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    const amt = form.amount.trim();
    if (!AMOUNT.test(amt) || Number(amt.replace(/,/g, '')) <= 0) errs.amount = 'Enter an amount more than 0, like 20000 or 20,000';
    if (kind === 'payment' && form.received_on > lagosToday()) errs.received_on = 'The payment date cannot be in the future';
    if (force && form.reason.trim().length < 5) errs.reason = 'Give a reason of at least 5 characters';
    setErrors(errs);
    if (Object.keys(errs).length) { setMessage('Please fix the highlighted fields.'); return; }
    setState('saving'); setMessage('');
    try {
      const body = { job_id: job.id, amount: amt, method: form.method, external_ref: form.external_ref, note: form.note, request_key: key };
      const r = kind === 'refund'
        ? await heritApi.ledger.refund({ ...body, ...(force ? { force: true, reason: form.reason } : {}) })
        : await heritApi.ledger.record({ ...body, received_on: form.received_on });
      setState('saved');
      onSaved?.(r);
      setTimeout(onHide, 600);
    } catch (err) {
      setState('failed');
      setMessage(err.message || 'Not saved. Try again; it will not be recorded twice.');
      if (kind === 'refund' && err.status === 409 && err.data?.credit !== undefined) setForce(true);
    }
  };

  const verifiedNow = verifiedMethods.includes(form.method);
  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down" className="hd">
      <Form onSubmit={submit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h2" className="h5">{kind === 'refund' ? 'Record a refund' : 'Record a payment'}{job?.code ? ` · ${job.code}` : ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ErrorSummary message={message} errors={message ? errors : {}} />
          {kind === 'refund' && credit !== undefined && <p className="small">Credit on this job: <span className="money fw-semibold">{naira(credit)}</span></p>}
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group controlId="pay-amount">
                <Form.Label>Amount (₦)</Form.Label>
                <Form.Control inputMode="decimal" autoComplete="off" value={form.amount} onChange={set('amount')} isInvalid={!!errors.amount} />
                <Form.Control.Feedback type="invalid">{errors.amount}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="pay-method">
                <Form.Label>Method</Form.Label>
                <Form.Select value={form.method} onChange={set('method')}>
                  {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                </Form.Select>
                {kind === 'payment' && (
                  <Form.Text>{verifiedNow ? 'Counts straight away.' : 'Waits for you to verify it (for example, after checking the bank).'}</Form.Text>
                )}
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="pay-ref">
                <Form.Label>Reference</Form.Label>
                <Form.Control value={form.external_ref} onChange={set('external_ref')} maxLength={120} />
                <Form.Text>Bank or POS reference, if any.</Form.Text>
              </Form.Group>
            </Col>
            {kind === 'payment' && (
              <Col xs={12} md={6}>
                <Form.Group controlId="pay-date">
                  <Form.Label>Date received</Form.Label>
                  <Form.Control type="date" max={lagosToday()} value={form.received_on} onChange={set('received_on')} isInvalid={!!errors.received_on} />
                  <Form.Control.Feedback type="invalid">{errors.received_on}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            )}
            <Col xs={12}>
              <Form.Group controlId="pay-note">
                <Form.Label>Note</Form.Label>
                <Form.Control value={form.note} onChange={set('note')} maxLength={255} />
              </Form.Group>
            </Col>
            {force && (
              <Col xs={12}>
                <Form.Group controlId="pay-reason">
                  <Form.Label>Reason for refunding more than the credit</Form.Label>
                  <Form.Control value={form.reason} onChange={set('reason')} isInvalid={!!errors.reason} />
                  <Form.Control.Feedback type="invalid">{errors.reason}</Form.Control.Feedback>
                  <Form.Text>For example: job cancelled, deposit returned.</Form.Text>
                </Form.Group>
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer className="justify-content-between">
          <SaveState state={state} />
          <span className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={onHide} disabled={state === 'saving'}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={state === 'saving' || state === 'saved'}>
              {state === 'saving' ? <><Spinner size="sm" className="me-1" /> Saving</> : kind === 'refund' ? 'Record refund' : 'Record payment'}
            </Button>
          </span>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RecordPaymentModal;
