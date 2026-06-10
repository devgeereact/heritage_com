import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card, CardBody, Table, Badge, Button, Spinner, Alert, Form, Dropdown } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
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

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [state, setState] = useState('loading');
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
      <PageTItle title={product.name} />

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
      </div>

      <Row className="g-3">
        <Col lg={4}>
          <Card>
            <CardBody>
              <h5 className="card-title mb-3">Details</h5>
              <Detail label="Category" value={product.category || '—'} />
              <Detail label="Fabric / print" value={product.fabric || '—'} />
              <Detail label="Base price" value={naira(product.base_price)} />
              <Detail label="Total stock" value={`${totalStock} across ${(product.variants || []).length} variants`} />
              {product.description && (
                <>
                  <div className="text-muted small mt-2">Description</div>
                  <p className="mb-0">{product.description}</p>
                </>
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
