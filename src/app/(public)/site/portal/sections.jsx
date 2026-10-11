import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import heritApi from '@/helpers/heritApi';
import newRequestKey from '@/helpers/requestKey';
import { APPT_STATUS_LABELS, APPT_TYPE_LABELS, CHANGE_KIND_LABELS, CHANGE_STATUS_LABELS, fmtDate, fmtTime, fmtWhen, naira } from '@/helpers/format';
import PublicSlots from './PublicSlots';

// Sections of one job in the client portal. Each takes `guard`, which runs an
// API call and sends the client back to the access screen on a 401.

const Saved = ({ state }) => (
  <p role="status" aria-live="polite" className={state?.error ? 'hp-error' : 'hp-ok'} style={{ margin: 0, minHeight: '1.25rem' }}>
    {state?.saving ? 'Sending…' : state?.error || state?.ok || ''}
  </p>
);

/* ---- Messages ------------------------------------------------------------- */
export const MessagesSection = ({ jobRef, guard }) => {
  const [msgs, setMsgs] = useState(null);
  const [body, setBody] = useState('');
  const [key, setKey] = useState(newRequestKey());
  const [st, setSt] = useState({});
  const load = useCallback(() => guard(() => heritApi.client.messages(jobRef)).then((r) => setMsgs(r.messages || [])).catch(() => setMsgs([])), [guard, jobRef]);
  useEffect(() => { load(); }, [load]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) { setSt({ error: 'Write your message first' }); return; }
    setSt({ saving: true });
    try {
      const r = await guard(() => heritApi.client.message(jobRef, body.trim(), key));
      setMsgs(r.messages || []); setBody(''); setKey(newRequestKey()); setSt({ ok: 'Message sent' });
    } catch (err) { setSt({ error: err.message || 'Not sent. Please try again.' }); }
  };

  return (
    <div>
      {msgs === null && <p className="hp-help" role="status">Loading messages…</p>}
      {msgs && msgs.length === 0 && <p className="hp-help">No messages yet. Ask us anything about this order.</p>}
      {(msgs || []).map((m) => (
        <article key={m.id} className={`hp-msg hp-msg--${m.from}`}>
          <div className="hp-muted" style={{ fontSize: '.875rem' }}>
            <strong>{m.from === 'you' ? 'You' : m.from === 'herit' ? 'Herit' : 'Update'}</strong> · {fmtWhen(m.at)}
          </div>
          <div className="hp-msg-body">{m.body}</div>
        </article>
      ))}
      <form onSubmit={send} noValidate className="hp-stack" style={{ marginTop: '1rem' }}>
        <div className="hp-field">
          <label htmlFor="pm-body">Your message</label>
          <textarea id="pm-body" className="hp-input" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div><button type="submit" className="hp-btn hp-btn--primary" disabled={st.saving}>Send message</button></div>
        <Saved state={st} />
      </form>
    </div>
  );
};

