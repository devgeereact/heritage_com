import { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';

// Each move type maps to an API reason and a direction. "count" is an absolute
// stock-take (set), everything else is a signed delta (adjust).
const MOVES = [
  { key: 'received', label: 'Goods received', icon: 'solar:box-bold', dir: +1, mode: 'adjust' },
  { key: 'return', label: 'Customer return', icon: 'solar:restart-bold', dir: +1, mode: 'adjust' },
  { key: 'damage', label: 'Damage / loss', icon: 'solar:trash-bin-trash-bold', dir: -1, mode: 'adjust' },
  { key: 'count', label: 'Stock-take (set count)', icon: 'solar:clipboard-check-bold', dir: 0, mode: 'set' },
];

const AdjustStockModal = ({ variant, onClose, onDone }) => {
  const [move, setMove] = useState('received');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (variant) { setMove('received'); setQty(1); setNote(''); setError(''); }
  }, [variant]);

  if (!variant) return null;

  const selected = MOVES.find((m) => m.key === move);
  const isSet = selected.mode === 'set';
  const projected = isSet
    ? Math.max(0, Number(qty) || 0)
    : Math.max(0, variant.stock + selected.dir * (Number(qty) || 0));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 0) { setError('Enter a valid quantity.'); return; }
    if (!isSet && n <= 0) { setError('Quantity must be at least 1.'); return; }
    setBusy(true);
    try {
      if (isSet) {
        await heritApi.inventory.setCount(variant.id, n, note || null);
      } else {
        await heritApi.inventory.adjust(variant.id, selected.dir * n, selected.key, note || null);
      }
      onDone();
    } catch (err) {
      setError(err.message || 'Could not save. Check the stock endpoint is live.');
      setBusy(false);
    }
  };

  return (
    <Modal show={!!variant} onHide={onClose} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Adjust stock</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <div className="fw-semibold">{variant.product_name}</div>
            <div className="text-muted small">
              {variant.sku} · {variant.size || 'OS'} / {variant.color || 'Default'} ·
              <span className="ms-1">on hand: <strong>{variant.stock}</strong></span>
            </div>
          </div>

          {error && <Alert variant="danger" className="py-2">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>Movement</Form.Label>
            <div className="d-grid gap-2">
              {MOVES.map((m) => (
                <button
                  type="button"
                  key={m.key}
                  className={`btn text-start d-flex align-items-center gap-2 ${move === m.key ? 'btn-primary' : 'btn-light'}`}
                  onClick={() => setMove(m.key)}
                >
                  <IconifyIcon icon={m.icon} /> {m.label}
                  {m.dir !== 0 && <span className="ms-auto badge bg-dark">{m.dir > 0 ? '+ adds' : '− removes'}</span>}
                </button>
              ))}
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{isSet ? 'New counted quantity' : 'Quantity'}</Form.Label>
            <Form.Control
              type="number" min={0} value={qty}
              onChange={(e) => setQty(e.target.value)} autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Note <span className="text-muted">(optional)</span></Form.Label>
            <Form.Control
              type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={isSet ? 'e.g. quarterly count' : 'e.g. PO from Ajuwon supplier'}
            />
          </Form.Group>

          <div className="bg-light rounded p-2 d-flex justify-content-between align-items-center">
            <span className="text-muted small">Stock after this move</span>
            <span className="fs-5 fw-bold">{projected}</span>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? <><Spinner size="sm" className="me-1" /> Saving…</> : 'Save movement'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AdjustStockModal;
