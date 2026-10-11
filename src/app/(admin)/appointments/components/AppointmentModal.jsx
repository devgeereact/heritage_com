import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import heritApi from '@/helpers/heritApi';
import { APPT_STATUS_LABELS, APPT_TYPE_LABELS, fmtTime, fmtUtc, fmtWhen } from '@/helpers/format';
import { ApptChip } from '@/components/herit/StatusChip';
import SaveState from '@/components/herit/SaveState';
import TimeChooser from './TimeChooser';
import { emptyTime, timeBody } from './time';
import ClashNotice from './ClashNotice';

const SOURCE = { owner: 'Booked by staff', public: 'Requested on the website', portal: 'Requested in the client portal', migration: 'From a fitting date' };
const NEEDS_REASON = { decline: 'Reason for declining', cancel: 'Reason for cancelling' };
const DONE_TEXT = { confirm: 'Confirmed', decline: 'Declined', complete: 'Marked completed', no_show: 'Marked as no-show', cancel: 'Cancelled' };

/**
 * One appointment: details, history and the owner's actions. Requests can be
 * confirmed or declined; confirmed ones completed, marked no-show, cancelled or
 * moved. Moving needs a reason and may need an override reason on a clash.
 */
const AppointmentModal = ({ id, show, onHide, onChanged, isOwner }) => {
  const [a, setA] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(null); // decline | cancel | reschedule
  const [reason, setReason] = useState('');
  const [time, setTime] = useState(emptyTime());
  const [clash, setClash] = useState(null);
  const [override, setOverride] = useState('');
  const [save, setSave] = useState({ state: null, error: '' });

  const load = useCallback(async () => {
    if (!id) return;
    setError('');
    try { setA(await heritApi.appointments.get(id)); } catch (e) { setError(e.message); }
  }, [id]);
  useEffect(() => {
    if (show) { setA(null); setStep(null); setReason(''); setTime(emptyTime()); setClash(null); setOverride(''); setSave({ state: null, error: '' }); load(); }
  }, [show, load]);

  const act = async (action) => {
    if (NEEDS_REASON[action] && !reason.trim()) { setSave({ state: 'failed', error: 'Give a reason' }); return; }
    setSave({ state: 'saving', error: '' });
    try {
      await heritApi.appointments.setStatus(id, action, reason.trim());
      setSave({ state: 'saved', error: '' });
      setStep(null); setReason('');
      await load(); onChanged?.(DONE_TEXT[action]);
    } catch (e) { setSave({ state: 'failed', error: e.message }); }
  };

  const reschedule = async () => {
    const t = timeBody(time);
    if (t.error) { setSave({ state: 'failed', error: t.error }); return; }
    if (!reason.trim()) { setSave({ state: 'failed', error: 'Give a reason for the move' }); return; }
    if (clash && !override.trim()) { setSave({ state: 'failed', error: 'Give a reason to book a time that is not free, or choose another time' }); return; }
    setSave({ state: 'saving', error: '' });
    try {
      await heritApi.appointments.reschedule(id, { ...t, reason: reason.trim(), ...(clash ? { override_reason: override.trim() } : {}) });
      setSave({ state: 'saved', error: '' });
      setStep(null); setReason(''); setClash(null); setOverride('');
      await load(); onChanged?.('Moved');
    } catch (e) {
      if (e.status === 409 && e.data?.can_override) { setClash(e.data); setSave({ state: null, error: '' }); }
      else setSave({ state: 'failed', error: e.message });
    }
  };

  const open = a && ['requested', 'confirmed'].includes(a.status);
  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down" className="hd" scrollable size="lg">
      <Modal.Header closeButton>
        <Modal.Title as="h2" className="h5">{a ? `${APPT_TYPE_LABELS[a.type] || a.type}${a.client_name || a.contact_name ? ` · ${a.client_name || a.contact_name}` : ''}` : 'Appointment'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="warning">{error} <Button size="sm" variant="link" onClick={load}>Retry</Button></Alert>}
        {!a && !error && <div className="text-center py-4"><Spinner role="status" /></div>}
        {a && (
          <>
            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
              <ApptChip status={a.status} />
              <span className="fw-semibold">
                {a.all_day ? fmtWhen(a.starts_at_local, { allDay: true }) : `${fmtWhen(a.starts_at_local)} to ${fmtTime(a.ends_at_local)}`}
              </span>
            </div>
            {a.status === 'requested' && a.hold_expires_at_local && (
              <p className="small text-muted">Held until {fmtWhen(a.hold_expires_at_local)}. After that the time is freed and the request expires.</p>
            )}
            <dl className="hd-dl mb-3" style={{ gridTemplateColumns: 'auto 1fr' }}>
              {(a.customer_id || a.contact_name) && <><dt>Client</dt><dd className="text-start">{a.customer_id ? <Link to={`/clients/${a.customer_id}`}>{a.client_name}</Link> : a.contact_name}</dd></>}
              {a.job_id && <><dt>Job</dt><dd className="text-start"><Link to={`/jobs/${a.job_id}`}>{a.job_code}</Link></dd></>}
              {a.contact_phone && <><dt>Phone</dt><dd className="text-start"><a href={`tel:${a.contact_phone}`}>{a.contact_phone}</a></dd></>}
              {a.contact_email && <><dt>Email</dt><dd className="text-start">{a.contact_email}</dd></>}
              {a.source && <><dt>Source</dt><dd className="text-start fw-normal">{SOURCE[a.source] || a.source}</dd></>}
              {a.client_note && <><dt>Client note</dt><dd className="text-start fw-normal" style={{ whiteSpace: 'pre-wrap' }}>{a.client_note}</dd></>}
              {a.notes_internal && <><dt>Internal note</dt><dd className="text-start fw-normal" style={{ whiteSpace: 'pre-wrap' }}>{a.notes_internal}</dd></>}
              {a.override_reason && <><dt>Booked over a clash</dt><dd className="text-start fw-normal">{a.override_reason}</dd></>}
            </dl>

            {isOwner && open && !step && (
              <div className="d-flex flex-wrap gap-2 mb-3">
                {a.status === 'requested' && <Button variant="primary" onClick={() => act('confirm')}>Confirm</Button>}
                {a.status === 'requested' && <Button variant="outline-secondary" onClick={() => setStep('decline')}>Decline</Button>}
                {a.status === 'confirmed' && <Button variant="primary" onClick={() => act('complete')}>Mark completed</Button>}
                {a.status === 'confirmed' && <Button variant="outline-secondary" onClick={() => act('no_show')}>No-show</Button>}
                <Button variant="outline-secondary" onClick={() => { setStep('reschedule'); setTime(emptyTime()); }}>Move</Button>
                {a.status === 'confirmed' && <Button variant="outline-danger" onClick={() => setStep('cancel')}>Cancel appointment</Button>}
              </div>
            )}

            {step && NEEDS_REASON[step] && (
              <div className="border rounded p-3 mb-3">
                <Form.Group controlId="am-reason" className="mb-2">
                  <Form.Label>{NEEDS_REASON[step]}</Form.Label>
                  <Form.Control value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
                  <Form.Text>Kept in the history.</Form.Text>
                </Form.Group>
                <div className="d-flex gap-2">
                  <Button variant={step === 'cancel' ? 'danger' : 'primary'} onClick={() => act(step)}>{step === 'cancel' ? 'Cancel appointment' : 'Decline request'}</Button>
                  <Button variant="outline-secondary" onClick={() => { setStep(null); setReason(''); }}>Back</Button>
                </div>
              </div>
            )}

            {step === 'reschedule' && (
              <div className="border rounded p-3 mb-3">
                <h3 className="h6">Move to a new time</h3>
                <TimeChooser type={a.type} value={time} idPrefix="am" onChange={(t) => { setTime(t); setClash(null); }} allowAllDay={!!a.all_day || a.type === 'fitting'} />
                <Form.Group controlId="am-mreason" className="mt-3">
                  <Form.Label>Reason for the move</Form.Label>
                  <Form.Control value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
                  <Form.Text>Kept in the history with the old and new times.</Form.Text>
                </Form.Group>
                <ClashNotice clash={clash} reason={override} onReason={setOverride} idPrefix="am" />
                <div className="d-flex gap-2 mt-3">
                  <Button variant="primary" onClick={reschedule}>{clash ? 'Move anyway' : 'Move appointment'}</Button>
                  <Button variant="outline-secondary" onClick={() => { setStep(null); setReason(''); setClash(null); }}>Back</Button>
                </div>
              </div>
            )}
            <SaveState state={save.state} error={save.error} />

            {Array.isArray(a.events) && (
              <>
                <h3 className="h6 mt-3">History</h3>
                {a.events.length === 0 ? <p className="text-muted small">Nothing recorded yet.</p> : (
                  <ol className="list-unstyled mb-0">
                    {a.events.map((e) => (
                      <li key={e.id} className="hd-row">
                        <span className="hd-row-main">
                          <span className="hd-row-title d-block" style={{ whiteSpace: 'normal' }}>
                            {e.from_status !== e.to_status
                              ? `${e.from_status ? `${APPT_STATUS_LABELS[e.from_status] || e.from_status} to ` : ''}${APPT_STATUS_LABELS[e.to_status] || e.to_status}`
                              : 'Moved'}
                            {e.from_starts_at_local && e.to_starts_at_local && e.from_starts_at_local !== e.to_starts_at_local
                              ? `: ${fmtWhen(e.from_starts_at_local)} to ${fmtWhen(e.to_starts_at_local)}` : ''}
                          </span>
                          <span className="hd-row-sub d-block" style={{ whiteSpace: 'normal' }}>
                            {fmtUtc(e.created_at)} · {e.actor_type === 'owner' ? (e.actor_name || 'Staff') : e.actor_type === 'customer' ? 'Client' : 'System'}
                            {e.reason ? ` · ${e.reason}` : ''}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer><Button variant="outline-secondary" onClick={onHide}>Close</Button></Modal.Footer>
    </Modal>
  );
};

export default AppointmentModal;