/* ---- Change requests ------------------------------------------------------ */
export const ChangeSection = ({ job, guard, onChanged }) => {
  const [kind, setKind] = useState('garment');
  const [details, setDetails] = useState('');
  const [address, setAddress] = useState('');
  const [key, setKey] = useState(newRequestKey());
  const [errors, setErrors] = useState({});
  const [st, setSt] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!details.trim()) errs.details = 'Describe the change';
    if (kind === 'address' && !address.trim()) errs.address = 'Give the new address';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSt({ saving: true });
    try {
      await guard(() => heritApi.client.changeRequest({ ref: job.ref, kind, details: details.trim(), ...(kind === 'address' ? { address: address.trim() } : {}), request_key: key }));
      setDetails(''); setAddress(''); setKey(newRequestKey());
      setSt({ ok: 'Request sent. We will reply here and tell you if it changes the price or date.' });
      onChanged();
    } catch (err) { setSt({ error: err.message || 'Not sent. Please try again.' }); }
  };

  return (
    <div className="hp-stack">
      {(job.change_requests || []).length > 0 && (
        <div>
          {job.change_requests.map((c) => (
            <div key={c.id} className="hp-row" style={{ display: 'block' }}>
              <strong>{CHANGE_KIND_LABELS[c.kind] || c.kind}</strong> · <span>{CHANGE_STATUS_LABELS[c.status] || c.status}</span>
              {c.details && <p style={{ margin: '.25rem 0', whiteSpace: 'pre-wrap' }}>{c.details}</p>}
              {c.requested_start && <p className="hp-help">Asked for {fmtWhen(c.requested_start)}</p>}
              {c.owner_response && <p style={{ margin: '.25rem 0' }}>Herit: {c.owner_response}</p>}
              {c.price_effect !== null && c.price_effect !== undefined && Number(c.price_effect) !== 0 && <p className="hp-help">Price change: {naira(c.price_effect)}</p>}
              {c.date_effect && <p className="hp-help">New promised date: {fmtDate(c.date_effect)}</p>}
            </div>
          ))}
        </div>
      )}
      {job.can?.request_change ? (
        <form onSubmit={submit} noValidate className="hp-stack">
          <p className="hp-help">Changes after cutting has started may change the price or the date. We will tell you before going ahead.</p>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="hp-label">What would you like to change?</legend>
            {[['garment', 'The garment (style, fabric, fit)'], ['address', 'Delivery address'], ['other', 'Something else']].map(([k, l]) => (
              <label key={k} className="hp-check"><input type="radio" name="cr-kind" checked={kind === k} onChange={() => setKind(k)} /><span>{l}</span></label>
            ))}
          </fieldset>
          <div className="hp-field">
            <label htmlFor="cr-details">Details</label>
            <textarea id="cr-details" className="hp-input" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} aria-invalid={!!errors.details} aria-describedby="cr-details-err" />
            {errors.details && <p id="cr-details-err" className="hp-error">{errors.details}</p>}
          </div>
          {kind === 'address' && (
            <div className="hp-field">
              <label htmlFor="cr-address">New delivery address</label>
              <textarea id="cr-address" className="hp-input" maxLength={500} autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} aria-invalid={!!errors.address} aria-describedby="cr-address-err" />
              {errors.address && <p id="cr-address-err" className="hp-error">{errors.address}</p>}
            </div>
          )}
          <div><button type="submit" className="hp-btn hp-btn--primary" disabled={st.saving}>Send change request</button></div>
          <Saved state={st} />
        </form>
      ) : <p className="hp-help">This order is closed, so changes are no longer possible. Send us a message instead.</p>}
    </div>
  );
};

