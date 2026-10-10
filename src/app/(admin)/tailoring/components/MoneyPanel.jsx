import { useState } from 'react';
import { Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import heritApi from '@/helpers/heritApi';
import { newRequestKey } from '@/helpers/requestKey';
import { fmtDate, METHOD_LABELS, naira } from '@/helpers/format';
import RecordPaymentModal from '@/components/herit/RecordPaymentModal';
import SaveState from '@/components/herit/SaveState';
import StatusChip, { PaymentChip } from '@/components/herit/StatusChip';

const KIND = { payment: 'Payment', refund: 'Refund', reversal: 'Reversal', adjustment: 'Adjustment', opening: 'Opening balance' };

/**
 * Job money (owner only): agreed price, verified paid, awaiting verification,
 * balance or credit, and the append-only ledger with Verify, Reverse and
 * receipts. Entries are never edited; a mistake is reversed with a reason.
 */
const MoneyPanel = ({ job, verifiedMethods, onChanged }) => {
  const m = job.money || {};
  const [modal, setModal] = useState(null);       // 'payment' | 'refund'
  const [rev, setRev] = useState(null);           // entry being reversed
  const [revReason, setRevReason] = useState('');
  const [revKey, setRevKey] = useState(newRequestKey);
  const [save, setSave] = useState({ state: null, error: '' });

  const verify = async (e) => {
    setSave({ state: 'saving', error: '' });
    try { await heritApi.ledger.verify(e.id); setSave({ state: 'saved', error: '' }); onChanged?.(); }
    catch (err) { setSave({ state: 'failed', error: err.message }); }
  };
  const reverse = async () => {
    setSave({ state: 'saving', error: '' });
    try { await heritApi.ledger.reverse(rev.id, revReason, revKey); setSave({ state: 'saved', error: '' }); setRev(null); onChanged?.(); }
    catch (err) { setSave({ state: 'failed', error: err.message }); }
  };
  const openReverse = (e) => { setRev(e); setRevReason(''); setRevKey(newRequestKey()); setSave({ state: null, error: '' }); };

  const reversedIds = new Set((job.ledger || []).filter((e) => e.kind === 'reversal').map((e) => e.reverses_id));
  return (
    <>
      <Card className="hd-card mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
            <h2 className="h6 mb-0">Money</h2>
            <PaymentChip state={m.payment_state} />
          </div>
          <dl className="hd-dl" style={{ maxWidth: 420 }}>
            <dt>Agreed price</dt><dd>{Number(m.price) > 0 ? naira(m.price) : 'Not set'}</dd>
            <dt>Paid and verified</dt><dd>{naira(m.paid_verified)}</dd>
            {Number(m.awaiting_verification) !== 0 && <><dt>Waiting for verification</dt><dd>{naira(m.awaiting_verification)}</dd></>}
            {Number(m.refunded) > 0 && <><dt>Refunded</dt><dd>{naira(m.refunded)}</dd></>}
            <dt>Balance</dt><dd>{naira(m.balance)}</dd>
            {Number(m.credit) > 0 && <><dt>Credit or refund due</dt><dd>{naira(m.credit)}</dd></>}
          </dl>
          <div className="d-flex gap-2 flex-wrap mt-3">
            <Button variant="primary" onClick={() => setModal('payment')}>Record payment</Button>
            <Button variant="outline-secondary" onClick={() => setModal('refund')}>Record refund</Button>
            <Link className="btn btn-outline-secondary" to={`/print/invoice/${job.id}`}>Invoice</Link>
          </div>
        </Card.Body>
      </Card>

      <Card className="hd-card">
        <Card.Header className="py-2"><h2 className="h6 mb-0">Ledger</h2></Card.Header>
        {(job.ledger || []).length === 0 ? <Card.Body className="text-muted">No payments recorded yet.</Card.Body> : (job.ledger || []).map((e) => {
          const reversed = reversedIds.has(e.id) || e.reversed_by_id;
          return (
            <div key={e.id} className="hd-row flex-wrap">
              <span className="hd-row-main">
                <span className="hd-row-title d-block">
                  {KIND[e.kind] || e.kind} <span className="money">{naira(e.amount)}</span>
                  <span className="text-muted small fw-normal"> · {e.receipt_no}</span>
                </span>
                <span className="hd-row-sub d-block">
                  {METHOD_LABELS[e.method] || e.method}{e.external_ref ? ` · ${e.external_ref}` : ''} · {fmtDate(e.received_on)}{e.note ? ` · ${e.note}` : ''}
                </span>
              </span>
              <span className="d-flex gap-2 flex-wrap align-items-center">
                {reversed ? <StatusChip tone="neutral" icon="solar:undo-left-bold">Reversed</StatusChip>
                  : e.kind === 'reversal' ? null
                  : e.verified ? <StatusChip tone="ok">Verified</StatusChip> : <StatusChip tone="warn">Not verified</StatusChip>}
                {!e.verified && !reversed && e.kind !== 'reversal' && <Button size="sm" variant="outline-secondary" onClick={() => verify(e)}>Verify</Button>}
                {!reversed && e.kind !== 'reversal' && <Button size="sm" variant="outline-secondary" onClick={() => openReverse(e)}>Reverse</Button>}
                {e.kind !== 'reversal' && <Link className="btn btn-sm btn-outline-secondary" to={`/print/receipt/${job.id}?ref=${e.id}`}>Receipt</Link>}
              </span>
            </div>
          );
        })}
        <Card.Footer className="bg-transparent"><SaveState state={save.state} error={save.error} /></Card.Footer>
      </Card>

      <RecordPaymentModal show={!!modal} kind={modal || 'payment'} onHide={() => setModal(null)} job={job}
        verifiedMethods={verifiedMethods} credit={m.credit} onSaved={() => onChanged?.()} />

      <Modal show={!!rev} onHide={() => setRev(null)} centered className="hd">
        {rev && (
          <Form onSubmit={(ev) => { ev.preventDefault(); reverse(); }}>
            <Modal.Header closeButton><Modal.Title as="h2" className="h5">Reverse {rev.receipt_no}</Modal.Title></Modal.Header>
            <Modal.Body>
              <p>{KIND[rev.kind]} of <span className="money fw-semibold">{naira(rev.amount)}</span> on {fmtDate(rev.received_on)}. A reversal entry is added; nothing is deleted.</p>
              <Form.Group controlId="rev-reason">
                <Form.Label>Reason</Form.Label>
                <Form.Control value={revReason} onChange={(ev) => setRevReason(ev.target.value)} maxLength={200} />
                <Form.Text>For example: recorded twice, wrong job.</Form.Text>
              </Form.Group>
              <SaveState state={save.state} error={save.error} />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={() => setRev(null)}>Cancel</Button>
              <Button type="submit" variant="outline-danger" disabled={revReason.trim().length < 3 || save.state === 'saving'}>
                {save.state === 'saving' ? <Spinner size="sm" /> : 'Reverse entry'}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>
    </>
  );
};

export default MoneyPanel;
