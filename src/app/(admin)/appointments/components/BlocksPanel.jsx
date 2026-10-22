import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { addDays, fmtWhen, lagosToday, lagosYmd } from '@/helpers/format';
import LoadError from '@/components/herit/LoadError';
import SaveState from '@/components/herit/SaveState';

const blank = () => ({ whole: true, start: '', end: '', startTime: '09:00', endTime: '17:00', reason: '' });

/** Closed dates and leave. Clients can never request a time inside a block. */
const BlocksPanel = ({ isOwner }) => {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [f, setF] = useState(blank());
  const [save, setSave] = useState({ state: null, error: '' });
  const [warning, setWarning] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try { setItems((await heritApi.appointments.blocks(lagosToday(), addDays(lagosToday(), 365))).items || []); }
    catch (e) { setError(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.start || !f.end) { setSave({ state: 'failed', error: 'Give a start and an end date' }); return; }
    const body = f.whole ? { start: f.start, end: f.end, reason: f.reason } : { start: `${f.start}T${f.startTime}`, end: `${f.end}T${f.endTime}`, reason: f.reason };
    setSave({ state: 'saving', error: '' }); setWarning('');
    try {
      const r = await heritApi.appointments.blockSave(body);
      setSave({ state: 'saved', error: '' });
      setWarning(r.warning || '');
      setF(blank());
      load();
    } catch (err) { setSave({ state: 'failed', error: err.message }); }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this blocked time? Clients could then request times in it.')) return;
    try { await heritApi.appointments.blockDelete(id); load(); }
    catch (err) { setSave({ state: 'failed', error: err.message }); }
  };

  const label = (b) => {
    const s = b.starts_at_local; const e = b.ends_at_local;
    const wholeDays = /T00:00/.test(s) && /T00:00/.test(e);
    if (wholeDays) {
      const last = addDays(lagosYmd(e), -1);
      return lagosYmd(s) === last ? fmtWhen(s, { allDay: true }) : `${fmtWhen(s, { allDay: true }).replace(', all day', '')} to ${fmtWhen(`${last}T12:00:00+01:00`, { allDay: true }).replace(', all day', '')}, all day`;
    }
    return `${fmtWhen(s)} to ${fmtWhen(e)}`;
  };

  return (
    <>
      {isOwner && (
        <Card className="hd-card mb-3">
          <Card.Body>
            <h2 className="h6">Block time</h2>
            <p className="small text-muted">For days off, leave or a market day. Existing appointments inside are not moved; you are told about them.</p>
            <Form onSubmit={submit} noValidate>
              <Form.Check type="switch" id="bl-whole" label="Whole days" checked={f.whole} onChange={set('whole')} className="mb-2" />
              <Row className="g-2">
                <Col xs={6} md={3}><Form.Group controlId="bl-start"><Form.Label>From</Form.Label><Form.Control type="date" value={f.start} onChange={set('start')} /></Form.Group></Col>
                {!f.whole && <Col xs={6} md={3}><Form.Group controlId="bl-st"><Form.Label>From time</Form.Label><Form.Control type="time" value={f.startTime} onChange={set('startTime')} /></Form.Group></Col>}
                <Col xs={6} md={3}><Form.Group controlId="bl-end"><Form.Label>{f.whole ? 'To (inclusive)' : 'To'}</Form.Label><Form.Control type="date" value={f.end} onChange={set('end')} /></Form.Group></Col>
                {!f.whole && <Col xs={6} md={3}><Form.Group controlId="bl-et"><Form.Label>To time</Form.Label><Form.Control type="time" value={f.endTime} onChange={set('endTime')} /></Form.Group></Col>}
                <Col xs={12}><Form.Group controlId="bl-reason"><Form.Label>Reason <span className="text-muted fw-normal">(staff only)</span></Form.Label><Form.Control value={f.reason} maxLength={160} onChange={set('reason')} /></Form.Group></Col>
              </Row>
              <div className="d-flex align-items-center gap-3 mt-3">
                <Button type="submit" variant="outline-secondary">Block this time</Button>
                <SaveState state={save.state} error={save.error} />
              </div>
              {warning && <Alert variant="warning" className="mt-2 mb-0">{warning}</Alert>}
            </Form>
          </Card.Body>
        </Card>
      )}
      {error && <LoadError what="blocked time" error={error} onRetry={load} />}
      {!items && !error && <div className="text-center py-3"><Spinner role="status" /></div>}
      {items && (
        <Card className="hd-card">
          <Card.Header className="py-2"><h2 className="h6 mb-0">Coming up</h2></Card.Header>
          {items.length === 0 ? <Card.Body className="text-muted">No blocked time ahead.</Card.Body> : items.map((b) => (
            <div key={b.id} className="hd-row">
              <span className="hd-row-main">
                <span className="hd-row-title d-block" style={{ whiteSpace: 'normal' }}>{label(b)}</span>
                {b.reason && <span className="hd-row-sub d-block">{b.reason}</span>}
              </span>
              {isOwner && <Button size="sm" variant="outline-danger" onClick={() => remove(b.id)} aria-label={`Remove blocked time ${label(b)}`}>Remove</Button>}
            </div>
          ))}
        </Card>
      )}
    </>
  );
};

export default BlocksPanel;
