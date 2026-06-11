import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Row, Col, Button, Spinner, Table } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const CHANNELS = ['web', 'whatsapp', 'market', 'instagram', 'phone'];
const PAYMENTS = ['unpaid', 'cash', 'transfer', 'card', 'cod'];
const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const empty = { customer: '', phone: '', channel: 'web', payment_method: 'unpaid', ship_address: '', notes: '' };

const NewOrderModal = ({ show, onHide, onCreated }) => {
  const [form, setForm] = useState(empty);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]); // variants for the selected product
  const [selProduct, setSelProduct] = useState('');
  const [selVariant, setSelVariant] = useState('');
  const [qty, setQty] = useState(1);
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotificationContext();

  useEffect(() => {
    if (show) {
      setForm(empty); setLines([]); setSelProduct(''); setSelVariant(''); setVariants([]); setQty(1);
      heritApi.products.list().then((p) => setProducts(Array.isArray(p) ? p : [])).catch(() => setProducts([]));
    }
  }, [show]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickProduct = async (e) => {
    const pid = e.target.value;
    setSelProduct(pid); setSelVariant(''); setVariants([]);
    if (!pid) return;
    try {
      const full = await heritApi.products.get(pid);
      setVariants(full.variants || []);
    } catch { /* offline */ }
  };

  const selectedProduct = products.find((p) => String(p.id) === String(selProduct));

  const addLine = () => {
    if (!selProduct || !selVariant) { showNotification({ message: 'Pick a product and variant', variant: 'danger' }); return; }
    const v = variants.find((x) => String(x.id) === String(selVariant));
    if (!v) return;
    const unit = Number(v.price_override ?? selectedProduct?.base_price ?? 0);
    const label = `${selectedProduct?.name} — ${v.size || ''}${v.color ? ' / ' + v.color : ''}`.trim();
    setLines((ls) => [...ls, { variant_id: v.id, sku: v.sku, label, qty: Math.max(1, Number(qty) || 1), unit_price: unit }]);
    setSelVariant(''); setQty(1);
  };

  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));
  const total = useMemo(() => lines.reduce((a, l) => a + l.qty * l.unit_price, 0), [lines]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer.trim()) { showNotification({ message: 'Customer name is required', variant: 'danger' }); return; }
    if (!lines.length) { showNotification({ message: 'Add at least one item', variant: 'danger' }); return; }
    setSaving(true);
    try {
      const res = await heritApi.orders.create({ ...form, items: lines });
      showNotification({ message: `Order ${res.code} created — ${naira(res.total)}`, variant: 'success' });
      onCreated?.();
      onHide();
    } catch (err) {
      showNotification({ message: err.message || 'Could not create order', variant: 'danger' });
    } finally { setSaving(false); }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title>New order</Modal.Title></Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Customer name *</Form.Label>
              <Form.Control value={form.customer} onChange={set('customer')} placeholder="Buyer's name" />
            </Col>
            <Col md={6}>
              <Form.Label>Phone / WhatsApp</Form.Label>
              <Form.Control value={form.phone} onChange={set('phone')} placeholder="+234..." />
            </Col>
            <Col md={4}>
              <Form.Label>Channel</Form.Label>
              <Form.Select value={form.channel} onChange={set('channel')} className="text-capitalize">
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Payment</Form.Label>
              <Form.Select value={form.payment_method} onChange={set('payment_method')} className="text-capitalize">
                {PAYMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Shipping address</Form.Label>
              <Form.Control value={form.ship_address} onChange={set('ship_address')} placeholder="Optional" />
            </Col>

            <Col xs={12}><hr className="my-1" /><Form.Label className="fw-semibold">Items</Form.Label></Col>
            <Col md={5}>
              <Form.Select value={selProduct} onChange={pickProduct}>
                <option value="">Pick a product…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Select value={selVariant} onChange={(e) => setSelVariant(e.target.value)} disabled={!variants.length}>
                <option value="">Size / colour…</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {[v.size, v.color].filter(Boolean).join(' / ')} · stock {v.stock}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Control type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </Col>
            <Col md={1}>
              <Button type="button" variant="light" onClick={addLine} className="w-100"><IconifyIcon icon="solar:add-circle-bold" /></Button>
            </Col>

            {lines.length > 0 && (
              <Col xs={12}>
                <Table size="sm" className="mb-0 align-middle">
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={i}>
                        <td>{l.label}</td>
                        <td className="text-muted small">{l.qty} × {naira(l.unit_price)}</td>
                        <td className="text-end">{naira(l.qty * l.unit_price)}</td>
                        <td className="text-end" style={{ width: 36 }}>
                          <Button size="sm" variant="link" className="text-danger p-0" onClick={() => removeLine(i)}>
                            <IconifyIcon icon="solar:trash-bin-trash-bold" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-top">
                      <td colSpan={2} className="fw-bold">Total</td>
                      <td className="text-end fw-bold" colSpan={2}>{naira(total)}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? <Spinner size="sm" /> : 'Create order'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default NewOrderModal;
