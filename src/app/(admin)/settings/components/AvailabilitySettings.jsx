import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import heritApi from '@/helpers/heritApi';
import { APPT_TYPE_LABELS, WEEKDAYS, WEEKDAY_LABELS } from '@/helpers/format';
import ErrorSummary from '@/components/herit/ErrorSummary';
import LoadError from '@/components/herit/LoadError';
import SaveState from '@/components/herit/SaveState';
import StatusChip from '@/components/herit/StatusChip';

const NUMS = [
  ['buffer_min', 'Gap between appointments', 'minutes', 'Kept free before and after each appointment. 0 to 240.'],
  ['min_notice_hours', 'Minimum notice', 'hours', 'How soon a client can ask for a time. 0 to 720.'],
  ['horizon_days', 'Book up to', 'days ahead', 'How far ahead clients can ask. 1 to 365.'],
  ['request_hold_hours', 'Hold a request for', 'hours', 'A requested time stays reserved this long while you decide. 1 to 336.'],
];

const toForm = (a = {}) => ({
  weekly: Object.fromEntries(WEEKDAYS.map((d) => [d, (a.weekly?.[d] || []).map((w) => [w[0], w[1]])])),
  buffer_min: a.buffer_min ?? '', min_notice_hours: a.min_notice_hours ?? '', horizon_days: a.horizon_days ?? '',
  request_hold_hours: a.request_hold_hours ?? '', step_min: a.step_min ?? '',
  durations: Object.fromEntries(Object.keys(APPT_TYPE_LABELS).map((t) => [t, a.durations?.[t] ?? ''])),
});

/**
 * Working hours per weekday (breaks are the gaps between windows), the gap
 * between appointments, lengths, notice, horizon, request hold and the public
 * request switch. Saved through appointments.php, which validates every field
 * and answers 400 with an error per field.
 */
