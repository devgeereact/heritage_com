import { useState } from 'react';
import { Row, Col, Form, Spinner } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';

const TYPES = [
  { v: 'order', l: 'Question about an order' },
  { v: 'product', l: 'Question about a piece' },
  { v: 'custom', l: 'Custom / aso-ebi request' },
  { v: 'gifting', l: 'Gifting enquiry' },
  { v: 'wholesale', l: 'Wholesale / stockist' },
  { v: 'general', l: 'General enquiry' },
];

// website_url_confirm is the hidden honeypot; company is a real optional field.
const empty = { name: '', phone: '', email: '', company: '', type: 'order', interest: '', message: '', website_url_confirm: '' };

/**
 * Public enquiry form. Posts to the same PHP enquiries endpoint as the
 * old landing form, but wears the new `.hc` theme classes.
 */
const SiteContactForm = ({ defaultType }) => {
  const [form, setForm] = useState({ ...empty, type: defaultType || empty.type });
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Please tell us your name.'); return; }
    if (!form.phone.trim() && !form.email.trim()) {
      setError('Leave a phone number or email so we can reply.');
      return;
    }
    setStatus('sending');
    try {
      await heritApi.contact.submit(form);
      setStatus('sent');
      setForm({ ...empty, type: defaultType || empty.type });
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Could not send. Please try WhatsApp or email.');
    }
  };

  if (status === 'sent') {
    return (
      <div className="hc-form-done">
        <IconifyIcon icon="solar:check-circle-bold" />
        <h4>Message received</h4>
        <p>Thank you — you&apos;re officially family. We aim to reply within one business day.</p>
        <button className="hc-btn hc-btn--ghost hc-mt-3" onClick={() => setStatus('idle')}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <Form onSubmit={submit} className="hc-form" noValidate>
      {error && <div className="hc-form-error">{error}</div>}
      <Row className="g-3">
        <Col md={6}>
          <label className="hc-label">Name</label>
          <Form.Control value={form.name} onChange={set('name')} placeholder="Your name" />
        </Col>
        <Col md={6}>
          <label className="hc-label">What can we help with?</label>
          <Form.Select value={form.type} onChange={set('type')}>
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </Form.Select>
        </Col>
        <Col md={6}>
          <label className="hc-label">Phone / WhatsApp</label>
          <Form.Control value={form.phone} onChange={set('phone')} placeholder="+234..." />
        </Col>
        <Col md={6}>
          <label className="hc-label">Email</label>
          <Form.Control type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" />
        </Col>
        <Col xs={12}>
          <label className="hc-label">Company or organisation (optional)</label>
          <Form.Control value={form.company} onChange={set('company')} placeholder="For group or company orders" autoComplete="organization" />
        </Col>
        <Col xs={12}>
          <label className="hc-label">Piece or fabric in mind (optional)</label>
          <Form.Control value={form.interest} onChange={set('interest')} placeholder="e.g. Adire wrap dress, size M" />
        </Col>
        <Col xs={12}>
          <label className="hc-label">Message</label>
          <Form.Control as="textarea" rows={4} value={form.message} onChange={set('message')}
            placeholder="Tell us about the occasion, size, style and timing." />
        </Col>
        {/* Honeypot — hidden from people, catches bots. */}
        <input
          type="text" name="website_url_confirm" tabIndex={-1} autoComplete="off"
          value={form.website_url_confirm} onChange={set('website_url_confirm')}
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          aria-hidden="true"
        />
        <Col xs={12}>
          <button type="submit" className="hc-btn hc-btn--primary hc-btn--block" disabled={status === 'sending'}>
            {status === 'sending'
              ? <><Spinner size="sm" /> Sending…</>
              : <><IconifyIcon icon="solar:plain-bold" /> Send enquiry</>}
          </button>
        </Col>
      </Row>
    </Form>
  );
};

export default SiteContactForm;
