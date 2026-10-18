import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { useAuthContext } from '@/context/useAuthContext';
import LoadError from '@/components/herit/LoadError';
import SaveState from '@/components/herit/SaveState';

// K-18: settings.php keys read by the daily job php-api/retention.php. The rules
// (minimum days, the ten-year cap) live in php-api/_retention.php; the server
// refuses anything else, so this list only labels the fields.
const FIELDS = [
  { key: 'retention_expired_tokens_days', label: 'Expired staff sign-in tokens', hint: 'Days after they expire' },
  { key: 'retention_customer_sessions_days', label: 'Expired client portal sessions', hint: 'Days after they expire' },
  { key: 'retention_access_attempts_days', label: 'Client access codes and invite links', hint: 'Days after they expire' },
  { key: 'retention_audit_log_days', label: 'Audit log and failed sign-ins', hint: '90 days at least', min: 90 },
  { key: 'retention_whatsapp_log_days', label: 'WhatsApp message log', hint: 'Days after the message' },
  { key: 'retention_abandoned_carts_days', label: 'Abandoned shop carts', hint: 'Days after the last change' },
  { key: 'retention_waitlist_days', label: 'Restock waitlist sign-ups', hint: 'Days after signing up' },
  { key: 'retention_closed_enquiries_days', label: 'Closed enquiries that never became a job', hint: 'Days after the last change' },
  { key: 'retention_usage_daily_days', label: 'Section usage counts (no names)', hint: 'Days after the day counted' },
];
const MAX = 3650;
// Only the owner may change these; settings.php refuses anyone else with a 403.
const OWNER_ONLY = ['super_admin'];

/** How long personal data is kept (owner). Empty keeps it forever; jobs, payments and clients are never deleted. */
const RetentionSettings = () => {
  const { user } = useAuthContext();
  const canEdit = OWNER_ONLY.includes(user?.role);
  const [f, setF] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErr, setFieldErr] = useState({});
  const [save, setSave] = useState({ state: null, error: '' });

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await heritApi.settings.get();
      setF(Object.fromEntries(FIELDS.map(({ key }) => [key, s[key] && s[key] !== '0' ? String(s[key]) : ''])));
    } catch (e) { setError(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <LoadError what="data retention settings" error={error} onRetry={load} />;
  if (!f) return <div className="py-4 text-center"><Spinner role="status" /></div>;

  const submit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    const errs = {};
    for (const { key, min = 1 } of FIELDS) {
      const v = f[key].trim();
      if (v !== '' && (!/^\d+$/.test(v) || +v < min || +v > MAX)) errs[key] = `Enter ${min} to ${MAX} days, or leave empty`;
    }
    setFieldErr(errs);
    if (Object.keys(errs).length) { setSave({ state: 'failed', error: 'Please fix the highlighted fields' }); return; }
    setSave({ state: 'saving', error: '' });
    try {
      await heritApi.settings.save(Object.fromEntries(FIELDS.map(({ key }) => [key, f[key].trim()])));
      setSave({ state: 'saved', error: '' });
    } catch (err) { setSave({ state: 'failed', error: err.message }); }
  };

  return (
    <Form onSubmit={submit} noValidate>
      <Card className="hd-card mb-3">
        <Card.Body>
          <h2 className="h5">Data retention</h2>
          <p className="small text-muted">
            How long each kind of record is kept before the nightly clean-up deletes it. Leave a box empty to keep it forever.
            Jobs, payments, quotes, measurements and client records are never deleted by the clean-up.
          </p>
          {!canEdit && <p className="small mb-3" data-testid="retention-readonly">Only the owner can change these periods.</p>}
          <Row className="g-3">
            {FIELDS.map(({ key, label, hint, min = 1 }) => (
              <Col md={6} key={key}>
                <Form.Group controlId={`rt-${key}`}>
                  <Form.Label>{label} <span className="text-muted fw-normal">(days)</span></Form.Label>
                  <Form.Control type="number" inputMode="numeric" min={min} max={MAX} placeholder="Keep forever" value={f[key]} disabled={!canEdit}
                    onChange={(e) => setF((x) => ({ ...x, [key]: e.target.value }))} isInvalid={!!fieldErr[key]} />
                  <Form.Text>{hint}</Form.Text>
                  <Form.Control.Feedback type="invalid">{fieldErr[key]}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            ))}
          </Row>
          {canEdit && (
            <div className="d-flex align-items-center gap-3 mt-3">
              <Button type="submit" variant="outline-secondary">Save retention periods</Button>
              <SaveState state={save.state} error={save.error} />
            </div>
          )}
        </Card.Body>
      </Card>
    </Form>
  );
};

export default RetentionSettings;
