import { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col, Table } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

/**
 * Create a purchase order. Lines can be linked to a stock variant (so receiving
 * the PO bumps that variant's stock) or left as free-text.
 */
const NewPOModal = ({ show, onClose, onDone, suppliers }) => {
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [variants, setVariants] = useState([]);
  const [lines, setLines] = useState([{ variant_id: '', label: '', sku: '', qty: 1, unit_cost: 0 }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show) return;
    setSupplierId(''); setNotes(''); setError('');
    setLines([{ variant_id: '', label: '', sku: '', qty: 1, unit_cost: 0 }]);
    heritApi.inventory.list().then((r) => setVariants(r.variants || [])).catch(() => setVariants([]));
  }, [show]);

  const setLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const pickVariant = (i, vid) => {
    const v = variants.find((x) => String(x.id) === String(vid));
    if (v) setLine(i, { variant_id: vid, label: `${v.product_name} — ${v.size || 'OS'} / ${v.color || 'Default'}`, sku: v.sku });
    else setLine(i, { variant_id: '' });
  };
  const addLine = () => setLines((ls) => [...ls, { variant_id: '', label: '', sku: '', qty: 1, unit_cost: 0 }]);
  const rmLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, l) => s + Math.max(1, Number(l.qty) || 0) * (Number(l.unit_cost) || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    const clean = lines.filter((l) => l.label.trim() || l.variant_id);
    if (!supplierId) { setError('Choose a supplier.'); return; }
    if (!clean.length) { setError('Add at least one line.'); return; }
    setBusy(true); setError('');
    try {
      await heritApi.suppliers.poCreate({ supplier_id: supplierId, notes, items: clean });
      onDone();
    } catch (err) { setError(err.message || 'Could not save.'); setBusy(false); }
  };

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title className="fs-5">New purchase order</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          <Row className="g-2 mb-3">
            <Col md={6}>
              <Form.Label>Supplier</Form.Label>
              <Form.Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Choose a supplier…</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Notes</Form.Label>
              <Form.Control value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
            </Col>
          </Row>

          <Table size="sm" className="align-middle">
            <thead className="table-light">
              <tr><th style={{ minWidth: 200 }}>Item</th><th>Qty</th><th>Unit cost</th><th></th></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <Form.Select size="sm" className="mb-1" value={l.variant_id} onChange={(e) => pickVariant(i, e.target.value)}>
                      <option value="">— free text / no stock link —</option>
                      {variants.map((v) => <option key={v.id} value={v.id}>{v.product_name} · {v.size || 'OS'}/{v.color || 'Default'} ({v.stock})</option>)}
                    </Form.Select>
                    <Form.Control size="sm" placeholder="Label" value={l.label} onChange={(e) => setLine(i, { label: e.target.value })} />
                  </td>
                  <td><Form.Control size="sm" type="number" min={1} style={{ width: 70 }} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} /></td>
                  <td><Form.Control size="sm" type="number" min={0} style={{ width: 100 }} value={l.unit_cost} onChange={(e) => setLine(i, { unit_cost: e.target.value })} /></td>
                  <td>{lines.length > 1 && <Button size="sm" variant="link" className="text-danger p-0" onClick={() => rmLine(i)}><IconifyIcon icon="solar:trash-bin-trash-bold" /></Button>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Button size="sm" variant="light" onClick={addLine}><IconifyIcon icon="solar:add-circle-linear" className="me-1" /> Add line</Button>
          <div className="text-end fs-5 fw-bold mt-2">Total: {naira(total)}</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? <><Spinner size="sm" /> Saving…</> : 'Create order'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default NewPOModal;
