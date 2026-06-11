import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Row, Col, Button, Spinner, Badge } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
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
  const [aiBusy, setAiBusy] = useState(false);
  const { showNotification } = useNotificationContext();

  useEffect(() => {
    if (show) { setForm(empty); setSizes(['S', 'M', 'L']); setColors([]); setColorInput(''); }
  }, [show]);

  const writeWithAI = async () => {
    if (!form.name.trim()) {
      showNotification({ message: 'Add a product name first', variant: 'danger' });
      return;
    }
    setAiBusy(true);
    try {
      const prompt = `Write a short, warm product description (2-3 sentences, UK English, no marketing cliches) for a Herit Clothing piece.\n`
        + `Name: ${form.name}\nCategory: ${form.category || 'menswear'}\nFabric/print: ${form.fabric || 'African heritage fabric'}.\n`
        + `Mention the fabric and that it celebrates African heritage. Plain, no hype.`;
      const res = await heritApi.ai('product_description', prompt, { max_tokens: 200 });
      setForm((f) => ({ ...f, description: (res.text || '').trim() }));
    } catch (e) {
      showNotification({ message: e.message || 'AI is not available right now', variant: 'danger' });
    } finally {
      setAiBusy(false);
    }
  };

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
              <div className="d-flex justify-content-between align-items-center">
                <Form.Label className="mb-0">Description</Form.Label>
                <Button type="button" size="sm" variant="outline-primary" onClick={writeWithAI} disabled={aiBusy}>
                  {aiBusy ? <Spinner size="sm" /> : <IconifyIcon icon="solar:magic-stick-3-bold" />} Write with AI
                </Button>
              </div>
              <Form.Control as="textarea" rows={3} className="mt-1" value={form.description} onChange={set('description')}
                placeholder="A short description, or let AI draft one from the name and fabric." />
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
