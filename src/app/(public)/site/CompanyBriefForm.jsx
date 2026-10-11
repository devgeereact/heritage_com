import { useState } from 'react';
import { Link } from 'react-router-dom';
import heritApi from '@/helpers/heritApi';
import { Field, ErrorSummary } from './ui/Field';
import Button from './ui/Button';
import Icon from './ui/Icon';

const MATERIAL = [
  { v: 'client', l: 'We will supply the fabric' },
  { v: 'herit', l: 'Please source the fabric' },
  { v: 'unsure', l: 'Not sure yet' },
];

const empty = {
  company: '', name: '', role: '', phone: '', email: '', garment: '', quantity: '', desired_date: '',
  material: '', brief: '', website_url_confirm: '',
};

/** Tomorrow in Lagos time (UTC+1, no daylight saving), as YYYY-MM-DD. */
const tomorrowLagos = () => new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * Company brief (BUILD-SPEC 4.7). Posts to the public enquiry endpoint
 * (contact.php) as a wholesale enquiry: company, contact, phone or email,
 * garment, quantity and required date go in their own fields; role, material
 * responsibility and the brief go into the message so nothing needs a new
 * column. Hidden honeypot `website_url_confirm`; typed values survive errors.
 */
const CompanyBriefForm = ({ services = [], responseTime }) => {
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errors, setErrors] = useState([]);
  const [sendError, setSendError] = useState('');
  const minDate = tomorrowLagos();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const errorFor = (id) => errors.find((e) => e.id === id)?.message;

  const validate = () => {
    const found = [];
    if (!form.company.trim()) found.push({ id: 'cb-company', message: 'Enter the company name.' });
    if (!form.name.trim()) found.push({ id: 'cb-name', message: 'Enter your name.' });
    if (!form.phone.trim() && !form.email.trim()) found.push({ id: 'cb-phone', message: 'Enter a phone number or an email address so I can reply.' });
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.push({ id: 'cb-email', message: 'Check the email address.' });
    if (form.quantity !== '') {
      const q = Number(form.quantity);
      if (!Number.isInteger(q) || q < 1 || q > 9999) found.push({ id: 'cb-quantity', message: 'Enter a whole number from 1 to 9999.' });
    }
    if (form.desired_date && form.desired_date < minDate) found.push({ id: 'cb-date', message: 'Choose tomorrow or a later date.' });
    if (form.brief.length > 2000) found.push({ id: 'cb-brief', message: 'Keep the brief to 2000 characters or fewer.' });
    return found;
  };

  const submit = async (e) => {
    e.preventDefault();
    setSendError('');
    const found = validate();
    setErrors(found);
    if (found.length) return;
    setStatus('sending');
    const material = MATERIAL.find((m) => m.v === form.material)?.l;
    const message = [
      form.role.trim() && `Role: ${form.role.trim()}`,
      material && `Fabric: ${material}`,
      form.brief.trim(),
    ].filter(Boolean).join('\n');
    try {
      await heritApi.contact.submit({
        name: form.name.trim(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        type: 'wholesale',
        interest: form.garment,
        message,
        quantity: form.quantity === '' ? undefined : Number(form.quantity),
        desired_date: form.desired_date || undefined,
        website_url_confirm: form.website_url_confirm,
      });
      setStatus('sent');
      setForm(empty);
    } catch (err) {
      setStatus('error');
      setSendError(err.message || 'Your brief was not sent. Please try again.');
    }
  };

  if (status === 'sent') {
    return (
      <div className="hc-success-panel" role="status">
        <h3><Icon name="check-circle" /> Brief received</h3>
        <p>
          Thank you, I have your brief. I will reply {responseTime || 'as soon as I can'}.
          Nothing is booked or priced until we agree it.
        </p>
        <Button variant="secondary" className="hc-mt-3" onClick={() => setStatus('idle')}>Send another brief</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-describedby="cb-intro">
      <p id="cb-intro" className="hc-field-help">Fields marked (required) are needed. Dates are in Lagos time.</p>
      <ErrorSummary errors={errors} />
      {sendError && <p className="hc-form-error" role="alert">{sendError}</p>}
      <div className="hc-form-grid">
        <Field id="cb-company" label="Company name" required value={form.company} onChange={set('company')} autoComplete="organization" error={errorFor('cb-company')} />
        <Field id="cb-name" label="Your name" required value={form.name} onChange={set('name')} autoComplete="name" error={errorFor('cb-name')} />
        <Field id="cb-role" label="Your role (optional)" value={form.role} onChange={set('role')} autoComplete="organization-title" maxLength={80} />
        <Field id="cb-garment" label="Garment" as="select" value={form.garment} onChange={set('garment')}>
          <option value="">Choose a garment</option>
          {services.map((s) => <option key={s.slug} value={s.title}>{s.title}</option>)}
          <option value="Other">Other</option>
        </Field>
        <Field id="cb-phone" label="Phone or WhatsApp" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel"
          help="A phone number or an email address is needed." error={errorFor('cb-phone')} />
        <Field id="cb-email" label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" error={errorFor('cb-email')} />
        <Field id="cb-quantity" label="Approximate number of pieces (optional)" type="number" inputMode="numeric" min={1} max={9999}
          value={form.quantity} onChange={set('quantity')} error={errorFor('cb-quantity')} />
        <Field id="cb-date" label="Date you need them (optional)" type="date" min={minDate} value={form.desired_date} onChange={set('desired_date')}
          help="Tomorrow or later, Lagos time." error={errorFor('cb-date')} />
        <fieldset className="hc-radios hc-field--full">
          <legend>Fabric</legend>
          {MATERIAL.map((m) => (
            <label key={m.v} className="hc-radio">
              <input type="radio" name="cb-material" value={m.v} checked={form.material === m.v} onChange={set('material')} />
              <span>{m.l}</span>
            </label>
          ))}
        </fieldset>
        <Field id="cb-brief" label="Brief" as="textarea" rows={6} className="hc-field--full" value={form.brief} onChange={set('brief')} maxLength={2000}
          help={`What the pieces are for, styles, sizes and anything else I should know. ${form.brief.length} of 2000 characters.`} error={errorFor('cb-brief')} />
        <div className="hc-hp" aria-hidden="true">
          <label htmlFor="cb-hp">Leave this empty</label>
          <input id="cb-hp" type="text" name="website_url_confirm" tabIndex={-1} autoComplete="off" value={form.website_url_confirm} onChange={set('website_url_confirm')} />
        </div>
        <div className="hc-field--full">
          <p className="hc-field-help">
            I use these details only to reply to this brief.{' '}
            <Link to="/privacy">How I handle your details</Link>.
          </p>
          <Button type="submit" block disabled={status === 'sending'} icon={status === 'sending' ? undefined : 'send'} className="hc-mt-3">
            {status === 'sending' ? 'Sending…' : 'Send your company brief'}
          </Button>
          <p className="hc-field-help hc-mt-2" aria-live="polite">{status === 'sending' ? 'Sending your brief.' : ''}</p>
        </div>
      </div>
    </form>
  );
};

export default CompanyBriefForm;
