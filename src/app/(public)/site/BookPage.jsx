import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import heritApi from '@/helpers/heritApi'
import newRequestKey from '@/helpers/requestKey'
import { APPT_TYPE_LABELS, fmtTime, fmtWhen } from '@/helpers/format'
import SiteLayout from './SiteLayout'
import { useBookingConfig } from './bookingConfig'
import PublicSlots from './portal/PublicSlots'
import './portal/portal.css'

const STEPS = ['Type', 'Time', 'Your details', 'Sent']

/**
 * Public appointment requests (/book). Shown only while the owner has switched
 * online requests on and set hours; otherwise a plain "not open yet" message.
 * What a visitor sends is a request: Herit confirms it, or suggests another time.
 */
const BookPage = () => {
  const cfg = useBookingConfig()
  const types = cfg?.types || []
  const [step, setStep] = useState(0)
  const [type, setType] = useState('')
  const [slot, setSlot] = useState(null)
  const [f, setF] = useState({ name: '', phone: '', email: '', note: '', hp_url: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const key = useMemo(() => newRequestKey(), [])
  const chosenType = type || types[0]?.type || 'consultation'
  const duration = types.find((t) => t.type === chosenType)?.duration_min

  const load = useCallback((from, days) => heritApi.booking.slots(chosenType, from, days), [chosenType])
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!f.name.trim()) errs.name = 'Enter your name'
    if (!f.phone.trim() && !f.email.trim()) errs.phone = 'Give a phone number or an email so we can confirm'
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) errs.email = 'That email address looks wrong'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const r = await heritApi.booking.request({
        type: chosenType,
        start: slot.start,
        name: f.name.trim(),
        phone: f.phone.trim(),
        email: f.email.trim(),
        note: f.note.trim(),
        hp_url: f.hp_url,
        request_key: key,
      })
      setDone(r.message || 'Request received.')
      setStep(3)
    } catch (err) {
      if (err.status === 409 || err.status === 422) {
        setErrors({ form: `${err.message} Please choose another time.` })
        setSlot(null)
        setStep(1)
      } else if (err.status === 503) setErrors({ form: 'Online requests have just closed. Please contact us instead.' })
      else if (err.status === 429) setErrors({ form: 'Too many requests from this connection. Please try again later or contact us.' })
      else setErrors({ form: err.message || 'We could not send your request. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <SiteLayout title="Book an appointment">
      <section className="hc-pagehead">
        <div className="hc-container">
          <div className="hc-crumb">
            <Link to="/">Home</Link> / <span>Book an appointment</span>
          </div>
          <h1 className="hc-h1">Book an appointment</h1>
          <p>Ask for a time to talk through what you would like made. We confirm every request ourselves.</p>
        </div>
      </section>
      <section className="hc-section">
        <div className="hc-container hc-detail">
          <aside className="hc-price-card" aria-label="How booking works" style={{ order: 2 }}>
            <p className="hc-eyebrow">How booking works</p>
            <p className="hc-price-card-note">You ask for a time, and I confirm it myself.</p>
            <dl className="hc-glance">
              <dt>Request</dt>
              <dd>Choose the type of visit and a free time</dd>
              <dt>Confirm</dt>
              <dd>I confirm it, or suggest another time</dd>
              <dt>Visit</dt>
              <dd>Bring photos or cloth you like</dd>
            </dl>
          </aside>
          <div className="hc-detail-main hp">
            {!cfg && (
              <p className="hp-help" role="status">
                Loading…
              </p>
            )}
            {cfg && !cfg.enabled && (
              <div className="hp-card hp-stack">
                <h2>Online booking is not open yet</h2>
                <p className="hp-help" style={{ fontSize: '1rem' }}>
                  To arrange a consultation or fitting, send us a message and we will agree a time with you.
                </p>
                <div>
                  <Link to="/contact" className="hp-btn hp-btn--primary">
                    Contact us
                  </Link>
                </div>
              </div>
            )}
            {cfg?.enabled && (
              <div className="hp-card">
                <ol className="hp-steps" aria-label="Steps">
                  {STEPS.map((s, i) => (
                    <li key={s} aria-current={i === step ? 'step' : undefined}>
                      {i + 1}. {s}
                    </li>
                  ))}
                </ol>
                {errors.form && (
                  <p className="hp-error" role="alert" style={{ marginBottom: '1rem' }}>
                    {errors.form}
                  </p>
                )}

                {step === 0 && (
                  <div className="hp-stack">
                    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                      <legend className="hp-label">What is it for?</legend>
                      {types.map((t) => (
                        <label key={t.type} className="hp-check">
                          <input
                            type="radio"
                            name="bk-type"
                            checked={chosenType === t.type}
                            onChange={() => {
                              setType(t.type)
                              setSlot(null)
                            }}
                          />
                          <span>
                            {APPT_TYPE_LABELS[t.type] || t.type} <span className="hp-muted">({t.duration_min} minutes)</span>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    <div>
                      <button type="button" className="hp-btn hp-btn--primary" onClick={() => setStep(1)}>
                        Choose a time
                      </button>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="hp-stack">
                    <h2>Choose a time</h2>
                    <PublicSlots load={load} value={slot?.start} onPick={setSlot} days={7} maxDays={cfg.horizon_days || 30} idPrefix="bk" />
                    {slot && (
                      <p role="status">
                        <strong>{fmtWhen(slot.start)}</strong> to {fmtTime(slot.end)}, Lagos time{duration ? ` (${duration} minutes)` : ''}.
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                      {types.length > 1 && (
                        <button type="button" className="hp-btn" onClick={() => setStep(0)}>
                          Back
                        </button>
                      )}
                      <button
                        type="button"
                        className="hp-btn hp-btn--primary"
                        disabled={!slot}
                        onClick={() => {
                          setErrors({})
                          setStep(2)
                        }}>
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <form onSubmit={submit} noValidate className="hp-stack">
                    <h2>Your details</h2>
                    <p className="hp-notice">
                      You are asking for <strong>{fmtWhen(slot.start)}</strong> (Lagos time). This is a request: it is not booked until we confirm it.
                    </p>
                    <div className="hp-field">
                      <label htmlFor="bk-name">Your name</label>
                      <input
                        id="bk-name"
                        className="hp-input"
                        autoComplete="name"
                        value={f.name}
                        onChange={set('name')}
                        aria-invalid={!!errors.name}
                        aria-describedby="bk-name-err"
                      />
                      {errors.name && (
                        <p id="bk-name-err" className="hp-error">
                          {errors.name}
                        </p>
                      )}
                    </div>
                    <div className="hp-field">
                      <label htmlFor="bk-phone">Phone or WhatsApp</label>
                      <input
                        id="bk-phone"
                        className="hp-input"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={f.phone}
                        onChange={set('phone')}
                        aria-invalid={!!errors.phone}
                        aria-describedby="bk-phone-help bk-phone-err"
                      />
                      <p id="bk-phone-help" className="hp-help">
                        A phone number or an email is needed so we can confirm.
                      </p>
                      {errors.phone && (
                        <p id="bk-phone-err" className="hp-error">
                          {errors.phone}
                        </p>
                      )}
                    </div>
                    <div className="hp-field">
                      <label htmlFor="bk-email">
                        Email <span className="hp-muted">(optional)</span>
                      </label>
                      <input
                        id="bk-email"
                        className="hp-input"
                        type="email"
                        autoComplete="email"
                        value={f.email}
                        onChange={set('email')}
                        aria-invalid={!!errors.email}
                        aria-describedby="bk-email-err"
                      />
                      {errors.email && (
                        <p id="bk-email-err" className="hp-error">
                          {errors.email}
                        </p>
                      )}
                    </div>
                    <div className="hp-field">
                      <label htmlFor="bk-note">
                        Anything we should know? <span className="hp-muted">(optional)</span>
                      </label>
                      <textarea id="bk-note" className="hp-input" maxLength={500} value={f.note} onChange={set('note')} />
                    </div>
                    <div className="hp-hp" aria-hidden="true">
                      <label htmlFor="bk-hp">Leave this empty</label>
                      <input id="bk-hp" tabIndex={-1} autoComplete="off" value={f.hp_url} onChange={set('hp_url')} />
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                      <button type="button" className="hp-btn" onClick={() => setStep(1)}>
                        Back
                      </button>
                      <button type="submit" className="hp-btn hp-btn--primary" disabled={busy}>
                        {busy ? 'Sending…' : 'Send request'}
                      </button>
                    </div>
                  </form>
                )}

                {step === 3 && (
                  <div className="hp-stack" role="status">
                    <p className="hp-notice hp-notice--ok">
                      <strong>Request sent, not yet confirmed.</strong>
                    </p>
                    <p>
                      You asked for <strong>{fmtWhen(slot.start)}</strong>, Lagos time. {done}
                    </p>
                    <p className="hp-help" style={{ fontSize: '1rem' }}>
                      We will contact you on the phone number or email you gave. If you do not hear from us, please{' '}
                      <Link to="/contact" className="hp-link">
                        contact us
                      </Link>
                      .
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}

export default BookPage