const AvailabilitySettings = () => {
  const [f, setF] = useState(null);
  const [meta, setMeta] = useState(null);
  const [publicOn, setPublicOn] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [save, setSave] = useState({ state: null, error: '' });

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const r = await heritApi.appointments.availabilityGet();
      setF(toForm(r.availability)); setMeta(r); setPublicOn(!!r.public_booking_enabled);
    } catch (e) { setLoadError(e); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // Arriving from "Set availability" (/settings#availability): bring the section into view once loaded.
  const loaded = !!f;
  useEffect(() => {
    if (loaded && window.location.hash === '#availability') document.getElementById('availability')?.scrollIntoView({ block: 'start' });
  }, [loaded]);

  if (loadError) return <LoadError what="availability" error={loadError} onRetry={load} />;
  if (!f) return <div className="py-4 text-center"><Spinner role="status" /></div>;

  const setDay = (d, wins) => setF((x) => ({ ...x, weekly: { ...x.weekly, [d]: wins } }));
  const setNum = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const copyMonday = () => setF((x) => ({ ...x, weekly: { ...x.weekly, ...Object.fromEntries(['tue', 'wed', 'thu', 'fri'].map((d) => [d, x.weekly.mon.map((w) => [...w])])) } }));

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSave({ state: 'saving', error: '' });
    const num = (v) => (v === '' || v === null ? null : Number(v));
    const availability = {
      weekly: f.weekly,
      buffer_min: num(f.buffer_min), min_notice_hours: num(f.min_notice_hours), horizon_days: num(f.horizon_days),
      request_hold_hours: num(f.request_hold_hours), step_min: num(f.step_min),
      durations: Object.fromEntries(Object.entries(f.durations).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)])),
    };
    try {
      const r = await heritApi.appointments.availabilitySave({ availability, public_booking_enabled: publicOn });
      setF(toForm(r.availability)); setMeta((m) => ({ ...m, ready: r.ready })); setPublicOn(!!r.public_booking_enabled);
      setSave({ state: 'saved', error: '' });
    } catch (err) {
      if (err.status === 400 && err.data?.errors) {
        setErrors(err.data.errors);
        setSave({ state: 'failed', error: 'Please fix the highlighted fields' });
      } else setSave({ state: 'failed', error: err.message });
    }
  };

  const named = Object.fromEntries(Object.entries(errors).map(([k, v]) => {
    const [a, b] = k.split('.');
    const label = a === 'weekly' ? WEEKDAY_LABELS[b] : a === 'durations' ? `${APPT_TYPE_LABELS[b]} length` : (NUMS.find((n) => n[0] === a)?.[1] || 'Time step');
    return [k, `${label}: ${v}`];
  }));
  const ready = meta?.ready || {};

  return (
    <Form onSubmit={submit} noValidate id="availability">
      <Card className="hd-card mb-3">
        <Card.Body>
          <h2 className="h5">Availability</h2>
          <p className="text-muted small">Times are Lagos time. Clients only ever see free times, never what else is booked. Close whole days or take leave under <Link to="/appointments?tab=blocked">Appointments, Blocked time</Link>.</p>
          <ErrorSummary errors={named} />

          <h3 className="h6 mt-3">Working hours</h3>
          <p className="small text-muted">Add one or more windows per day. A break is the gap between two windows, for example 09:00 to 13:00 and 14:00 to 18:00. A day with no windows is closed.</p>
          {WEEKDAYS.map((d) => {
            const wins = f.weekly[d];
            const err = errors[`weekly.${d}`];
            return (
              <fieldset key={d} className="border-top py-2" aria-invalid={!!err}>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <legend className="fs-6 fw-semibold mb-0 me-auto" style={{ width: 'auto', minWidth: '7rem' }}>{WEEKDAY_LABELS[d]}</legend>
                  {wins.length === 0 && <span className="text-muted small">Closed</span>}
                  <Button size="sm" variant="outline-secondary" onClick={() => setDay(d, [...wins, wins.length ? ['14:00', '18:00'] : ['09:00', '13:00']])}>Add hours</Button>
                  {d === 'mon' && wins.length > 0 && <Button size="sm" variant="outline-secondary" onClick={copyMonday}>Copy to Tue to Fri</Button>}
                </div>
                {wins.map((w, i) => (
                  <div key={i} className="d-flex flex-wrap align-items-end gap-2 mt-2">
                    <Form.Group controlId={`av-${d}-${i}-s`}>
                      <Form.Label className="small mb-1">From</Form.Label>
                      <Form.Control type="time" step={900} value={w[0]} isInvalid={!!err} onChange={(e) => setDay(d, wins.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                    </Form.Group>
                    <Form.Group controlId={`av-${d}-${i}-e`}>
                      <Form.Label className="small mb-1">To</Form.Label>
                      <Form.Control type="time" step={900} value={w[1]} isInvalid={!!err} onChange={(e) => setDay(d, wins.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
                    </Form.Group>
                    <Button variant="outline-danger" aria-label={`Remove ${WEEKDAY_LABELS[d]} window ${i + 1}`} onClick={() => setDay(d, wins.filter((_, j) => j !== i))}>Remove</Button>
                  </div>
                ))}
                {err && <div className="text-danger small mt-1">{err}</div>}
              </fieldset>
            );
          })}

          <h3 className="h6 mt-4">Lengths</h3>
          <Row className="g-3">
            {Object.entries(APPT_TYPE_LABELS).map(([t, label]) => (
              <Col xs={12} sm={4} key={t}>
                <Form.Group controlId={`av-dur-${t}`}>
                  <Form.Label>{label}</Form.Label>
                  <Form.Select value={f.durations[t]} isInvalid={!!errors[`durations.${t}`]} onChange={(e) => setF((x) => ({ ...x, durations: { ...x.durations, [t]: e.target.value } }))}>
                    <option value="">Not set</option>
                    {(meta?.durations_allowed || [30, 45, 60]).map((m) => <option key={m} value={m}>{m} minutes</option>)}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors[`durations.${t}`]}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            ))}
          </Row>

          <h3 className="h6 mt-4">Rules</h3>
          <Row className="g-3">
            {NUMS.map(([k, label, unit, help]) => (
              <Col xs={12} sm={6} key={k}>
                <Form.Group controlId={`av-${k}`}>
                  <Form.Label>{label} <span className="text-muted fw-normal">({unit})</span></Form.Label>
                  <Form.Control type="number" inputMode="numeric" min={0} value={f[k]} onChange={setNum(k)} isInvalid={!!errors[k]} />
                  <Form.Control.Feedback type="invalid">{errors[k]}</Form.Control.Feedback>
                  <Form.Text>{help}</Form.Text>
                </Form.Group>
              </Col>
            ))}
            <Col xs={12} sm={6}>
              <Form.Group controlId="av-step">
                <Form.Label>Start times every</Form.Label>
                <Form.Select value={f.step_min} onChange={setNum('step_min')} isInvalid={!!errors.step_min}>
                  <option value="">15 minutes (default)</option>
                  {(meta?.steps_allowed || [15, 30, 60]).map((m) => <option key={m} value={m}>{m} minutes</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.step_min}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <div className="mt-3 d-flex flex-wrap gap-2" aria-label="Which types clients can request">
            {Object.entries(APPT_TYPE_LABELS).map(([t, label]) => (
              <StatusChip key={t} tone={ready[t] ? 'ok' : 'neutral'}>{label}: {ready[t] ? 'clients can request' : 'not ready'}</StatusChip>
            ))}
          </div>
          <p className="small text-muted mt-1 mb-0">A type is ready when there are working hours, a length for it, and every rule above is filled in (0 is allowed for gap and notice).</p>
        </Card.Body>
      </Card>

      <Card className="hd-card mb-3">
        <Card.Body>
          <h2 className="h5">Online appointment requests</h2>
          <Form.Check type="switch" id="av-public" checked={publicOn} onChange={(e) => setPublicOn(e.target.checked)}
            label="Let people request a consultation on the website" />
          <p className="small text-muted mt-2 mb-2">
            When this is on, the website shows a Book appointment page and link. Visitors pick a free consultation time and leave their name and phone or email.
            Each one arrives as a <strong>request</strong> in Appointments and Enquiries; nothing is booked until you confirm it.
            The time is held for the hours set above, then freed if you have not answered. When it is off, the page says online booking is not open yet.
          </p>
          {publicOn && !ready.consultation && (
            <Alert variant="warning" className="mb-0">Consultations are not ready yet (see above), so the website will still say booking is not open.</Alert>
          )}
        </Card.Body>
      </Card>

      <div className="d-flex align-items-center gap-3 mb-4">
        <Button type="submit" variant="primary" disabled={save.state === 'saving'}>Save availability</Button>
        <SaveState state={save.state} error={save.error} />
      </div>
    </Form>
  );
};

export default AvailabilitySettings;
