import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Form, InputGroup, Row, Spinner, ToggleButton, ToggleButtonGroup } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { newRequestKey } from '@/helpers/requestKey';
import { fmtDate, lagosToday } from '@/helpers/format';
import ErrorSummary from './ErrorSummary';
import LoadError from './LoadError';

const UNIT_LABEL = { cm: 'cm', in: 'in' };
const NUM = /^(\d+(\.\d+)?|\.\d+)$/;

/**
 * Enter a dated measurement set: choose a template, keep the unit visible on
 * every field, use the numeric keyboard, leave blanks blank. A review step
 * shows the unit and values before saving. An owner's set is approved at once;
 * a tailor's set waits for the owner. Values are never edited afterwards.
 */
const MeasurementSetForm = ({ customerId, clientName, onSaved, onCancel }) => {
  const [templates, setTemplates] = useState([]);
  const [state, setState] = useState('loading');
  const [loadErr, setLoadErr] = useState(null);
  const [tkey, setTkey] = useState('');
  const [unit, setUnit] = useState('cm');
  const [vals, setVals] = useState({});
  const [fit, setFit] = useState('');
  const [notes, setNotes] = useState('');
  const [takenAt, setTakenAt] = useState(lagosToday());
  const [requestKey, setRequestKey] = useState(newRequestKey);
  const [review, setReview] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const t = (await heritApi.measurements.templates()).filter((x) => x.tkey !== 'legacy');
      setTemplates(t);
      setTkey((k) => k || t[0]?.tkey || '');
      setState('ready');
    } catch (e) {
      setLoadErr(e); setState('error');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const tpl = templates.find((t) => t.tkey === tkey);
  const fields = useMemo(() => (tpl?.fields || []).filter((f) => !f.hidden), [tpl]);
  const filled = fields.filter((f) => String(vals[f.key] ?? '').trim() !== '');

  const check = () => {
    const errs = {};
    fields.forEach((f) => {
      const v = String(vals[f.key] ?? '').trim();
      if (v === '') return;
      if (!NUM.test(v)) errs[f.key] = `${f.label}: enter a number, like 42.5`;
      else if (Number(v) <= 0) errs[f.key] = `${f.label}: must be more than 0`;
    });
    if (!filled.length) errs._none = 'Enter at least one measurement';
    setErrors(errs);
    setMessage(Object.keys(errs).length ? 'Please fix the highlighted measurements.' : '');
    return !Object.keys(errs).length;
  };

  const save = async () => {
    setSaving(true); setMessage('');
    try {
      const clean = Object.fromEntries(filled.map((f) => [f.key, String(vals[f.key]).trim()]));
      const r = await heritApi.measurements.create({
        customer_id: customerId, template_key: tkey, unit, vals: clean,
        fit_preference: fit || null, notes, taken_at: takenAt, request_key: requestKey,
      });
      setResult(r);
      setRequestKey(newRequestKey());
    } catch (e) {
      if (e.data?.errors) {
        const errs = {};
        Object.entries(e.data.errors).forEach(([k, msg]) => { errs[k] = `${fields.find((f) => f.key === k)?.label || k}: ${msg}`; });
        setErrors(errs);
        setReview(false);
      }
      setMessage(e.message || 'The measurements were not saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading') return <div className="py-4 text-center"><Spinner role="status" /></div>;
  if (state === 'error') return <LoadError what="measurement templates" error={loadErr} onRetry={() => { setState('loading'); load(); }} />;

  if (result) {
    const warn = Object.entries(result.warnings || {});
    return (
      <div>
        <Alert variant="success" role="status">
          {result.duplicate ? 'These measurements were already saved.' : result.set.status === 'approved'
            ? 'Measurements saved and approved.' : 'Measurements saved. The owner needs to approve them before they are used on a job.'}
        </Alert>
        {warn.length > 0 && (
          <Alert variant="warning">
            <div className="fw-semibold mb-1">Please double-check these values:</div>
            <ul className="mb-1 ps-3">{warn.map(([k, m]) => <li key={k}>{fields.find((f) => f.key === k)?.label || k}: {m}</li>)}</ul>
            <div className="small">If one is wrong, take a new set. Saved values are never changed.</div>
          </Alert>
        )}
        <Button variant="primary" onClick={() => onSaved?.(result.set)}>Done</Button>
      </div>
    );
  }

  if (review) {
    return (
      <div>
        <ErrorSummary message={message} />
        <h2 className="h5">Check before saving</h2>
        <p className="mb-2">{clientName} · {tpl?.label} · taken {fmtDate(takenAt)}</p>
        <p className="fw-semibold">All values in {unit === 'cm' ? 'centimetres (cm)' : 'inches (in)'}</p>
        <dl className="hd-dl mb-3">
          {fields.map((f) => (
            <FragmentRow key={f.key} label={f.label} value={String(vals[f.key] ?? '').trim()} unit={unit} />
          ))}
          {fit && <><dt>Fit</dt><dd className="text-capitalize">{fit}</dd></>}
        </dl>
        {notes && <p className="small">Notes: {notes}</p>}
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={() => setReview(false)} disabled={saving}>Change</Button>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? <><Spinner size="sm" className="me-1" /> Saving</> : 'Save measurements'}</Button>
        </div>
      </div>
    );
  }

  return (
    <Form noValidate onSubmit={(e) => { e.preventDefault(); if (check()) setReview(true); }}>
      <ErrorSummary message={message} errors={message ? Object.fromEntries(Object.entries(errors).filter(([k]) => k !== '_none')) : {}} />
      {errors._none && message && <div className="text-danger mb-2">{errors._none}</div>}
      <Row className="g-3 mb-3">
        <Col xs={12} md={6}>
          <Form.Group controlId="ms-template">
            <Form.Label>Garment template</Form.Label>
            <Form.Select value={tkey} onChange={(e) => setTkey(e.target.value)}>
              {templates.map((t) => <option key={t.tkey} value={t.tkey}>{t.label}{t.proposed ? ' (proposed)' : ''}</option>)}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12} md={6}>
          <fieldset>
            <legend className="form-label fs-6 mb-1">Unit</legend>
            <ToggleButtonGroup type="radio" name="ms-unit" value={unit} onChange={setUnit} className="w-100">
              <ToggleButton id="ms-unit-cm" value="cm" variant="outline-secondary">Centimetres (cm)</ToggleButton>
              <ToggleButton id="ms-unit-in" value="in" variant="outline-secondary">Inches (in)</ToggleButton>
            </ToggleButtonGroup>
          </fieldset>
        </Col>
      </Row>
      <p className="text-muted small">Leave a field empty if you did not take it. Empty stays empty, never zero.</p>
      <Row className="g-3 hd-measure">
        {fields.map((f) => (
          <Col xs={12} sm={6} lg={4} key={f.key}>
            <Form.Group controlId={`ms-${f.key}`}>
              <Form.Label>{f.label}</Form.Label>
              <InputGroup hasValidation>
                <Form.Control
                  inputMode="decimal" autoComplete="off" enterKeyHint="next"
                  value={vals[f.key] ?? ''} isInvalid={!!errors[f.key]}
                  aria-describedby={f.guide ? `ms-${f.key}-help` : undefined}
                  onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value.replace(',', '.') }))}
                />
                <InputGroup.Text aria-label={unit === 'cm' ? 'centimetres' : 'inches'}>{UNIT_LABEL[unit]}</InputGroup.Text>
                <Form.Control.Feedback type="invalid">{errors[f.key]}</Form.Control.Feedback>
              </InputGroup>
              {f.guide && <Form.Text id={`ms-${f.key}-help`}>{f.guide}</Form.Text>}
            </Form.Group>
          </Col>
        ))}
      </Row>
      <Row className="g-3 mt-1">
        <Col xs={12} md={4}>
          <Form.Group controlId="ms-fit">
            <Form.Label>Fit preference</Form.Label>
            <Form.Select value={fit} onChange={(e) => setFit(e.target.value)}>
              <option value="">Not stated</option>
              <option value="slim">Slim</option>
              <option value="regular">Regular</option>
              <option value="relaxed">Relaxed</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12} md={4}>
          <Form.Group controlId="ms-taken">
            <Form.Label>Date taken</Form.Label>
            <Form.Control type="date" value={takenAt} max={lagosToday()} onChange={(e) => setTakenAt(e.target.value)} />
          </Form.Group>
        </Col>
        <Col xs={12} md={4}>
          <Form.Group controlId="ms-notes">
            <Form.Label>Notes</Form.Label>
            <Form.Control value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
          </Form.Group>
        </Col>
      </Row>
      <div className="d-flex gap-2 mt-3">
        {onCancel && <Button variant="outline-secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="primary">Review</Button>
      </div>
    </Form>
  );
};

const FragmentRow = ({ label, value, unit }) => (
  <>
    <dt>{label}</dt>
    <dd>{value ? `${value} ${unit}` : <span className="text-muted fw-normal">not taken</span>}</dd>
  </>
);

export default MeasurementSetForm;
