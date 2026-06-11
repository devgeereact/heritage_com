import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, Table, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import NewCustomerModal from './components/NewCustomerModal';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

const CrmPage = () => {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | offline
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await heritApi.customers.list();
      setRows(Array.isArray(list) ? list : []);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageTItle title="Customers" />

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Customers</h4>
          <p className="text-muted mb-0">
            {state === 'ready' ? `${rows.length} customer${rows.length === 1 ? '' : 's'}` : 'Profiles, measurements and order history'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}>
          <IconifyIcon icon="solar:add-circle-bold" className="me-1" /> New customer
        </Button>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}

      {state === 'offline' && (
        <Alert variant="warning">
          <strong>Customers offline.</strong> Upload <code>php-api/customers.php</code> + <code>config.php</code>
          and import the <code>customers</code> table from <code>schema.sql</code>, then refresh.
        </Alert>
      )}

      {state === 'ready' && (
        <Card>
          <CardBody className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Name</th><th>Contact</th>
                  <th className="text-center">Orders</th><th className="text-center">Active</th>
                  <th className="text-end">Lifetime value</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted py-4">No customers yet. Add your first one.</td></tr>
                )}
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/crm/${c.id}`} className="fw-semibold text-decoration-none">{c.name}</Link>
                    </td>
                    <td className="small">
                      {c.phone && <div><IconifyIcon icon="solar:phone-bold" /> {c.phone}</div>}
                      {c.email && <div><IconifyIcon icon="solar:letter-bold" /> {c.email}</div>}
                      {!c.phone && !c.email && '—'}
                    </td>
                    <td className="text-center">{c.order_count}</td>
                    <td className="text-center">
                      {Number(c.active_orders) > 0
                        ? <Badge bg="warning">{c.active_orders}</Badge>
                        : <span className="text-muted">0</span>}
                    </td>
                    <td className="text-end">{naira(c.ordered_value)}</td>
                    <td className="text-end">
                      <Link to={`/crm/${c.id}`} className="btn btn-sm btn-light">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <NewCustomerModal show={showNew} onHide={() => setShowNew(false)} onCreated={load} />
    </>
  );
};

export default CrmPage;
