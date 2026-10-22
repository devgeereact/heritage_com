import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import heritApi from '@/helpers/heritApi';
import { fmtDate, fmtUtc } from '@/helpers/format';
import SaveState from '@/components/herit/SaveState';
import StatusChip from '@/components/herit/StatusChip';

const LATE = ['in_production', 'fitting', 'quality_check', 'ready', 'handed_over'];

/**
 * The job's frozen measurement snapshot (BR-06) and attaching an approved set.
 * Later changes to the client's measurements never alter the snapshot; once
 * production has started a reason is required to swap it.
 */
const MeasurementsPanel = ({ job, onChanged }) => {
  const snap = job.measurement_snapshot;
  const [sets, setSets] = useState(null);
  const [setId, setSetId] = useState('');
  const [reason, setReason] = useState('');
  const [save, setSave] = useState({ state: null, error: '' });
  const late = LATE.includes(job.job_stage);

  const load = useCallback(async () => {
    try { setSets((await heritApi.measurements.list(job.customer_id)).filter((s) => s.status === 'approved')); }
    catch { setSets([]); }
  }, [job.customer_id]);
  useEffect(() => { load(); }, [load]);

  const attach = async (e) => {
    e.preventDefault();
    setSave({ state: 'saving', error: '' });
    try {
      await heritApi.tailoring.attachMeasurements(job.id, Number(setId), reason);
      setSave({ state: 'saved', error: '' }); setSetId(''); setReason('');
      onChanged?.();
    } catch (err) { setSave({ state: 'failed', error: err.message }); }
  };

  const vals = snap?.vals || snap?.values || {};
  return (
    <>
      <Card className="hd-card mb-3">
        <Card.Body>
          <h2 className="h6">Measurements used for this job</h2>
          {!snap ? (
            <p className="text-muted mb-0">None attached yet.</p>
          ) : (
            <>
              <div className="d-flex gap-2 flex-wrap mb-2">
                {snap.legacy || !job.measurement_snapshot_at
                  ? <StatusChip tone="warn">Imported, unverified</StatusChip>
                  : <StatusChip tone="ok">Frozen copy</StatusChip>}
                {snap.set_id && <span className="small text-muted">Set #{snap.set_id}</span>}
              </div>
              <p className="mb-2">
                {snap.label || snap.template_key || 'Old form'}
                {snap.taken_at ? ` · taken ${fmtDate(snap.taken_at)}` : ''}
                {job.measurement_snapshot_at ? ` · attached ${fmtUtc(job.measurement_snapshot_at)}` : ''}
              </p>
              <p className="fw-semibold mb-2">All values in {snap.unit === 'cm' ? 'centimetres (cm)' : snap.unit === 'in' ? 'inches (in)' : 'an unconfirmed unit'}</p>
              <dl className="hd-dl" style={{ maxWidth: 420 }}>
                {Object.entries(vals).map(([k, v]) => (
                  <Row2 key={k} label={k.replace(/_/g, ' ')} value={`${v}${snap.unit && snap.unit !== 'unknown' ? ` ${snap.unit}` : ''}`} />
                ))}
              </dl>
              {snap.set_id && <Link to={`/print/measurements/${snap.set_id}`} className="small d-inline-block mt-2">Printable measurement sheet</Link>}
            </>
          )}
        </Card.Body>
      </Card>

      <Card className="hd-card">
        <Card.Body>
          <h2 className="h6">{snap ? 'Use a different approved set' : 'Attach an approved set'}</h2>
          {sets === null ? <Spinner size="sm" /> : sets.length === 0 ? (
            <p className="mb-0">No approved measurements for this client yet. <Link to={`/clients/${job.customer_id}/measurements/new`}>Add measurements</Link></p>
          ) : (
            <Form onSubmit={attach}>
              <Form.Group controlId="att-set" className="mb-2">
                <Form.Label>Approved set</Form.Label>
                <Form.Select value={setId} onChange={(e) => setSetId(e.target.value)}>
                  <option value="">Choose…</option>
                  {sets.map((s) => (
                    <option key={s.id} value={s.id}>#{s.id} · {s.template_label} · {s.unit} · taken {fmtDate(s.taken_at)}{s.recheck_due ? ' · recheck fit' : ''}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              {late && (
                <>
                  <Alert variant="warning" className="py-2">Production has started. Say why the measurements are changing.</Alert>
                  <Form.Group controlId="att-reason" className="mb-2">
                    <Form.Label>Reason</Form.Label>
                    <Form.Control value={reason} onChange={(e) => setReason(e.target.value)} />
                  </Form.Group>
                </>
              )}
              <div className="d-flex align-items-center gap-3">
                <Button type="submit" variant="primary" disabled={!setId || (late && reason.trim().length < 5) || save.state === 'saving'}>Attach to job</Button>
                <SaveState state={save.state} error={save.error} />
              </div>
              <p className="small text-muted mt-2 mb-0">The job keeps its own copy. Later changes to the client's measurements will not change it.</p>
            </Form>
          )}
        </Card.Body>
      </Card>
    </>
  );
};

const Row2 = ({ label, value }) => (<><dt className="text-capitalize">{label}</dt><dd>{value}</dd></>);

export default MeasurementsPanel;
