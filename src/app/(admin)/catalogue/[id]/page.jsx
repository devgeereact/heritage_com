import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card, CardBody, Table, Badge, Button, Spinner, Alert, Form, Dropdown } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const STATUSES = ['draft', 'active', 'archived'];
const statusVariant = (s) => (s === 'active' ? 'success' : s === 'draft' ? 'warning' : 'secondary');

const StockCell = ({ variant, onSaved }) => {
  const [val, setVal] = useState(String(variant.stock));
  const [busy, setBusy] = useState(false);
  const { showNotification } = useNotificationContext();
  const dirty = String(variant.stock) !== val;

  const save = async () => {
    setBusy(true);
    try {
      await heritApi.products.setStock(variant.id, Number(val) || 0);
      onSaved(variant.id, Number(val) || 0);
    } catch (e) {
      showNotification({ message: e.message || 'Could not save stock', variant: 'danger' });
      setVal(String(variant.stock));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="d-flex gap-1" style={{ maxWidth: 130 }}>
      <Form.Control
        size="sm" type="number" min="0" value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => dirty && save()}
      />
      {dirty && (
        <Button size="sm" variant="primary" onClick={save} disabled={busy}>
          {busy ? <Spinner size="sm" /> : <IconifyIcon icon="solar:check-read-linear" />}
        </Button>
      )}
    </div>
  );
};

