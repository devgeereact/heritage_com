import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Row, Col, Button, Spinner, Badge } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const empty = { name: '', category: '', fabric: '', base_price: '', description: '' };

const NewProductModal = ({ show, onHide, onCreated }) => {
  const [form, setForm] = useState(empty);
  const [sizes, setSizes] = useState(['S', 'M', 'L']);
  const [colorInput, setColorInput] = useState('');
  const [colors, setColors] = useState([]);
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotificationContext();

  useEffect(() => {
    if (show) { setForm(empty); setSizes(['S', 'M', 'L']); setColors([]); setColorInput(''); }
  }, [show]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleSize = (s) => setSizes((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));

  const addColor = () => {
    const c = colorInput.trim();
    if (c && !colors.includes(c)) setColors((arr) => [...arr, c]);
    setColorInput('');
  };
  const removeColor = (c) => setColors((arr) => arr.filter((x) => x !== c));

  const variantCount = useMemo(
    () => Math.max(sizes.length, 1) * Math.max(colors.length, 1),
    [sizes, colors]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showNotification({ message: 'Product name is required', variant: 'danger' });
      return;
    }
    setSaving(true);
    try {
      const res = await heritApi.products.create({
        ...form,
        base_price: Number(form.base_price) || 0,
        sizes,
        colors,
      });
      showNotification({ message: `Created ${res.code} with ${res.variants} variants`, variant: 'success' });
      onCreated?.();
      onHide();
    } catch (err) {
      showNotification({ message: err.message || 'Could not create product', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>New product</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={8}>
              <Form.Label>Name *</Form.Label>
              <Form.Control value={form.name} onChange={set('name')} placeholder="e.g. Heritage Ankara Shirt" />
            </Col>
            <Col md={4}>
              <Form.Label>Base price (₦)</Form.Label>
              <Form.Control type="number" min="0" value={form.base_price} onChange={set('base_price')} />
            </Col>
            <Col md={6}>
              <Form.Label>Category</Form.Label>
              <Form.Control value={form.category} onChange={set('category')} placeholder="Shirts, Agbada, Accessories..." />
            </Col>
            <Col md={6}>
              <Form.Label>Fabric / print</Form.Label>
              <Form.Control value={form.fabric} onChange={set('fabric')} placeholder="Ankara, Adire, Aso-oke..." />
            </Col>
            <Col xs={12}>
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.description} onChange={set('description')} />
            </Col>

            <Col xs={12}><hr className="my-1" /></Col>

            <Col md={6}>
              <Form.Label>Sizes</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <Button
                    key={s} type="button" size="sm"
                    variant={sizes.includes(s) ? 'primary' : 'outline-secondary'}
                    onClick={() => toggleSize(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </Col>
            <Col md={6}>
              <Form.Label>Colours</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColor(); } }}
                  placeholder="Type a colour, press Enter"
                />
                <Button type="button" variant="light" onClick={addColor}>Add</Button>
              </div>
              <div className="d-flex flex-wrap gap-1 mt-2">
                {colors.map((c) => (
                  <Badge key={c} bg="secondary" role="button" onClick={() => removeColor(c)}>
                    {c} ✕
                  </Badge>
                ))}
              </div>
            </Col>

            <Col xs={12}>
              <div className="alert alert-light border mb-0 mt-2">
                This builds <strong>{variantCount}</strong> variant{variantCount === 1 ? '' : 's'} (size × colour),
                each with its own SKU. Stock starts at 0 — set it on the product page.
              </div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? <Spinner size="sm" /> : 'Create product'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default NewProductModal;