/* ---- Appointments --------------------------------------------------------- */
export const AppointmentsSection = ({ job, guard, onChanged }) => {
  const [mode, setMode] = useState(null); // {kind:'new'} | {kind:'move', appt}
  const [type, setType] = useState('fitting');
  const [slot, setSlot] = useState(null);
  const [note, setNote] = useState('');
  const [key, setKey] = useState(newRequestKey());
  const [st, setSt] = useState({});
  const slotType = mode?.kind === 'move' ? mode.appt.type : type;
  const load = useCallback((from, days) => guard(() => heritApi.client.slots(slotType, from, days)), [guard, slotType]);
  const upcoming = (job.appointments || []).filter((a) => ['requested', 'confirmed'].includes(a.status));

  const submit = async () => {
    if (!slot) { setSt({ error: 'Choose a time' }); return; }
    setSt({ saving: true });
    try {
      if (mode.kind === 'move') {
        await guard(() => heritApi.client.rescheduleRequest({ ref: job.ref, appointment_id: mode.appt.id, start: slot.start, reason: note.trim() || undefined, request_key: key }));
        setSt({ ok: 'Request sent. Your current time stands until we confirm the new one.' });
      } else {
        const r = await guard(() => heritApi.client.appointmentRequest({ ref: job.ref, type, start: slot.start, note: note.trim(), request_key: key }));
        setSt({ ok: r.message || 'Request received. We will confirm, or suggest another time.' });
      }
      setMode(null); setSlot(null); setNote(''); setKey(newRequestKey());
      onChanged();
    } catch (err) {
      if (err.status === 409 || err.status === 422) setSlot(null);
      setSt({ error: err.message || 'Not sent. Please try again.' });
    }
  };

  return (
    <div className="hp-stack">
      {(job.appointments || []).length === 0 && <p className="hp-help">No appointments yet.</p>}
      {(job.appointments || []).map((a) => (
        <div key={a.id} className="hp-row">
          <span>
            <strong style={{ display: 'block' }}>{APPT_TYPE_LABELS[a.type] || a.type}</strong>
            <span className="hp-muted">{a.all_day ? fmtWhen(a.starts_at, { allDay: true }) : `${fmtWhen(a.starts_at)} to ${fmtTime(a.ends_at)}`} · {a.status === 'requested' ? 'Requested, not yet confirmed' : APPT_STATUS_LABELS[a.status]}</span>
          </span>
          {upcoming.includes(a) && job.can?.request_appointment && !mode && (
            <button type="button" className="hp-link" onClick={() => { setMode({ kind: 'move', appt: a }); setSlot(null); setSt({}); }}>Ask to move</button>
          )}
        </div>
      ))}
      {job.can?.request_appointment && !mode && (
        <div><button type="button" className="hp-btn" onClick={() => { setMode({ kind: 'new' }); setSlot(null); setSt({}); }}>Ask for an appointment</button></div>
      )}
      {mode && (
        <div className="hp-card hp-stack" style={{ background: '#fff' }}>
          <h3>{mode.kind === 'move' ? `Move your ${(APPT_TYPE_LABELS[mode.appt.type] || '').toLowerCase()}` : 'Ask for an appointment'}</h3>
          {mode.kind === 'new' && (
            <div className="hp-field">
              <label htmlFor="ap-type">What for?</label>
              <select id="ap-type" className="hp-input" value={type} onChange={(e) => { setType(e.target.value); setSlot(null); }}>
                <option value="fitting">Fitting</option>
                <option value="collection">Collection</option>
                <option value="consultation">Consultation</option>
              </select>
            </div>
          )}
          <PublicSlots load={load} value={slot?.start} onPick={setSlot} days={7} maxDays={60} idPrefix="ap" />
          {slot && <p role="status">Chosen: <strong>{fmtWhen(slot.start)}</strong>, Lagos time.</p>}
          <div className="hp-field">
            <label htmlFor="ap-note">{mode.kind === 'move' ? 'Why are you moving it?' : 'Note'} <span className="hp-muted">(optional)</span></label>
            <textarea id="ap-note" className="hp-input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p className="hp-help">This is a request. We confirm it, or suggest another time.</p>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="hp-btn hp-btn--primary" disabled={st.saving || !slot} onClick={submit}>Send request</button>
            <button type="button" className="hp-btn" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      )}
      <Saved state={st} />
    </div>
  );
};

