import { useState } from 'react';
import PrivacyNote from './PrivacyNote';
import heritApi from '@/helpers/heritApi';
import { Field, ErrorSummary } from './ui/Field';
import Button from './ui/Button';
import Icon from './ui/Icon';

// Focus the thank-you panel when it replaces the form, so it is read out (K-16).
const focusOnMount = (el) => el?.focus();

/**
 * Visitor-facing choices and the enquiry type contact.php stores for each
 * (fitting, bespoke, wholesale or general; anything else would be saved as
 * general). `shop` choices show only while the shop is on.
 */
export const ENQUIRY_TYPES = [
  { v: 'fitting', l: 'A measurement appointment', type: 'fitting' },
  { v: 'bespoke', l: 'A made-to-measure piece', type: 'bespoke' },
  { v: 'company', l: 'A company or group order', type: 'wholesale' },
  { v: 'order', l: 'An order already in progress', type: 'general' },
  { v: 'gifting', l: 'Gifting', type: 'general', shop: true },
  { v: 'general', l: 'Something else', type: 'general' },
];

// website_url_confirm is the hidden honeypot; company is a real optional field.
const empty = { name: '', phone: '', email: '', company: '', choice: 'general', interest: '', message: '', website_url_confirm: '' };

/**
 * Public enquiry form (contact.php). Persistent labels, required stated in
 * text, an error summary that takes focus on a failed submit, and typed
 * values kept when sending fails. `defaultType` preselects a choice
 * (?type= on the contact page); `defaultInterest` fills the piece field
 * (?service=). The acknowledgement follows BR-01: nothing is booked or
 * priced until it is agreed.
 */
const SiteContactForm = ({ defaultType, defaultInterest = '', responseTime, shopOn = false }) => {
  const choices = ENQUIRY_TYPES.filter((t) => shopOn || !t.shop || t.v === defaultType);
  const start = choices.some((t) => t.v === defaultType) ? defaultType : 'general';
  const fresh = () => ({ ...empty, choice: start, interest: defaultInterest });
  const [form, setForm] = useState(fresh);
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
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.push({ id: 'cf-email', message: 'Check the email address.' });
    setErrors(found);
    if (found.length) return;
    setStatus('sending');
    const choice = ENQUIRY_TYPES.find((t) => t.v === form.choice) || ENQUIRY_TYPES[ENQUIRY_TYPES.length - 1];
    const note = choice.type === 'general' && choice.v !== 'general' ? `About: ${choice.l}` : '';
    try {
      await heritApi.contact.submit({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        type: choice.type,
        interest: form.interest.trim(),
        message: [note, form.message.trim()].filter(Boolean).join('\n'),
        website_url_confirm: form.website_url_confirm,
      });
      setStatus('sent');
      setForm(fresh());
    } catch (err) {
      setStatus('error');
      setSendError(err.message || 'Your message was not sent. Please try again.');
    }
  };

  if (status === 'sent') {
    return (
      <div className="hc-success-panel" role="status" tabIndex={-1} ref={focusOnMount}>
        <h3><Icon name="check-circle" /> Message received</h3>
        <p>
          Thank you, we have your message. We will reply {responseTime || 'as soon as we can'}.
          Nothing is booked or priced until we agree it.
        </p>
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
        <Field id="cf-type" label="What is it about?" as="select" value={form.choice} onChange={set('choice')}>
          {choices.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </Field>
        {/* One shared note under the phone and email pair, so the two fields stay level. */}
        <Field id="cf-phone" label="Phone or WhatsApp" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel"
          error={errorFor('cf-phone')} aria-describedby={[errorFor('cf-phone') && 'cf-phone-error', 'cf-reach-help'].filter(Boolean).join(' ')} />
        <Field id="cf-email" label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" error={errorFor('cf-email')}
          aria-describedby={[errorFor('cf-email') && 'cf-email-error', 'cf-reach-help'].filter(Boolean).join(' ')} />
        <p id="cf-reach-help" className="hc-form-note">A phone number or an email address is needed, so we can reply.</p>
        {form.choice === 'company' && (
          <Field id="cf-company" label="Company or organisation (optional)" className="hc-field--full" value={form.company} onChange={set('company')} autoComplete="organization" />
        )}
        <Field id="cf-interest" label="Piece or fabric in mind (optional)" className="hc-field--full" value={form.interest} onChange={set('interest')} />
        <Field id="cf-message" label="Message" as="textarea" rows={5} className="hc-field--full" value={form.message} onChange={set('message')}
          maxLength={4000} help="The occasion, the style and the date you need it by." />
        <div className="hc-hp" aria-hidden="true">
          <label htmlFor="cf-hp">Leave this empty</label>
          <input id="cf-hp" type="text" name="website_url_confirm" tabIndex={-1} autoComplete="off" value={form.website_url_confirm} onChange={set('website_url_confirm')} />
        </div>
        <div className="hc-field--full">
          <PrivacyNote>Your details are used to reply to this enquiry.</PrivacyNote>
          <Button type="submit" block disabled={status === 'sending'} icon={status === 'sending' ? undefined : 'send'} className="hc-mt-3">
            {status === 'sending' ? 'Sending…' : 'Send enquiry'}
          </Button>
          <p className="hc-field-help hc-mt-2" aria-live="polite">{status === 'sending' ? 'Sending your message.' : ''}</p>
        </div>
      </div>
    </form>
  );
};

export default SiteContactForm;
