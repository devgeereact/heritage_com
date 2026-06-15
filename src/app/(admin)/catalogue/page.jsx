import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, Table, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import NewProductModal from './components/NewProductModal';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const statusVariant = (s) => (s === 'active' ? 'success' : s === 'draft' ? 'warning' : 'secondary');

const CataloguePage = () => {
  const [products, setProducts] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | offline
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await heritApi.products.list();
      setProducts(Array.isArray(list) ? list : []);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageTitle title="Products & Variants" />

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Products &amp; Variants</h4>
          <p className="text-muted mb-0">
            {state === 'ready' ? `${products.length} product${products.length === 1 ? '' : 's'} in the catalogue` : 'Ready-to-wear, by size and colour'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}>
          <IconifyIcon icon="solar:add-circle-bold" className="me-1" /> New product
        </Button>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}

      {state === 'offline' && (
        <Alert variant="warning">
          <strong>Catalogue offline.</strong> Upload <code>php-api/products.php</code> + <code>config.php</code>
          and import the products tables from <code>schema.sql</code>, then refresh.
        </Alert>
      )}

      {state === 'ready' && (
        <Card>
          <CardBody className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Code</th><th>Product</th><th>Category</th><th>Fabric</th>
                  <th className="text-end">Price</th><th className="text-center">Variants</th>
                  <th className="text-center">Stock</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No products yet. Create your first one.</td></tr>
                )}
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><span className="fw-semibold text-primary">{p.code}</span></td>
                    <td>
                      <Link to={`/catalogue/${p.id}`} className="fw-semibold text-decoration-none">{p.name}</Link>
                    </td>
                    <td>{p.category || '—'}</td>
                    <td>{p.fabric || '—'}</td>
                    <td className="text-end">{naira(p.base_price)}</td>
                    <td className="text-center">{p.variant_count}</td>
                    <td className="text-center">
                      <Badge bg={Number(p.total_stock) > 0 ? 'light' : 'danger'} text={Number(p.total_stock) > 0 ? 'dark' : undefined}>
                        {p.total_stock}
                      </Badge>
                    </td>
                    <td><Badge bg={statusVariant(p.status)} className="text-capitalize">{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <NewProductModal show={showNew} onHide={() => setShowNew(false)} onCreated={load} />
    </>
  );
};

export default CataloguePage;