/* ---- Measurements ---------------------------------------------------------- */
export const MeasurementsSection = ({ job, showOwn, guard }) => {
  const [sets, setSets] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [tkey, setTkey] = useState('');
  const [unit, setUnit] = useState('in');
  const [vals, setVals] = useState({});
  const [note, setNote] = useState('');
  const [key, setKey] = useState(newRequestKey());
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState({});

  useEffect(() => {
    if (showOwn) guard(() => heritApi.client.measurements()).then((r) => setSets(r.sets || [])).catch(() => setSets([]));
  }, [showOwn, guard]);
  useEffect(() => {
    if (!open || templates.length) return;
    guard(() => heritApi.client.measurementTemplates()).then((r) => { setTemplates(r.templates || []); setTkey(r.templates?.[0]?.key || ''); }).catch(() => {});
  }, [open, templates.length, guard]);
  const tpl = useMemo(() => templates.find((t) => t.key === tkey), [templates, tkey]);

  const submit = async (e) => {
    e.preventDefault();
    const clean = Object.fromEntries(Object.entries(vals).filter(([, v]) => String(v).trim() !== ''));
    if (!Object.keys(clean).length) { setSt({ error: 'Enter at least one measurement' }); return; }
    setSt({ saving: true });
    try {
      const r = await guard(() => heritApi.client.proposeMeasurements({ ref: job.ref, template_key: tkey, unit, vals: clean, note: note.trim(), request_key: key }));
      setSt({ ok: r.message || 'Thank you. We will check these before using them.' });
      setVals({}); setNote(''); setKey(newRequestKey()); setOpen(false);
    } catch (err) { setSt({ error: err.message || 'Not sent. Please try again.' }); }
  };

  return (
    <div className="hp-stack">
      {showOwn && sets === null && <p className="hp-help" role="status">Loading…</p>}
      {showOwn && sets && sets.length === 0 && <p className="hp-help">No measurements on record yet.</p>}
      {showOwn && (sets || []).map((s, i) => (
        <div key={i} className="hp-card" style={{ padding: '1rem' }}>
          <strong>{s.template}</strong> <span className="hp-muted">· {s.status === 'pending' ? 'Waiting for Herit to check' : 'In use'} · {s.unit === 'cm' ? 'centimetres' : 'inches'}{s.taken_at ? ` · ${fmtDate(s.taken_at)}` : ''}</span>
          <dl className="hp-dl" style={{ marginTop: '.5rem' }}>
            {Object.entries(s.values || {}).map(([k, v]) => <Fragment key={k}><dt>{k.replace(/_/g, ' ')}</dt><dd>{v}</dd></Fragment>)}
          </dl>
        </div>
      ))}
      {!open && <div><button type="button" className="hp-btn" onClick={() => { setOpen(true); setSt({}); }}>Send new measurements for review</button></div>}
      {open && (
        <form onSubmit={submit} noValidate className="hp-card hp-stack" style={{ background: '#fff' }}>
          <h3>New measurements, for review</h3>
          <p className="hp-notice">These go to Herit to check. They are not used for your order until we have checked them and told you.</p>
          {templates.length === 0 && <p className="hp-help" role="status">Loading…</p>}
          {templates.length > 0 && (
            <>
              <div className="hp-field">
                <label htmlFor="pm-tpl">Garment</label>
                <select id="pm-tpl" className="hp-input" value={tkey} onChange={(e) => { setTkey(e.target.value); setVals({}); }}>
                  {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="hp-label">Unit</legend>
                <label className="hp-check"><input type="radio" name="pm-unit" checked={unit === 'in'} onChange={() => setUnit('in')} /><span>Inches</span></label>
                <label className="hp-check"><input type="radio" name="pm-unit" checked={unit === 'cm'} onChange={() => setUnit('cm')} /><span>Centimetres</span></label>
              </fieldset>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '.75rem' }}>
                {(tpl?.fields || []).map((fd) => (
                  <div key={fd.key} className="hp-field">
                    <label htmlFor={`pm-${fd.key}`}>{fd.label} <span className="hp-muted">({unit})</span></label>
                    <input id={`pm-${fd.key}`} className="hp-input" inputMode="decimal" value={vals[fd.key] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [fd.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="hp-field">
                <label htmlFor="pm-note">Note <span className="hp-muted">(optional)</span></label>
                <textarea id="pm-note" className="hp-input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <button type="submit" className="hp-btn hp-btn--primary" disabled={st.saving}>Send for review</button>
                <button type="button" className="hp-btn" onClick={() => setOpen(false)}>Cancel</button>
              </div>
            </>
          )}
        </form>
      )}
      <Saved state={st} />
    </div>
  );
};

/* ---- Quote ---------------------------------------------------------------- */
export const QuoteSection = ({ job, guard, onChanged }) => {
  const q = job.quote;
  const [confirm, setConfirm] = useState(false);
  const [st, setSt] = useState({});
  if (!q) return <p className="hp-help">No quote to show yet.</p>;
  const accept = async () => {
    if (!confirm) { setSt({ error: 'Tick the box to confirm' }); return; }
    setSt({ saving: true });
    try {
      await guard(() => heritApi.client.quoteAccept({ ref: job.ref, quote_id: q.id, content_hash: q.content_hash, confirm: true }));
      setSt({ ok: 'Thank you. Quote accepted.' }); onChanged();
    } catch (err) { setSt({ error: err.message || 'Not accepted. Please try again or contact us.' }); }
  };
  return (
    <div className="hp-stack">
      <p className="hp-muted" style={{ margin: 0 }}>Quote {q.number} · {q.status === 'accepted' ? `accepted ${fmtWhen(q.accepted_at).split(',')[0]}` : q.valid_until ? `valid until ${fmtDate(q.valid_until)}` : 'sent'}</p>
      <div>
        {(q.items || []).map((it, i) => (
          <div key={i} className="hp-row">
            <span>{it.qty} × {it.description}</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{naira(it.line_total)}</strong>
          </div>
        ))}
      </div>
      <dl className="hp-dl">
        {Number(q.delivery_charge) > 0 && <><dt>Delivery</dt><dd>{naira(q.delivery_charge)}</dd></>}
        {Number(q.discount) > 0 && <><dt>Discount</dt><dd>−{naira(q.discount)}</dd></>}
        <dt>Total</dt><dd>{naira(q.total)}</dd>
        {q.deposit_required && Number(q.deposit_required) > 0 && <><dt>Deposit</dt><dd>{naira(q.deposit_required)}</dd></>}
        {q.promised_date && <><dt>Promised for</dt><dd>{fmtDate(q.promised_date)}</dd></>}
      </dl>
      {q.terms && <p className="hp-help" style={{ whiteSpace: 'pre-wrap' }}>{q.terms}</p>}
      {job.can?.accept_quote && (
        <div className="hp-stack">
          <label className="hp-check"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /><span>I accept this quote, including the price and terms shown above.</span></label>
          <div><button type="button" className="hp-btn hp-btn--primary" disabled={st.saving} onClick={accept}>Accept quote</button></div>
        </div>
      )}
      <Saved state={st} />
    </div>
  );
};

/* ---- Feedback ------------------------------------------------------------- */
export const FeedbackSection = ({ job, guard, onChanged }) => {
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [contactOk, setContactOk] = useState(false);
  const [publish, setPublish] = useState('no');
  const [photo, setPhoto] = useState(false);
  const [key] = useState(newRequestKey());
  const [errors, setErrors] = useState({});
  const [st, setSt] = useState({});
  const wording = job.feedback_wording || {};

  if (job.feedback) {
    return <p className="hp-notice hp-notice--ok">Thank you for your feedback{job.feedback.rating ? ` (${job.feedback.rating} of 5)` : ''}.</p>;
  }
  if (!job.can?.give_feedback) return <p className="hp-help">You can leave feedback once your order has been collected or delivered.</p>;

  const submit = async (e) => {
    e.preventDefault();
    if (!rating && !comment.trim()) { setErrors({ comment: 'Give a rating or a comment' }); return; }
    setErrors({}); setSt({ saving: true });
    try {
      await guard(() => heritApi.client.feedback({ ref: job.ref, rating: rating ? Number(rating) : null, comment: comment.trim(), contact_ok: contactOk, publish_consent: publish, photo_consent: photo, request_key: key }));
      setSt({ ok: 'Thank you for your feedback.' }); onChanged();
    } catch (err) {
      if (err.data?.errors) setErrors(err.data.errors);
      setSt({ error: err.message || 'Not sent. Please try again.' });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="hp-stack">
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="hp-label">How did we do? <span className="hp-muted">(optional)</span></legend>
        <div className="hp-slots">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="hp-check" style={{ minWidth: '3.5rem' }}>
              <input type="radio" name="fb-rating" value={n} checked={rating === String(n)} onChange={() => setRating(String(n))} />
              <span>{n}{n === 1 ? ' (poor)' : n === 5 ? ' (great)' : ''}</span>
            </label>
          ))}
        </div>
        {errors.rating && <p className="hp-error">{errors.rating}</p>}
      </fieldset>
      <div className="hp-field">
        <label htmlFor="fb-comment">Comment <span className="hp-muted">(optional)</span></label>
        <textarea id="fb-comment" className="hp-input" maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} aria-invalid={!!errors.comment} aria-describedby="fb-comment-err" />
        {errors.comment && <p id="fb-comment-err" className="hp-error">{errors.comment}</p>}
      </div>
      <label className="hp-check"><input type="checkbox" checked={contactOk} onChange={(e) => setContactOk(e.target.checked)} /><span>You may contact me about this feedback.</span></label>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="hp-label">Sharing your comment</legend>
        {wording.publish && <p className="hp-help">{wording.publish}</p>}
        {[['no', 'No, keep it private'], ['anonymous', 'Yes, without my name'], ['first_name', 'Yes, with my first name']].map(([v, l]) => (
          <label key={v} className="hp-check"><input type="radio" name="fb-publish" checked={publish === v} onChange={() => setPublish(v)} /><span>{l}</span></label>
        ))}
      </fieldset>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="hp-label">Photos of your garment</legend>
        {wording.photo && <p className="hp-help">{wording.photo}</p>}
        <label className="hp-check"><input type="checkbox" checked={photo} onChange={(e) => setPhoto(e.target.checked)} /><span>Yes, Herit may use photos of my finished garment.</span></label>
      </fieldset>
      <p className="hp-help">Each choice is separate. Saying no to sharing does not affect your order.</p>
      <div><button type="submit" className="hp-btn hp-btn--primary" disabled={st.saving}>Send feedback</button></div>
      <Saved state={st} />
    </form>
  );
};
