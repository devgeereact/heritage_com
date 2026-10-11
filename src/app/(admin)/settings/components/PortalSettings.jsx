import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import LoadError from '@/components/herit/LoadError';
import SaveState from '@/components/herit/SaveState';

/** Client portal switches and the feedback consent wording (settings.php keys). */
const PortalSettings = () => {
  const [f, setF] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErr, setFieldErr] = useState('');
  const [save, setSave] = useState({ state: null, error: '' });

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await heritApi.settings.get();
      setF({
        customer_session_days: s.customer_session_days ?? '7',
        portal_quote_accept_enabled: String(s.portal_quote_accept_enabled ?? '0') === '1',
        portal_show_measurements: String(s.portal_show_measurements ?? '0') === '1',
        feedback_publish_wording: s.feedback_publish_wording ?? '',
        feedback_photo_wording: s.feedback_photo_wording ?? '',
      });
    } catch (e) { setError(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <LoadError what="portal settings" error={error} onRetry={load} />;
  if (!f) return <div className="py-4 text-center"><Spinner role="status" /></div>;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const d = String(f.customer_session_days);
    if (!/^\d+$/.test(d) || +d < 1 || +d > 90) { setFieldErr('Enter 1 to 90 days'); setSave({ state: 'failed', error: 'Please fix the highlighted field' }); return; }
    setFieldErr('');
    setSave({ state: 'saving', error: '' });
    try {
      await heritApi.settings.save({ ...f, portal_quote_accept_enabled: f.portal_quote_accept_enabled ? '1' : '0', portal_show_measurements: f.portal_show_measurements ? '1' : '0' });
      setSave({ state: 'saved', error: '' });
    } catch (err) { setSave({ state: 'failed', error: err.message }); }
  };

  return (
    <Form onSubmit={submit} noValidate>
      <Card className="hd-card mb-3">
        <Card.Body>
          <h2 className="h5">Client portal</h2>
          <p className="small text-muted">Clients open their jobs with their reference and a code sent to their email, or with a link you send them.</p>
          <Form.Group controlId="ps-days" className="mb-3" style={{ maxWidth: 260 }}>
            <Form.Label>Stay signed in for <span className="text-muted fw-normal">(days)</span></Form.Label>
            <Form.Control type="number" inputMode="numeric" min={1} max={90} value={f.customer_session_days} onChange={set('customer_session_days')} isInvalid={!!fieldErr} />
            <Form.Control.Feedback type="invalid">{fieldErr}</Form.Control.Feedback>
          </Form.Group>
          <Form.Check type="switch" id="ps-quote" label="Clients can accept a quote in the portal" checked={f.portal_quote_accept_enabled} onChange={set('portal_quote_accept_enabled')} />
          <Form.Check type="switch" id="ps-meas" label="Clients can see their own measurements" checked={f.portal_show_measurements} onChange={set('portal_show_measurements')} />
          <Form.Group controlId="ps-pw" className="mt-3">
            <Form.Label>Wording for permission to publish feedback</Form.Label>
            <Form.Control as="textarea" rows={2} maxLength={1000} value={f.feedback_publish_wording} onChange={set('feedback_publish_wording')} />
            <Form.Text>Shown next to the choice in the feedback form and stored with each answer.</Form.Text>
          </Form.Group>
          <Form.Group controlId="ps-phw" className="mt-3">
            <Form.Label>Wording for permission to use photos</Form.Label>
            <Form.Control as="textarea" rows={2} maxLength={1000} value={f.feedback_photo_wording} onChange={set('feedback_photo_wording')} />
          </Form.Group>
          <div className="d-flex align-items-center gap-3 mt-3">
            <Button type="submit" variant="outline-secondary">Save portal settings</Button>
            <SaveState state={save.state} error={save.error} />
          </div>
        </Card.Body>
      </Card>
    </Form>
  );
};

export default PortalSettings;
