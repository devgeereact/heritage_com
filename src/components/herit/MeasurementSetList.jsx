import { useState } from 'react';
import { Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import heritApi from '@/helpers/heritApi';
import { fmtDate, fmtUtc } from '@/helpers/format';
import StatusChip, { SetChip } from './StatusChip';

/**
 * A client's measurement sets, newest first. Owners approve or reject pending
 * and imported sets (an imported set needs its unit confirmed first). Approved
 * sets older than the recheck age carry a "recheck fit" badge.
 */
const MeasurementSetList = ({ sets = [], isOwner, recheckDays = 180, onChanged }) => {
  const [open, setOpen] = useState(null);       // full set being viewed
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [unit, setUnit] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState('view');      // view | approve | reject

  const view = async (s, m = 'view') => {
    setErr(''); setUnit(''); setReason(''); setMode(m);
    try { setOpen(await heritApi.measurements.get(s.id)); } catch (e) { setErr(e.message); setOpen({ ...s, vals: {}, fields: [] }); }
  };

  const approve = async () => {
    setBusy(true); setErr('');
    try { await heritApi.measurements.approve(open.id, open.needs_unit ? unit : undefined); setOpen(null); onChanged?.(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const reject = async () => {
    setBusy(true); setErr('');
    try { await heritApi.measurements.reject(open.id, reason); setOpen(null); onChanged?.(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (!sets.length) return <p className="text-muted mb-0">No measurements yet.</p>;

  return (
    <>
      <Card className="hd-card">
        {sets.map((s) => (
          <div key={s.id} className="hd-row flex-wrap">
            <button type="button" className="btn btn-link p-0 flex-fill text-start text-decoration-none text-reset" style={{ minHeight: 44 }} onClick={() => view(s)}>
              <span className="hd-row-main">
                <span className="hd-row-title d-block">{s.template_label || s.template_key} · {s.unit === 'unknown' ? 'unit not confirmed' : s.unit}</span>
                <span className="hd-row-sub d-block">
                  Taken {fmtDate(s.taken_at) || 'date unknown'}{s.source === 'customer' ? ' · sent by the client' : s.source === 'imported' ? ' · imported from the old form' : ''}
                </span>
              </span>
            </button>
            <span className="d-flex gap-2 flex-wrap align-items-center">
              <SetChip status={s.status} />
              {s.recheck_due && <StatusChip tone="warn" icon="solar:refresh-bold">Recheck fit</StatusChip>}
              {isOwner && ['pending', 'imported_unverified'].includes(s.status) && (
                <>
                  <Button size="sm" variant="primary" onClick={() => view(s, 'approve')}>Approve</Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => view(s, 'reject')}>Reject</Button>
                </>
              )}
            </span>
          </div>
        ))}
      </Card>
      <p className="small text-muted mt-2 mb-0">Sets older than {recheckDays} days show “Recheck fit” before repeat work.</p>

      <Modal show={!!open} onHide={() => setOpen(null)} centered fullscreen="sm-down" className="hd" scrollable>
        {open && (
          <>
            <Modal.Header closeButton>
              <Modal.Title as="h2" className="h5">{open.template_label || open.template_key} <span className="text-muted small">#{open.id}</span></Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="d-flex gap-2 flex-wrap mb-2">
                <SetChip status={open.status} />
                {open.recheck_due && <StatusChip tone="warn" icon="solar:refresh-bold">Recheck fit</StatusChip>}
              </div>
              <p className="mb-2">
                Taken {fmtDate(open.taken_at) || 'date unknown'}
                {open.approved_at ? ` · approved ${fmtUtc(open.approved_at, { time: false })}` : ''}
              </p>
              <p className="fw-semibold mb-2">
                {open.unit === 'unknown' ? 'Unit not confirmed (imported from the old form)' : `All values in ${open.unit === 'cm' ? 'centimetres (cm)' : 'inches (in)'}`}
              </p>
              <dl className="hd-dl mb-3">
                {(open.fields?.length ? open.fields : Object.keys(open.vals || {}).map((k) => ({ key: k, label: k.replace(/_/g, ' ') })))
                  .filter((f) => !f.hidden || open.vals?.[f.key] !== undefined)
                  .map((f) => (
                    <FragmentRow key={f.key} label={f.label} value={open.vals?.[f.key]} unit={open.unit === 'unknown' ? '' : open.unit} />
                  ))}
                {open.fit_preference && <><dt>Fit</dt><dd className="text-capitalize">{open.fit_preference}</dd></>}
              </dl>
              {open.notes && <p className="small">Notes: {open.notes}</p>}
              {open.reject_reason && <p className="small">Rejected: {open.reject_reason}</p>}
              {open.jobs?.length > 0 && (
                <p className="small mb-2">Used on: {open.jobs.map((j) => <Link key={j.id} to={`/jobs/${j.id}`} className="me-2">{j.code}</Link>)}</p>
              )}
              <Link to={`/print/measurements/${open.id}`} className="small">Printable measurement sheet</Link>

              {mode === 'approve' && (
                <div className="mt-3 border-top pt-3">
                  {open.needs_unit && (
                    <Form.Group controlId="ms-approve-unit" className="mb-2">
                      <Form.Label>Which unit were these taken in?</Form.Label>
                      <Form.Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                        <option value="">Choose…</option>
                        <option value="in">Inches (in)</option>
                        <option value="cm">Centimetres (cm)</option>
                      </Form.Select>
                      <Form.Text>The old form did not record a unit. Check the numbers before you confirm.</Form.Text>
                    </Form.Group>
                  )}
                  <p className="small mb-0">Approving replaces the client's current approved {open.template_label || ''} set. Jobs keep the measurements they already have.</p>
                </div>
              )}
              {mode === 'reject' && (
                <Form.Group controlId="ms-reject-reason" className="mt-3 border-top pt-3">
                  <Form.Label>Reason</Form.Label>
                  <Form.Control value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} />
                  <Form.Text>For example: chest looks wrong, measure again.</Form.Text>
                </Form.Group>
              )}
              {err && <div className="text-danger mt-2" role="alert">{err}</div>}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={() => setOpen(null)} disabled={busy}>Close</Button>
              {mode === 'approve' && (
                <Button variant="primary" onClick={approve} disabled={busy || (open.needs_unit && !unit)}>
                  {busy ? <Spinner size="sm" /> : 'Approve'}
                </Button>
              )}
              {mode === 'reject' && (
                <Button variant="outline-danger" onClick={reject} disabled={busy || reason.trim().length < 3}>
                  {busy ? <Spinner size="sm" /> : 'Reject'}
                </Button>
              )}
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  );
};

const FragmentRow = ({ label, value, unit }) => (
  <>
    <dt className="text-capitalize">{label}</dt>
    <dd>{value !== undefined && value !== null && value !== '' ? `${value}${unit ? ` ${unit}` : ''}` : <span className="text-muted fw-normal">not taken</span>}</dd>
  </>
);

export default MeasurementSetList;
