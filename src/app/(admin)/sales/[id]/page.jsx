import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card, CardBody, Table, Badge, Spinner, Alert, Form, Button } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';
import OrderPrint from './components/OrderPrint';

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

  const [printMode, setPrintMode] = useState(null); // 'invoice' | 'packing' | null
  const [track, setTrack] = useState({ courier: '', tracking_ref: '', tracking_url: '' });
  const saveTracking = async () => {
    try {
      await heritApi.orders.track(id, track);
      showNotification({ message: 'Tracking saved — order marked shipped.', variant: 'success' });
      load();
    } catch (e) { showNotification({ message: e.message || 'Could not save tracking', variant: 'danger' }); }
  };
  const [pay, setPay] = useState({ amount: '', method: 'transfer', reference: '' });
  const recordPayment = async () => {
    const amount = Number(pay.amount);
    if (!amount || amount <= 0) return;
    try {
      const r = await heritApi.orders.pay(id, { amount, method: pay.method, reference: pay.reference });
      setO((p) => ({ ...p, paid: r.paid, status: r.balance <= 0 && p.status === 'pending' ? 'paid' : p.status }));
      setPay({ amount: '', method: 'transfer', reference: '' });
      showNotification({ message: `Payment recorded · balance ${naira(r.balance)}`, variant: 'success' });
    } catch (e) { showNotification({ message: e.message || 'Could not record payment', variant: 'danger' }); load(); }
  };
  const [refund, setRefund] = useState({ amount: '', to: 'credit', reason: '' });
  const doRefund = async () => {
    const amount = Number(refund.amount);
    if (!amount || amount <= 0) return;
    if (!window.confirm(`Refund ${naira(amount)} ${refund.to === 'credit' ? 'to store credit' : 'as cash'}?`)) return;
    try {
      await heritApi.orders.refund(id, refund);
      setRefund({ amount: '', to: 'credit', reason: '' });
      showNotification({ message: 'Refund processed', variant: 'success' });
      load();
    } catch (e) { showNotification({ message: e.message || 'Could not refund', variant: 'danger' }); }
  };
  const setReturn = async (return_status) => {
    setO((p) => ({ ...p, return_status }));
    try {
      await heritApi.orders.setReturn(id, return_status, o.return_reason || '');
      showNotification({ message: `Return: ${return_status}`, variant: 'success' });
    } catch (e) { showNotification({ message: e.message || 'Could not update return', variant: 'danger' }); load(); }
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
      <PageTitle title={`Order ${o.code}`} />

      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <Link to="/sales" className="btn btn-sm btn-light"><IconifyIcon icon="solar:arrow-left-linear" /> Orders</Link>
        <h4 className="mb-0">{o.code}</h4>
        <Badge bg={statusVariant(o.status)} className="text-capitalize">{o.status}</Badge>
        <div className="ms-auto d-flex gap-2">
          <Button size="sm" variant="outline-secondary" onClick={() => setPrintMode('packing')}>
            <IconifyIcon icon="solar:box-bold" className="me-1" /> Packing slip
          </Button>
          <Button size="sm" variant="outline-primary" onClick={() => setPrintMode('invoice')}>
            <IconifyIcon icon="solar:bill-list-bold" className="me-1" /> Invoice
          </Button>
        </div>
      </div>

      <OrderPrint show={!!printMode} mode={printMode || 'invoice'} order={o} onHide={() => setPrintMode(null)} />

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

          <Card className="mt-3">
            <CardBody>
              <h5 className="card-title mb-2">Payments</h5>
              <Line label="Total" value={naira(o.total)} />
              <Line label="Paid" value={naira(o.paid)} />
              <Line label="Balance" value={naira(balance)} strong />
              {balance > 0 && (
                <div className="mt-2">
                  <div className="text-muted small mb-1">Record a payment (installment / transfer)</div>
                  <div className="d-flex gap-1 mb-2">
                    <Form.Control size="sm" type="number" min="0" placeholder="Amount" value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} />
                    <Form.Select size="sm" style={{ maxWidth: 110 }} value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}>
                      {['transfer', 'cash', 'card', 'cod'].map((m) => <option key={m} value={m}>{m}</option>)}
                    </Form.Select>
                  </div>
                  <Form.Control size="sm" className="mb-2" placeholder="Reference (optional)" value={pay.reference} onChange={(e) => setPay((p) => ({ ...p, reference: e.target.value }))} />
                  <Button size="sm" variant="success" className="w-100" onClick={recordPayment} disabled={!pay.amount}>
                    <IconifyIcon icon="solar:wallet-money-bold" className="me-1" /> Record payment
                  </Button>
                </div>
              )}
              {Number(o.paid) > 0 && (
                <div className="mt-3 pt-2 border-top">
                  <div className="text-muted small mb-1">Refund</div>
                  <div className="d-flex gap-1 mb-2">
                    <Form.Control size="sm" type="number" min="0" placeholder="Amount" value={refund.amount} onChange={(e) => setRefund((r) => ({ ...r, amount: e.target.value }))} />
                    <Form.Select size="sm" style={{ maxWidth: 130 }} value={refund.to} onChange={(e) => setRefund((r) => ({ ...r, to: e.target.value }))}>
                      <option value="credit">to credit</option>
                      <option value="cash">as cash</option>
                    </Form.Select>
                  </div>
                  <Button size="sm" variant="outline-danger" className="w-100" onClick={doRefund} disabled={!refund.amount}>
                    <IconifyIcon icon="solar:rewind-back-bold" className="me-1" /> Refund
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="mt-3">
            <CardBody>
              <h5 className="card-title mb-2">Shipping &amp; tracking</h5>
              {o.tracking_ref ? (
                <div className="mb-2 small">
                  <div><span className="text-muted">Courier:</span> {o.courier || '—'}</div>
                  <div><span className="text-muted">Ref:</span> {o.tracking_ref}</div>
                  {o.tracking_url && <a href={o.tracking_url} target="_blank" rel="noreferrer">Track parcel <IconifyIcon icon="solar:arrow-right-up-linear" /></a>}
                </div>
              ) : <p className="text-muted small mb-2">No tracking yet. Add it to mark the order shipped.</p>}
              <Form.Control className="mb-2" placeholder="Courier (GIG, DHL…)" value={track.courier} onChange={(e) => setTrack((t) => ({ ...t, courier: e.target.value }))} />
              <Form.Control className="mb-2" placeholder="Tracking reference" value={track.tracking_ref} onChange={(e) => setTrack((t) => ({ ...t, tracking_ref: e.target.value }))} />
              <Form.Control className="mb-2" placeholder="Tracking URL (optional)" value={track.tracking_url} onChange={(e) => setTrack((t) => ({ ...t, tracking_url: e.target.value }))} />
              <Button size="sm" variant="primary" className="w-100" onClick={saveTracking} disabled={!track.tracking_ref.trim()}>
                <IconifyIcon icon="solar:delivery-bold" className="me-1" /> Save &amp; mark shipped
              </Button>
            </CardBody>
          </Card>

          <Card className="mt-3">
            <CardBody>
              <h5 className="card-title mb-2">Return / exchange</h5>
              <Form.Select value={o.return_status || 'none'} onChange={(e) => setReturn(e.target.value)} className="text-capitalize mb-2">
                {['none', 'requested', 'approved', 'received', 'refunded', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
              <Form.Control placeholder="Reason (size, fault…)" value={o.return_reason || ''} onChange={(e) => setO((p) => ({ ...p, return_reason: e.target.value }))} onBlur={() => setReturn(o.return_status || 'none')} />
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
