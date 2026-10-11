import { useEffect, useRef, useState } from 'react';
import heritApi from '@/helpers/heritApi';
import './portal.css';

/**
 * Two-step access to the client portal: (1) reference plus the registered phone
 * or email, (2) the six-digit code sent to the registered email. Every reply is
 * generic, so the form never reveals whether a reference or contact exists.
 */
const AccessForm = ({ onSignedIn, notice, intro }) => {
  const [step, setStep] = useState('details');
  const [reference, setReference] = useState('');
  const [contact, setContact] = useState('');
  const [hp, setHp] = useState('');
  const [challenge, setChallenge] = useState('');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  const start = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!reference.trim()) errs.reference = 'Enter your reference';
    if (!contact.trim()) errs.contact = 'Enter the phone number or email you gave us';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const r = await heritApi.access.start(reference.trim(), contact.trim(), hp);
      setChallenge(r.challenge); setMessage(r.message); setCode(''); setStep('code');
    } catch (err) {
      setErrors({ form: err.status === 429 ? 'Too many tries. Please wait a few minutes and try again.' : (err.message || 'Something went wrong. Please try again.') });
    } finally { setBusy(false); }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { setErrors({ code: 'Enter the 6-digit code' }); return; }
    setErrors({}); setBusy(true);
    try {
      const r = await heritApi.access.verify(challenge, code);
      heritApi.client.setToken(r.token);
      onSignedIn?.(r.name);
    } catch (err) {
      setErrors({ code: err.status === 429 ? 'Too many tries. Please wait a few minutes.' : (err.message || "That code didn't work or has expired.") });
    } finally { setBusy(false); }
  };

  return (
    <div className="hp hp-card" style={{ maxWidth: 520, margin: '0 auto' }}>
      {notice && <p className="hp-notice" role="status">{notice}</p>}
      {step === 'details' && (
        <form onSubmit={start} noValidate className="hp-stack">
          <div>
            <h2>Follow your order</h2>
            <p className="hp-help">{intro || 'Enter the reference from your quote, receipt or order confirmation, and the phone number or email you gave us. We will email you a code.'}</p>
          </div>
          {errors.form && <p className="hp-error" role="alert">{errors.form}</p>}
          <div className="hp-field">
            <label htmlFor="acc-ref">Reference</label>
            <input id="acc-ref" className="hp-input" value={reference} onChange={(e) => setReference(e.target.value)} autoComplete="off" autoCapitalize="characters"
              aria-invalid={!!errors.reference} aria-describedby="acc-ref-help acc-ref-err" />
            <p id="acc-ref-help" className="hp-help">For example K7M2P9QX4R.</p>
            {errors.reference && <p id="acc-ref-err" className="hp-error">{errors.reference}</p>}
          </div>
          <div className="hp-field">
            <label htmlFor="acc-contact">Phone number or email</label>
            <input id="acc-contact" className="hp-input" value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="email"
              aria-invalid={!!errors.contact} aria-describedby="acc-contact-help acc-contact-err" />
            <p id="acc-contact-help" className="hp-help">The one you gave us when you ordered.</p>
            {errors.contact && <p id="acc-contact-err" className="hp-error">{errors.contact}</p>}
          </div>
          <div className="hp-hp" aria-hidden="true">
            <label htmlFor="acc-hp">Leave this empty</label>
            <input id="acc-hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
          </div>
          <button type="submit" className="hp-btn hp-btn--primary" disabled={busy}>{busy ? 'Sending…' : 'Send me a code'}</button>
        </form>
      )}
      {step === 'code' && (
        <form onSubmit={verify} noValidate className="hp-stack">
          <div>
            <h2>Check your email</h2>
            <p className="hp-help" role="status">{message}</p>
          </div>
          <div className="hp-field">
            <label htmlFor="acc-code">6-digit code</label>
            <input id="acc-code" ref={codeRef} className="hp-input hp-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-invalid={!!errors.code} aria-describedby="acc-code-help acc-code-err" />
            <p id="acc-code-help" className="hp-help">The code works once and expires after 10 minutes.</p>
            {errors.code && <p id="acc-code-err" className="hp-error" role="alert">{errors.code}</p>}
          </div>
          <button type="submit" className="hp-btn hp-btn--primary" disabled={busy}>{busy ? 'Checking…' : 'Open my orders'}</button>
          <button type="button" className="hp-link" onClick={() => { setStep('details'); setErrors({}); }}>Use a different reference or send a new code</button>
        </form>
      )}
    </div>
  );
};

export default AccessForm;