const EMPTY_EDIT = {
  name: '', category: '', fabric: '', base_price: '', cost_price: '', description: '', story: '', care: '', one_of_a_kind: false,
  slug: '', published: false, sf_priceUsd: '', sf_short: '', sf_tile: 'hc-tile-mixed', sf_type: '', sf_occasion: '',
};
const TILES = [['hc-tile-ankara', 'Ankara'], ['hc-tile-adire', 'Adire'], ['hc-tile-asooke', 'Aso-Oke'], ['hc-tile-mixed', 'Mixed']];
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
const safeJson = (s) => { try { return JSON.parse(s); } catch { return {}; } };

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [state, setState] = useState('loading');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try {
      const p = await heritApi.products.get(id);
      setProduct(p);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const startEdit = () => {
    let sf = {};
    try { sf = product.storefront ? (typeof product.storefront === 'string' ? JSON.parse(product.storefront) : product.storefront) : {}; } catch { sf = {}; }
    setForm({
      name: product.name || '', category: product.category || '', fabric: product.fabric || '',
      base_price: product.base_price ?? '', cost_price: product.cost_price ?? '',
      description: product.description || '', story: product.story || '', care: product.care || '',
      one_of_a_kind: !!Number(product.one_of_a_kind),
      slug: product.slug || slugify(product.name || ''), published: !!Number(product.published),
      sf_priceUsd: sf.priceUsd ?? '', sf_short: sf.short ?? '', sf_tile: sf.tile || 'hc-tile-mixed',
      sf_type: sf.type || product.category || '', sf_occasion: sf.occasion || '',
    });
    setEditing(true);
  };
  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const saveEdit = async () => {
    if (!form.name.trim()) { showNotification({ message: 'Name is required', variant: 'danger' }); return; }
    setSaving(true);
    try {
      const storefront = {
        ...(typeof product.storefront === 'string' ? safeJson(product.storefront) : (product.storefront || {})),
        priceUsd: Number(form.sf_priceUsd) || 0, short: form.sf_short, tile: form.sf_tile,
        type: form.sf_type, occasion: form.sf_occasion,
      };
      await heritApi.products.update(id, {
        ...form,
        base_price: Number(form.base_price) || 0,
        cost_price: Number(form.cost_price) || 0,
        one_of_a_kind: form.one_of_a_kind ? 1 : 0,
        image_url: product.image_url || '',
        slug: form.slug ? slugify(form.slug) : '',
        published: form.published ? 1 : 0,
        storefront,
      });
      setProduct((p) => ({ ...p, ...form, slug: form.slug ? slugify(form.slug) : p.slug, published: form.published ? 1 : 0, storefront, one_of_a_kind: form.one_of_a_kind ? 1 : 0 }));
      setEditing(false);
      showNotification({ message: 'Product saved', variant: 'success' });
    } catch (e) {
      showNotification({ message: e.message || 'Could not save', variant: 'danger' });
    } finally { setSaving(false); }
  };

  const onStockSaved = (variantId, stock) => {
    setProduct((p) => ({
      ...p,
      variants: p.variants.map((v) => (v.id === variantId ? { ...v, stock } : v)),
    }));
  };

  const setStatus = async (status) => {
    try {
      await heritApi.products.setStatus(id, status);
      setProduct((p) => ({ ...p, status }));
      showNotification({ message: `Status set to ${status}`, variant: 'success' });
    } catch (e) {
      showNotification({ message: e.message || 'Could not update status', variant: 'danger' });
    }
  };

  if (state === 'loading') return <div className="text-center py-5"><Spinner /></div>;
  if (state === 'error') {
    return (
      <Alert variant="warning">
        Could not load this product. The catalogue API may be offline, or it does not exist.{' '}
        <Link to="/catalogue">Back to the catalogue</Link>.
      </Alert>
    );
  }

  const totalStock = (product.variants || []).reduce((a, v) => a + Number(v.stock || 0), 0);

  return (
    <>
      <PageTitle title={product.name} />

      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <Link to="/catalogue" className="btn btn-sm btn-light">
          <IconifyIcon icon="solar:arrow-left-linear" /> Catalogue
        </Link>
        <h4 className="mb-0">{product.name}</h4>
        <span className="text-primary fw-semibold">{product.code}</span>
        <Dropdown>
          <Dropdown.Toggle size="sm" variant={statusVariant(product.status)} className="text-capitalize">
            {product.status}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {STATUSES.map((s) => (
              <Dropdown.Item key={s} active={s === product.status} className="text-capitalize" onClick={() => setStatus(s)}>
                {s}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
        {Number(product.one_of_a_kind) === 1 && (
          <Badge bg="dark" className="d-inline-flex align-items-center gap-1">
            <IconifyIcon icon="solar:crown-star-bold" /> One of a kind
          </Badge>
        )}
        {Number(product.published) === 1 && (
          <Badge bg="success" className="d-inline-flex align-items-center gap-1">
            <IconifyIcon icon="solar:shop-bold" /> On storefront
          </Badge>
        )}
        <div className="ms-auto">
          {!editing && (
            <Button size="sm" variant="outline-primary" onClick={startEdit}>
              <IconifyIcon icon="solar:pen-2-linear" className="me-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      <Row className="g-3">
        <Col lg={4}>
          <Card>
            <CardBody>
              <h5 className="card-title mb-3">Details</h5>
              {!editing ? (
                <>
                  <Detail label="Category" value={product.category || '—'} />
                  <Detail label="Fabric / print" value={product.fabric || '—'} />
                  <Detail label="Base price" value={naira(product.base_price)} />
                  <Detail label="Cost price" value={naira(product.cost_price)} />
                  <Detail label="Total stock" value={`${totalStock} across ${(product.variants || []).length} variants`} />
                  {product.description && (<><div className="text-muted small mt-2">Description</div><p className="mb-0">{product.description}</p></>)}
                  {product.story && (<><div className="text-muted small mt-2"><IconifyIcon icon="solar:book-bold" className="me-1" />The story in the cloth</div><p className="mb-0 fst-italic">{product.story}</p></>)}
                  {product.care && (<><div className="text-muted small mt-2"><IconifyIcon icon="solar:hand-heart-bold" className="me-1" />Care</div><p className="mb-0">{product.care}</p></>)}
                </>
              ) : (
                <div className="d-flex flex-column gap-2">
                  <Form.Group><Form.Label className="small mb-1">Name</Form.Label><Form.Control value={form.name} onChange={setF('name')} /></Form.Group>
                  <Row className="g-2">
                    <Col xs={6}><Form.Label className="small mb-1">Category</Form.Label><Form.Control value={form.category} onChange={setF('category')} /></Col>
                    <Col xs={6}><Form.Label className="small mb-1">Fabric / print</Form.Label><Form.Control value={form.fabric} onChange={setF('fabric')} /></Col>
                  </Row>
                  <Row className="g-2">
                    <Col xs={6}><Form.Label className="small mb-1">Base price (₦)</Form.Label><Form.Control type="number" min="0" value={form.base_price} onChange={setF('base_price')} /></Col>
                    <Col xs={6}><Form.Label className="small mb-1">Cost price (₦)</Form.Label><Form.Control type="number" min="0" value={form.cost_price} onChange={setF('cost_price')} /></Col>
                  </Row>
                  <Form.Check type="switch" id="ooak" label="One of a kind (auto-retires when it sells out)"
                    checked={form.one_of_a_kind} onChange={(e) => setForm((f) => ({ ...f, one_of_a_kind: e.target.checked }))} />
                  <Form.Group><Form.Label className="small mb-1">Description</Form.Label><Form.Control as="textarea" rows={2} value={form.description} onChange={setF('description')} /></Form.Group>
                  <Form.Group><Form.Label className="small mb-1">The story in the cloth</Form.Label><Form.Control as="textarea" rows={2} value={form.story} onChange={setF('story')} placeholder="Origin, meaning, who made it…" /></Form.Group>
                  <Form.Group><Form.Label className="small mb-1">Care instructions</Form.Label><Form.Control as="textarea" rows={2} value={form.care} onChange={setF('care')} placeholder="Hand-wash cold, dry in shade…" /></Form.Group>

                  <div className="border rounded p-2 mt-1" style={{ background: 'var(--bs-tertiary-bg)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small fw-semibold text-uppercase text-muted"><IconifyIcon icon="solar:shop-bold" className="me-1" />Storefront</span>
                      <Form.Check type="switch" id="pub" label="Published" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} />
                    </div>
                    <Form.Label className="small mb-1">Shop URL slug</Form.Label>
                    <Form.Control size="sm" className="mb-2" value={form.slug} onChange={setF('slug')} onBlur={() => setForm((f) => ({ ...f, slug: slugify(f.slug) }))} placeholder="heritage-ankara-shirt" />
                    <Row className="g-2">
                      <Col xs={6}><Form.Label className="small mb-1">USD price</Form.Label><Form.Control size="sm" type="number" min="0" value={form.sf_priceUsd} onChange={setF('sf_priceUsd')} /></Col>
                      <Col xs={6}>
                        <Form.Label className="small mb-1">Tile</Form.Label>
                        <Form.Select size="sm" value={form.sf_tile} onChange={setF('sf_tile')}>{TILES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Form.Select>
                      </Col>
                      <Col xs={6}><Form.Label className="small mb-1">Type</Form.Label><Form.Control size="sm" value={form.sf_type} onChange={setF('sf_type')} placeholder="Shirts / Sets…" /></Col>
                      <Col xs={6}><Form.Label className="small mb-1">Occasion</Form.Label><Form.Control size="sm" value={form.sf_occasion} onChange={setF('sf_occasion')} placeholder="Everyday / Owambe…" /></Col>
                    </Row>
                    <Form.Label className="small mb-1 mt-2">Short tagline</Form.Label>
                    <Form.Control size="sm" as="textarea" rows={2} value={form.sf_short} onChange={setF('sf_short')} placeholder="One line shown on the shop card" />
                  </div>

                  <div className="d-flex gap-2">
                    <Button size="sm" variant="primary" onClick={saveEdit} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Save'}</Button>
                    <Button size="sm" variant="light" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>

        <Col lg={8}>
          <Card>
            <CardBody className="p-0">
              <div className="p-3 pb-2"><h5 className="card-title mb-0">Variants — size × colour</h5></div>
              <Table responsive hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr><th>SKU</th><th>Size</th><th>Colour</th><th>Price</th><th style={{ width: 150 }}>Stock</th></tr>
                </thead>
                <tbody>
                  {(product.variants || []).length === 0 && (
                    <tr><td colSpan={5} className="text-center text-muted py-4">No variants.</td></tr>
                  )}
                  {(product.variants || []).map((v) => (
                    <tr key={v.id}>
                      <td className="small">{v.sku}</td>
                      <td>{v.size || '—'}</td>
                      <td>{v.color || '—'}</td>
                      <td>{naira(v.price_override ?? product.base_price)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <StockCell variant={v} onSaved={onStockSaved} />
                          {Number(v.stock) === 0 && <Badge bg="danger">Out</Badge>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
};

const Detail = ({ label, value }) => (
  <div className="d-flex justify-content-between py-1">
    <span className="text-muted">{label}</span>
    <span className="fw-semibold text-end">{value}</span>
  </div>
);

export default ProductDetailPage;
