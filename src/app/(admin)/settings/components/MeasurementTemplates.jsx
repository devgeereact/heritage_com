import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import LoadError from '@/components/herit/LoadError';
import SaveState from '@/components/herit/SaveState';
import StatusChip from '@/components/herit/StatusChip';

const keyOf = (label) => String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'f_$1').slice(0, 40);

/**
 * Measurement templates (owner). Labels and guides can change; a field already
 * used by saved measurements cannot be removed or renamed, only hidden.
 */
const MeasurementTemplates = () => {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [edit, setEdit] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [save, setSave] = useState({ state: null, error: '' });

  const load = useCallback(async () => {
    setError(null);
    try { setList((await heritApi.measurements.templates(true)).filter((t) => t.tkey !== 'legacy')); } catch (e) { setError(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (t) => { setIsNew(!t); setSave({ state: null, error: '' }); setEdit(t ? JSON.parse(JSON.stringify(t)) : { tkey: '', label: '', fields: [{ key: '', label: '', guide: '' }], active: 1, proposed: 0 }); };
  const setField = (i, k, v) => setEdit((t) => ({ ...t, fields: t.fields.map((f, n) => (n === i ? { ...f, [k]: v, ...(k === 'label' && f.__new ? { key: keyOf(v) } : {}) } : f)) }));

  const submit = async (e) => {
    e.preventDefault();
    const fields = edit.fields.filter((f) => f.label.trim()).map(({ __new, ...f }) => ({ ...f, key: f.key || keyOf(f.label) }));
    const tkey = isNew ? keyOf(edit.tkey || edit.label) : edit.tkey;
    if (!edit.label.trim() || !fields.length) { setSave({ state: 'failed', error: 'Give the template a name and at least one field' }); return; }
    setSave({ state: 'saving', error: '' });
    try {
      await heritApi.measurements.templateSave({ tkey, label: edit.label, fields, active: edit.active ? 1 : 0, proposed: edit.proposed ? 1 : 0 });
      setSave({ state: 'saved', error: '' }); setEdit(null); load();
    } catch (err) { setSave({ state: 'failed', error: err.message }); }
  };

  if (error) return <LoadError what="measurement templates" error={error} onRetry={load} />;
  if (!list) return <div className="py-4 text-center"><Spinner role="status" /></div>;

  return (
    <Card className="hd-card mb-3">
      <Card.Body>
        <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
          <h2 className="h5 mb-0">Measurement templates</h2>
          {!edit && <Button variant="outline-secondary" onClick={() => open(null)}>Add template</Button>}
        </div>
        {!edit && list.map((t) => (
          <div key={t.tkey} className="hd-row px-0">
            <span className="hd-row-main">
              <span className="hd-row-title d-block">{t.label}</span>
              <span className="hd-row-sub d-block">{t.fields.filter((f) => !f.hidden).map((f) => f.label).join(', ')}</span>
            </span>
            {t.proposed ? <StatusChip tone="warn">Proposed</StatusChip> : null}
            {!t.active ? <StatusChip tone="neutral">Hidden</StatusChip> : null}
            <Button size="sm" variant="outline-secondary" onClick={() => open(t)}>Edit</Button>
          </div>
        ))}
        {edit && (
          <Form onSubmit={submit} noValidate>
            <Row className="g-3 mb-2">
              <Col xs={12} md={6}>
                <Form.Group controlId="tpl-label"><Form.Label>Template name</Form.Label><Form.Control value={edit.label} onChange={(e) => setEdit((t) => ({ ...t, label: e.target.value }))} maxLength={80} /></Form.Group>
              </Col>
              <Col xs={12} md={6} className="d-flex flex-column justify-content-end">
                <Form.Check type="checkbox" id="tpl-active" label="Show when taking measurements" checked={!!edit.active} onChange={(e) => setEdit((t) => ({ ...t, active: e.target.checked }))} />
                <Form.Check type="checkbox" id="tpl-proposed" label="Still a proposal (not yet agreed)" checked={!!edit.proposed} onChange={(e) => setEdit((t) => ({ ...t, proposed: e.target.checked }))} />
              </Col>
            </Row>
            <h3 className="h6 mt-3">Fields, in the order you measure</h3>
            {edit.fields.map((f, i) => (
              <Row key={i} className="g-2 mb-2 align-items-end border-bottom pb-2">
                <Col xs={12} md={4}><Form.Group controlId={`tpl-f-${i}`}><Form.Label>Field {i + 1}</Form.Label><Form.Control value={f.label} onChange={(e) => setField(i, 'label', e.target.value)} maxLength={60} /></Form.Group></Col>
                <Col xs={12} md={5}><Form.Group controlId={`tpl-g-${i}`}><Form.Label>How to measure</Form.Label><Form.Control value={f.guide || ''} onChange={(e) => setField(i, 'guide', e.target.value)} maxLength={300} /></Form.Group></Col>
                <Col xs={12} md={3}>
                  <Form.Check type="checkbox" id={`tpl-h-${i}`} label="Hide" checked={!!f.hidden} onChange={(e) => setField(i, 'hidden', e.target.checked)} />
                  {f.__new && <Button variant="link" className="px-0" onClick={() => setEdit((t) => ({ ...t, fields: t.fields.filter((_, n) => n !== i) }))}>Remove</Button>}
                </Col>
              </Row>
            ))}
            <Button variant="link" className="px-0" onClick={() => setEdit((t) => ({ ...t, fields: [...t.fields, { key: '', label: '', guide: '', __new: true }] }))}>Add a field</Button>
            {!isNew && <Alert variant="light" className="small mt-2 mb-2">Fields already used by saved measurements cannot be removed. Hide them instead.</Alert>}
            <div className="d-flex align-items-center gap-2 mt-2">
              <Button type="submit" variant="outline-secondary" disabled={save.state === 'saving'}>Save template</Button>
              <Button variant="link" onClick={() => setEdit(null)}>Cancel</Button>
              <SaveState state={save.state} error={save.error} />
            </div>
          </Form>
        )}
      </Card.Body>
    </Card>
  );
};

export default MeasurementTemplates;
