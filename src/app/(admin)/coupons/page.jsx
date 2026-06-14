import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Table, Button, Spinner, Alert, Badge, Form, Modal, Row, Col, InputGroup } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const TYPES = [
  { key: 'percent', label: '% off' },
  { key: 'fixed', label: '₦ off' },
  { key: 'free_ship', label: 'Free shipping' },
];
const EMPTY = { code: '', type: 'percent', value: '', min_spend: '', usage_limit: '', starts_at: '', expires_at: '', active: true, description: '' };

const valueLabel = (c) => {
  if (c.type === 'percent') return `${Number(c.value)}%`;
  if (c.type === 'fixed') return naira(c.value);
  return 'Free ship';
};

const CouponModal = ({ show, onHide, editing, onSaved }) => {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotificationContext();

  useEffect(() => {
    if (show) setForm(editing ? {
      code: editing.code, type: editing.type, value: editing.value ?? '', min_spend: editing.min_spend ?? '',
      usage_limit: editing.usage_limit ?? '', starts_at: editing.starts_at || '', expires_at: editing.expires_at || '',
      active: !!Number(editing.active), description: editing.description || '',
    } : EMPTY);
  }, [show, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) { showNotification({ message: 'Code is required', variant: 'danger' }); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: Number(form.value) || 0,
        min_spend: Number(form.min_spend) || 0,
        usage_limit: Number(form.usage_limit) || 0,
        active: form.active ? 1 : 0,
      };
      if (editing) await heritApi.coupons.update(editing.id, payload);
      else await heritApi.coupons.create(payload);
      showNotification({ message: `Coupon ${form.code.toUpperCase()} saved`, variant: 'success' });
      onSaved();
      onHide();
    } catch (err) {
      showNotification({ message: err.message || 'Could not save coupon', variant: 'danger' });
    } finally { setSaving(false); }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title>{editing ? 'Edit coupon' : 'New coupon'}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col xs={7}>
              <Form.Label>Code *</Form.Label>
              <Form.Control value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="HERIT10" />
            </Col>
            <Col xs={5}>
              <Form.Label>Type</Form.Label>
              <Form.Select value={form.type} onChange={set('type')}>
                {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </Form.Select>
            </Col>
            {form.type !== 'free_ship' && (
              <Col xs={6}>
                <Form.Label>{form.type === 'percent' ? 'Percent off' : 'Amount off (₦)'}</Form.Label>
                <Form.Control type="number" min="0" value={form.value} onChange={set('value')} />
              </Col>
            )}
            <Col xs={6}>
              <Form.Label>Min spend (₦)</Form.Label>
              <Form.Control type="number" min="0" value={form.min_spend} onChange={set('min_spend')} />
            </Col>
            <Col xs={6}>
              <Form.Label>Usage limit (0 = ∞)</Form.Label>
              <Form.Control type="number" min="0" value={form.usage_limit} onChange={set('usage_limit')} />
            </Col>
            <Col xs={6}>
              <Form.Label>Starts</Form.Label>
              <Form.Control type="date" value={form.starts_at} onChange={set('starts_at')} />
            </Col>
            <Col xs={6}>
              <Form.Label>Expires</Form.Label>
              <Form.Control type="date" value={form.expires_at} onChange={set('expires_at')} />
            </Col>
            <Col xs={12}>
              <Form.Label>Description</Form.Label>
              <Form.Control value={form.description} onChange={set('description')} placeholder="Welcome offer — 10% off first order" />
            </Col>
            <Col xs={12}>
              <Form.Check type="switch" id="cpn-active" label="Active" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? <Spinner size="sm" /> : 'Save coupon'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

const CouponsPage = () => {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try { setRows(await heritApi.coupons.list()); setState('ready'); }
    catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (c) => {
    const active = !Number(c.active);
    setRows((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: active ? 1 : 0 } : x)));
    try { await heritApi.coupons.toggle(c.id, active ? 1 : 0); }
    catch (e) { showNotification({ message: e.message || 'Could not update', variant: 'danger' }); load(); }
  };
  const remove = async (c) => {
    if (!window.confirm(`Delete ${c.code}? This cannot be undone.`)) return;
    try { await heritApi.coupons.remove(c.id); showNotification({ message: `${c.code} deleted`, variant: 'success' }); load(); }
    catch (e) { showNotification({ message: e.message || 'Could not delete', variant: 'danger' }); }
  };
  const copy = (code) => { navigator.clipboard?.writeText(code); showNotification({ message: `Copied ${code}`, variant: 'success' }); };
  const openNew = () => { setEditing(null); setShow(true); };
  const openEdit = (c) => { setEditing(c); setShow(true); };

  return (
    <>
      <PageTItle title="Coupons" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Coupons &amp; Promotions</h4>
          <p className="text-muted mb-0">Discount codes that work at storefront checkout.</p>
        </div>
        <Button variant="primary" onClick={openNew}><IconifyIcon icon="solar:add-circle-bold" className="me-1" /> New coupon</Button>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && (
        <Alert variant="warning">
          <strong>Coupons offline.</strong> Upload <code>php-api/coupons.php</code> + the updated <code>_lib.php</code>/<code>store.php</code>,
          and import <code>schema_phase5.sql</code> (seeds <code>HERIT10</code>).
        </Alert>
      )}

      {state === 'ready' && (
        <Card>
          <CardBody className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr><th>Code</th><th>Discount</th><th>Min spend</th><th>Used</th><th className="text-end">Saved</th><th>Window</th><th>Active</th><th></th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-4">No coupons yet. Create one — try a welcome offer.</td></tr>}
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="fw-semibold" role="button" onClick={() => copy(c.code)} title="Copy">{c.code} <IconifyIcon icon="solar:copy-linear" className="text-muted" /></span>
                      {c.description && <div className="text-muted small">{c.description}</div>}
                    </td>
                    <td><Badge bg="primary" className="bg-opacity-75">{valueLabel(c)}</Badge></td>
                    <td>{Number(c.min_spend) > 0 ? naira(c.min_spend) : '—'}</td>
                    <td>{c.used}{Number(c.usage_limit) > 0 ? ` / ${c.usage_limit}` : ''}</td>
                    <td className="text-end">{naira(c.total_discount)}</td>
                    <td className="small text-muted">{c.starts_at || '—'}{(c.starts_at || c.expires_at) ? ' → ' : ''}{c.expires_at || (c.starts_at ? '∞' : '—')}</td>
                    <td><Form.Check type="switch" checked={!!Number(c.active)} onChange={() => toggle(c)} /></td>
                    <td className="text-end">
                      <Button size="sm" variant="light" onClick={() => openEdit(c)}><IconifyIcon icon="solar:pen-2-linear" /></Button>{' '}
                      <Button size="sm" variant="light" className="text-danger" onClick={() => remove(c)}><IconifyIcon icon="solar:trash-bin-trash-linear" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <CouponModal show={show} onHide={() => setShow(false)} editing={editing} onSaved={load} />
    </>
  );
};

export default CouponsPage;
