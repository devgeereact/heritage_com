import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card, CardBody, Table, Badge, Spinner, Alert, Form } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const STATUSES = ['pending', 'paid', 'making', 'packing', 'shipped', 'delivered', 'cancelled'];
const statusVariant = (s) => ({
  pending: 'secondary', paid: 'info', making: 'warning', packing: 'warning',
  shipped: 'primary', delivered: 'success', cancelled: 'danger',
}[s] || 'secondary');

const SalesDetailPage = () => {
  const { id } = useParams();
  const [o, setO] = useState(null);
  const [state, setState] = useState('loading');
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try { setO(await heritApi.orders.get(id)); setState('ready'); }
    catch { setState('error'); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (status) => {
    setO((p) => ({ ...p, status }));
    try {
      await heritApi.orders.setStatus(id, status);
      showNotification({ message: `Status: ${status}`, variant: 'success' });
    } catch (e) {
      showNotification({ message: e.message || 'Could not update', variant: 'danger' });
      load();
    }
  };

  if (state === 'loading') return <div className="text-center py-5"><Spinner /></div>;
  if (state === 'error') {
    return (
      <Alert variant="warning">
        Could not load this order. The API may be offline, or it does not exist.{' '}
        <Link to="/sales">Back to orders</Link>.
      </Alert>
    );
  }

  const balance = Number(o.total || 0) - Number(o.paid || 0);

  return (
    <>
      <PageTItle title={`Order ${o.code}`} />

      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <Link to="/sales" className="btn btn-sm btn-light"><IconifyIcon icon="solar:arrow-left-linear" /> Orders</Link>
        <h4 className="mb-0">{o.code}</h4>
        <Badge bg={statusVariant(o.status)} className="text-capitalize">{o.status}</Badge>
      </div>

      <Row className="g-3">
        <Col lg={8}>
          <Card>
            <CardBody className="p-0">
              <div className="p-3 pb-2"><h5 className="card-title mb-0">Items</h5></div>
              <Table responsive className="mb-0 align-middle">
                <thead className="table-light">
                  <tr><th>Item</th><th>SKU</th><th className="text-center">Qty</th><th className="text-end">Unit</th><th className="text-end">Line</th></tr>
                </thead>
                <tbody>
                  {(o.items || []).map((it) => (
                    <tr key={it.id}>
                      <td>{it.label}</td>
                      <td className="small text-muted">{it.sku || '—'}</td>
                      <td className="text-center">{it.qty}</td>
                      <td className="text-end">{naira(it.unit_price)}</td>
                      <td className="text-end">{naira(it.qty * it.unit_price)}</td>
                    </tr>
                  ))}
                  <tr className="border-top">
                    <td colSpan={4} className="text-end fw-bold">Total</td>
                    <td className="text-end fw-bold">{naira(o.total)}</td>
                  </tr>
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <CardBody>
              <h5 className="card-title mb-3">Order</h5>
              <Line label="Customer" value={o.customer_name} />
              <Line label="Phone" value={o.customer_phone || '—'} />
              <Line label="Channel" value={o.channel} cap />
              <Line label="Payment" value={o.payment_method} cap />
              <hr />
              <Line label="Total" value={naira(o.total)} />
              <Line label="Paid" value={naira(o.paid)} />
              <Line label="Balance" value={naira(balance)} strong />
              {o.ship_address && (<><div className="text-muted small mt-2">Ship to</div><p className="mb-0">{o.ship_address}</p></>)}
              {o.notes && (<><div className="text-muted small mt-2">Notes</div><p className="mb-0">{o.notes}</p></>)}
            </CardBody>
          </Card>

          <Card className="mt-3">
            <CardBody>
              <h5 className="card-title mb-2">Status</h5>
              <Form.Select value={o.status} onChange={(e) => setStatus(e.target.value)} className="text-capitalize">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
};

const Line = ({ label, value, strong, cap }) => (
  <div className="d-flex justify-content-between py-1">
    <span className={strong ? 'fw-bold' : 'text-muted'}>{label}</span>
    <span className={`${strong ? 'fw-bold' : ''} ${cap ? 'text-capitalize' : ''}`}>{value}</span>
  </div>
);

export default SalesDetailPage;
