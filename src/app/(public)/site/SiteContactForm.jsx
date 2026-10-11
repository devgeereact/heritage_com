import { useState } from 'react';
import heritApi from '@/helpers/heritApi';
import { Field, ErrorSummary } from './ui/Field';
import Button from './ui/Button';
import Icon from './ui/Icon';

const TYPES = [
  { v: 'order', l: 'Question about an order' },
  { v: 'product', l: 'Question about a piece' },
  { v: 'custom', l: 'Made to measure or group order' },
  { v: 'gifting', l: 'Gifting enquiry' },
  { v: 'wholesale', l: 'Wholesale or stockist' },
  { v: 'general', l: 'General enquiry' },
];

// website_url_confirm is the hidden honeypot; company is a real optional field.
const empty = { name: '', phone: '', email: '', company: '', type: 'order', interest: '', message: '', website_url_confirm: '' };

/**
 * Public enquiry form (contact.php). Persistent labels, required stated in
 * text, an error summary that takes focus on a failed submit, and typed
 * values kept when sending fails.
 */
const SiteContactForm = ({ defaultType }) => {
  const [form, setForm] = useState({ ...empty, type: defaultType || empty.type });
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errors, setErrors] = useState([]);
  const [sendError, setSendError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const errorFor = (id) => errors.find((e) => e.id === id)?.message;

  const submit = async (e) => {
    e.preventDefault();
    setSendError('');
    const found = [];
    if (!form.name.trim()) found.push({ id: 'cf-name', message: 'Enter your name.' });
    if (!form.phone.trim() && !form.email.trim()) found.push({ id: 'cf-phone', message: 'Enter a phone number or an email address so we can reply.' });
    setErrors(found);
    if (found.length) return;
    setStatus('sending');
    try {
      await heritApi.contact.submit(form);
      setStatus('sent');
      setForm({ ...empty, type: defaultType || empty.type });
    } catch (err) {
      setStatus('error');
      setSendError(err.message || 'Your message was not sent. Please try again.');
    }
  };

  if (status === 'sent') {
    return (
      <div className="hc-success-panel" role="status">
        <h3><Icon name="check-circle" /> Message received</h3>
        <p>Thank you. We will reply as soon as we can.</p>
        <Button variant="secondary" className="hc-mt-3" onClick={() => setStatus('idle')}>Send another</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <ErrorSummary errors={errors} />
      {sendError && <p className="hc-form-error" role="alert">{sendError}</p>}
      <div className="hc-form-grid">
        <Field id="cf-name" label="Name" required value={form.name} onChange={set('name')} autoComplete="name" error={errorFor('cf-name')} />
        <Field id="cf-type" label="What can we help with?" as="select" value={form.type} onChange={set('type')}>
          {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </Field>
        <Field id="cf-phone" label="Phone or WhatsApp" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel"
          help="A phone number or an email address is needed." error={errorFor('cf-phone')} />
        <Field id="cf-email" label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
        <Field id="cf-company" label="Company or organisation (optional)" className="hc-field--full" value={form.company} onChange={set('company')} autoComplete="organization"
          help="Only for group or company orders." />
        <Field id="cf-interest" label="Piece or fabric in mind (optional)" className="hc-field--full" value={form.interest} onChange={set('interest')} />
        <Field id="cf-message" label="Message" as="textarea" rows={5} className="hc-field--full" value={form.message} onChange={set('message')}
          help="The occasion, sizes, style and the date you need it by." />
        {/* Honeypot: hidden from people, catches bots. */}
        <input
          type="text" name="website_url_confirm" tabIndex={-1} autoComplete="off"
          value={form.website_url_confirm} onChange={set('website_url_confirm')}
          className="hc-sr-only" aria-hidden="true"
        />
        <div className="hc-field--full">
          <Button type="submit" block disabled={status === 'sending'} icon={status === 'sending' ? undefined : 'send'}>
            {status === 'sending' ? 'Sending…' : 'Send enquiry'}
          </Button>
          <p className="hc-field-help hc-mt-2" aria-live="polite">{status === 'sending' ? 'Sending your message.' : ''}</p>
        </div>
      </div>
    </form>
  );
};

export default SiteContactForm;
