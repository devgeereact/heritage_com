import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, Table, Button, Spinner, Alert, Badge, ButtonGroup } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import NewOrderModal from './components/NewOrderModal';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const STATUSES = ['pending', 'paid', 'making', 'packing', 'shipped', 'delivered', 'cancelled'];
const statusVariant = (s) => ({
  pending: 'secondary', paid: 'info', making: 'warning', packing: 'warning',
  shipped: 'primary', delivered: 'success', cancelled: 'danger',
}[s] || 'secondary');
const channelIcon = (c) => ({
  web: 'solar:global-bold', whatsapp: 'mdi:whatsapp', market: 'solar:shop-bold',
  instagram: 'mdi:instagram', phone: 'solar:phone-bold',
}[c] || 'solar:cart-large-bold');

const SalesPage = () => {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | offline
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('open');

  const load = useCallback(async () => {
    try {
      const list = await heritApi.orders.list();
      setRows(Array.isArray(list) ? list : []);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    setRows((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await heritApi.orders.setStatus(id, status);
    } catch {
      load();
    }
  };

  const shown = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'open') return rows.filter((o) => !['delivered', 'cancelled'].includes(o.status));
    return rows.filter((o) => o.status === filter);
  }, [rows, filter]);

  return (
    <>
      <PageTItle title="Orders" />

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Orders</h4>
          <p className="text-muted mb-0">
            {state === 'ready' ? `${rows.length} order${rows.length === 1 ? '' : 's'}` : 'Web, WhatsApp and market sales'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}>
          <IconifyIcon icon="solar:add-circle-bold" className="me-1" /> New order
        </Button>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}

      {state === 'offline' && (
        <Alert variant="warning">
          <strong>Orders offline.</strong> Upload <code>php-api/orders.php</code> + <code>config.php</code>
          and import the <code>orders</code> tables from <code>schema.sql</code>, then refresh.
        </Alert>
      )}

      {state === 'ready' && (
        <>
          <ButtonGroup size="sm" className="mb-3 flex-wrap">
            {['open', 'all', ...STATUSES].map((f) => (
              <Button key={f} variant={filter === f ? 'primary' : 'outline-secondary'} className="text-capitalize" onClick={() => setFilter(f)}>
                {f}
              </Button>
            ))}
          </ButtonGroup>

          <Card>
            <CardBody className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Code</th><th>Customer</th><th>Channel</th><th className="text-center">Items</th>
                    <th className="text-end">Total</th><th>Payment</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted py-4">No orders here.</td></tr>
                  )}
                  {shown.map((o) => (
                    <tr key={o.id}>
                      <td><Link to={`/sales/${o.id}`} className="fw-semibold text-decoration-none">{o.code}</Link></td>
                      <td>
                        <div className="fw-semibold">{o.customer_name}</div>
                        {o.customer_phone && <div className="text-muted small">{o.customer_phone}</div>}
                      </td>
                      <td><IconifyIcon icon={channelIcon(o.channel)} className="me-1" /><span className="text-capitalize">{o.channel}</span></td>
                      <td className="text-center">{o.unit_count}</td>
                      <td className="text-end">{naira(o.total)}</td>
                      <td className="text-capitalize">{o.payment_method}</td>
                      <td>
                        <select
                          className={`form-select form-select-sm badge-select text-capitalize border-${statusVariant(o.status)}`}
                          value={o.status}
                          onChange={(e) => setStatus(o.id, e.target.value)}
                          style={{ width: 'auto', display: 'inline-block' }}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </>
      )}

      <NewOrderModal show={showNew} onHide={() => setShowNew(false)} onCreated={load} />
    </>
  );
};

export default SalesPage;
