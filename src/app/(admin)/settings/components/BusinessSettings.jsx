import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { METHOD_LABELS } from '@/helpers/format';
import LoadError from '@/components/herit/LoadError';
import SaveState from '@/components/herit/SaveState';

const KEYS = ['store_name', 'business_phone', 'business_email', 'business_address', 'business_hours_text',
  'quote_default_terms', 'quote_validity_days', 'deposit_policy_text', 'measurement_recheck_days'];
const METHODS = ['cash', 'transfer', 'pos_card', 'gateway', 'other'];
const EMPTY_HINT = 'Leave empty and it is not shown to clients.';

/**
 * Business profile, quote defaults and record-keeping rules (owner). Empty
 * values stay empty: documents and the website leave them out rather than
 * showing anything invented.
 */
const BusinessSettings = () => {
  const [form, setForm] = useState(null);
  const [methods, setMethods] = useState(['cash']);
  const [error, setError] = useState(null);
  const [save, setSave] = useState({ state: null, error: '' });
  const [errors, setErrors] = useState({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await heritApi.settings.get();
      setForm(Object.fromEntries(KEYS.map((k) => [k, s[k] ?? (k === 'measurement_recheck_days' ? '180' : '')])));
      setMethods(Array.isArray(s.payment_verified_methods) && s.payment_verified_methods.length ? s.payment_verified_methods : ['cash']);
    } catch (e) { setError(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.business_email && !/^\S+@\S+\.\S+$/.test(form.business_email)) errs.business_email = 'That email address looks wrong';
    if (form.quote_validity_days !== '' && !(/^\d+$/.test(form.quote_validity_days) && +form.quote_validity_days >= 1 && +form.quote_validity_days <= 365)) errs.quote_validity_days = 'Enter 1 to 365 days, or leave empty';
    if (!(/^\d+$/.test(String(form.measurement_recheck_days)) && +form.measurement_recheck_days >= 1 && +form.measurement_recheck_days <= 3650)) errs.measurement_recheck_days = 'Enter 1 to 3650 days';
    setErrors(errs);
    if (Object.keys(errs).length) { setSave({ state: 'failed', error: 'Please fix the highlighted fields' }); return; }
    setSave({ state: 'saving', error: '' });
    try {
      await heritApi.settings.save({ ...form, payment_verified_methods: methods });
      setSave({ state: 'saved', error: '' });
    } catch (err) { setSave({ state: 'failed', error: err.message }); }
  };

  if (error) return <LoadError what="settings" error={error} onRetry={load} />;
  if (!form) return <div className="py-4 text-center"><Spinner role="status" /></div>;

  const field = (k, label, help, props = {}) => (
    <Form.Group controlId={`set-${k}`}>
      <Form.Label>{label}</Form.Label>
      <Form.Control value={form[k]} onChange={set(k)} isInvalid={!!errors[k]} {...props} />
      <Form.Control.Feedback type="invalid">{errors[k]}</Form.Control.Feedback>
      {help && <Form.Text>{help}</Form.Text>}
    </Form.Group>
  );

  return (
    <Form onSubmit={submit} noValidate>
      <Card className="hd-card mb-3">
        <Card.Body>
          <h2 className="h5">Business details</h2>
          <p className="text-muted small">Printed on quotes, invoices and receipts.</p>
          <Row className="g-3">
            <Col xs={12} md={6}>{field('store_name', 'Business name', 'As it should appear on documents.')}</Col>
            <Col xs={12} md={6}>{field('business_phone', 'Phone', EMPTY_HINT, { type: 'tel', inputMode: 'tel' })}</Col>
            <Col xs={12} md={6}>{field('business_email', 'Email', EMPTY_HINT, { type: 'email' })}</Col>
            <Col xs={12} md={6}>{field('business_hours_text', 'Opening hours', `For example: Mon to Sat, 10am to 6pm. ${EMPTY_HINT}`)}</Col>
            <Col xs={12}>{field('business_address', 'Address', EMPTY_HINT, { as: 'textarea', rows: 2 })}</Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="hd-card mb-3">
        <Card.Body>
          <h2 className="h5">Quotes</h2>
          <Row className="g-3">
            <Col xs={12} md={6}>{field('quote_validity_days', 'Quotes valid for (days)', 'Sets “valid until” when you send a quote. Empty means no expiry date.', { inputMode: 'numeric' })}</Col>
            <Col xs={12}>{field('deposit_policy_text', 'Deposit policy', `Shown on printed quotes. Nothing is charged automatically. ${EMPTY_HINT}`, { as: 'textarea', rows: 2 })}</Col>
            <Col xs={12}>{field('quote_default_terms', 'Default terms', `Copied into each new quote, where you can change them. ${EMPTY_HINT}`, { as: 'textarea', rows: 4 })}</Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="hd-card mb-3">
        <Card.Body>
          <h2 className="h5">Payments and measurements</h2>
          <fieldset className="mb-3">
            <legend className="form-label fs-6">Payments that count as soon as you record them</legend>
            {METHODS.map((m) => (
              <Form.Check key={m} type="checkbox" id={`vm-${m}`} label={METHOD_LABELS[m]} checked={methods.includes(m)}
                onChange={(e) => setMethods((x) => (e.target.checked ? [...x, m] : x.filter((y) => y !== m)))} />
            ))}
            <Form.Text>Other methods wait until you verify them, for example after checking the bank app.</Form.Text>
          </fieldset>
          <Row className="g-3">
            <Col xs={12} md={6}>{field('measurement_recheck_days', 'Recheck measurements after (days)', 'Older approved sets show “Recheck fit” before repeat work.', { inputMode: 'numeric' })}</Col>
          </Row>
        </Card.Body>
      </Card>

      <div className="d-flex align-items-center gap-3 mb-4">
        <Button type="submit" variant="primary" disabled={save.state === 'saving'}>Save settings</Button>
        <SaveState state={save.state} error={save.error} />
      </div>
    </Form>
  );
};

export default BusinessSettings;
