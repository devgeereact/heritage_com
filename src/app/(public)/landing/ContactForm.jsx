import { useState } from 'react';
import { Row, Col, Form, Spinner } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';

const TYPES = [
  { v: 'fitting', l: 'Book a fitting' },
  { v: 'bespoke', l: 'Bespoke order' },
  { v: 'wholesale', l: 'Wholesale / reseller' },
  { v: 'general', l: 'General enquiry' },
];

const empty = { name: '', phone: '', email: '', type: 'fitting', interest: '', message: '', company: '' };

const ContactForm = () => {
  const [form, setForm] = useState(empty);
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
      setForm(empty);
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Could not send. Please try WhatsApp or email.');
    }
  };

  if (status === 'sent') {
    return (
      <div className="hl-form-done">
        <IconifyIcon icon="solar:check-circle-bold" />
        <h4 className="hl-serif mt-2">Message received</h4>
        <p className="mb-0">We will be in touch shortly to talk through your piece.</p>
        <button className="hl-btn hl-btn-ghost mt-3" onClick={() => setStatus('idle')}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <Form onSubmit={submit} className="hl-form" noValidate>
      {error && <div className="hl-form-error">{error}</div>}
      <Row className="g-3">
        <Col md={6}>
          <label className="hl-label">Name</label>
          <Form.Control value={form.name} onChange={set('name')} placeholder="Your name" />
        </Col>
        <Col md={6}>
          <label className="hl-label">What can we help with?</label>
          <Form.Select value={form.type} onChange={set('type')}>
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </Form.Select>
        </Col>
        <Col md={6}>
          <label className="hl-label">Phone / WhatsApp</label>
          <Form.Control value={form.phone} onChange={set('phone')} placeholder="+234..." />
        </Col>
        <Col md={6}>
          <label className="hl-label">Email</label>
          <Form.Control type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" />
        </Col>
        <Col xs={12}>
          <label className="hl-label">Garment or fabric in mind (optional)</label>
          <Form.Control value={form.interest} onChange={set('interest')} placeholder="e.g. Agbada in royal Aso-oke" />
        </Col>
        <Col xs={12}>
          <label className="hl-label">Message</label>
          <Form.Control as="textarea" rows={3} value={form.message} onChange={set('message')}
            placeholder="Tell us about the occasion, style and timing." />
        </Col>
        {/* Honeypot — hidden from people, catches bots. */}
        <input
          type="text" name="company" tabIndex={-1} autoComplete="off"
          value={form.company} onChange={set('company')}
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          aria-hidden="true"
        />
        <Col xs={12}>
          <button type="submit" className="hl-btn hl-btn-primary" disabled={status === 'sending'}>
            {status === 'sending'
              ? <><Spinner size="sm" /> Sending…</>
              : <><IconifyIcon icon="solar:plain-bold" /> Send enquiry</>}
          </button>
        </Col>
      </Row>
    </Form>
  );
};

export default ContactForm;
