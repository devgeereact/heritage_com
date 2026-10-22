import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { GARMENT_LABELS } from '@/helpers/format';
import SaveState from '@/components/herit/SaveState';

const GARMENTS = ['agbada', 'kaftan', 'senator', 'suit', 'shirt', 'trouser', 'other'];
const pick = (j) => ({
  garment_type: j.garment_type || 'other', description: j.description || '', quantity: String(j.quantity || 1),
  event_date: j.event_date || '', due_date: j.due_date || '', next_action: j.next_action || '',
  next_action_date: j.next_action_date || '', fabric_source: j.fabric_source || '', fabric: j.fabric || '',
});

/**
 * Job details and the three dates (promised, event, next action). Saves with
 * the lock_version loaded; a 409 means someone changed the job elsewhere, and
 * the typed values stay on screen until the owner reloads.
 */
const DatesPanel = ({ job, tailors = [], onSaved, onReload }) => {
  const [form, setForm] = useState(pick(job));
  const [save, setSave] = useState({ state: null, error: '' });
  const [conflict, setConflict] = useState(false);
  const [fitting, setFitting] = useState(job.fitting_date || '');
  const [fitSave, setFitSave] = useState({ state: null, error: '' });
  const [tailor, setTailor] = useState(job.assigned_tailor_id ? String(job.assigned_tailor_id) : '');

  useEffect(() => { setForm(pick(job)); setConflict(false); setFitting(job.fitting_date || ''); }, [job]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d+$/.test(form.quantity) || Number(form.quantity) < 1) { setSave({ state: 'failed', error: 'Quantity must be a whole number from 1' }); return; }
    setSave({ state: 'saving', error: '' });
    try {
      const r = await heritApi.tailoring.update(job.id, { ...form, quantity: Number(form.quantity), lock_version: job.lock_version });
      setSave({ state: 'saved', error: '' });
      onSaved?.(r.lock_version);
    } catch (err) {
      if (err.status === 409) { setConflict(true); setSave({ state: 'failed', error: 'changed elsewhere' }); }
      else setSave({ state: 'failed', error: err.message });
    }
  };

  const saveFitting = async () => {
    setFitSave({ state: 'saving', error: '' });
    try {
      await heritApi.tailoring.setFitting(job.id, fitting);
      if (tailor !== String(job.assigned_tailor_id || '')) await heritApi.tailoring.assign(job.id, { assigned_tailor_id: tailor, due_date: form.due_date || job.due_date || '' });
      setFitSave({ state: 'saved', error: '' });
      onReload?.();
    } catch (err) { setFitSave({ state: 'failed', error: err.message }); }
  };

  return (
    <>
      <Card className="hd-card mb-3">
        <Card.Body>
          <h2 className="h6">Details and dates</h2>
          {conflict && (
            <Alert variant="warning" className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span>This job was changed elsewhere. Reload to see the latest.</span>
              <Button variant="outline-secondary" onClick={onReload}>Reload</Button>
            </Alert>
          )}
          <Form onSubmit={submit} noValidate>
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group controlId="jd-due">
                  <Form.Label>Promised date</Form.Label>
                  <Form.Control type="date" value={form.due_date} onChange={set('due_date')} />
                  <Form.Text>What you promised the client.</Form.Text>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="jd-event">
                  <Form.Label>Event date</Form.Label>
                  <Form.Control type="date" value={form.event_date} onChange={set('event_date')} />
                  <Form.Text>The client's occasion.</Form.Text>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="jd-na">
                  <Form.Label>Next action</Form.Label>
                  <Form.Control value={form.next_action} onChange={set('next_action')} maxLength={160} />
                  <Form.Text>Internal. For example: call to book fitting.</Form.Text>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="jd-nad">
                  <Form.Label>Next action date</Form.Label>
                  <Form.Control type="date" value={form.next_action_date} onChange={set('next_action_date')} />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="jd-garment">
                  <Form.Label>Garment</Form.Label>
                  <Form.Select value={form.garment_type} onChange={set('garment_type')}>
                    {GARMENTS.map((g) => <option key={g} value={g}>{GARMENT_LABELS[g]}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="jd-qty">
                  <Form.Label>Quantity</Form.Label>
                  <Form.Control inputMode="numeric" value={form.quantity} onChange={set('quantity')} />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="jd-desc">
                  <Form.Label>Description</Form.Label>
                  <Form.Control value={form.description} onChange={set('description')} maxLength={255} />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="jd-fabric">
                  <Form.Label>Fabric</Form.Label>
                  <Form.Control value={form.fabric} onChange={set('fabric')} maxLength={160} />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="jd-fsrc">
                  <Form.Label>Fabric from</Form.Label>
                  <Form.Select value={form.fabric_source} onChange={set('fabric_source')}>
                    <option value="">Not decided</option><option value="client">The client</option><option value="herit">Herit</option><option value="mixed">Both</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex align-items-center gap-3 mt-3">
              <Button type="submit" variant="outline-secondary" disabled={save.state === 'saving' || conflict}>Save details</Button>
              <SaveState state={save.state} error={conflict ? 'This job was changed elsewhere' : save.error} />
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card className="hd-card mb-3">
        <Card.Body>
          <h2 className="h6">Fitting and tailor</h2>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group controlId="jd-fit">
                <Form.Label>Fitting date</Form.Label>
                <Form.Control type="date" value={fitting} onChange={(e) => setFitting(e.target.value)} />
                <Form.Text>Shows on Today on the day.</Form.Text>
              </Form.Group>
            </Col>
            {tailors.length > 0 && (
              <Col xs={12} md={6}>
                <Form.Group controlId="jd-tailor">
                  <Form.Label>Tailor</Form.Label>
                  <Form.Select value={tailor} onChange={(e) => setTailor(e.target.value)}>
                    <option value="">Not assigned</option>
                    {tailors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}
          </Row>
          <div className="d-flex align-items-center gap-3 mt-3">
            <Button variant="outline-secondary" onClick={saveFitting} disabled={fitSave.state === 'saving'}>Save fitting</Button>
            <SaveState state={fitSave.state} error={fitSave.error} />
          </div>
        </Card.Body>
      </Card>
    </>
  );
};

export default DatesPanel;
