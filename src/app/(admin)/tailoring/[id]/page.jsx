import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card, CardBody, Badge, Button, Spinner, Alert, Form, InputGroup } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const STAGES = [
  { key: 'measure', label: 'Measure' },
  { key: 'cut', label: 'Cut' },
  { key: 'sew', label: 'Sew' },
  { key: 'finish', label: 'Finish' },
  { key: 'fitting', label: 'Fitting' },
  { key: 'done', label: 'Done' },
  { key: 'cancelled', label: 'Cancelled' },
];
const stageLabel = (k) => STAGES.find((s) => s.key === k)?.label ?? k;
const stageVariant = (k) => (k === 'done' ? 'success' : k === 'cancelled' ? 'secondary' : 'warning');
const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

const TailoringDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [stage, setStage] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try {
      const o = await heritApi.tailoring.get(id);
      setOrder(o);
      setStage(o.stage);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveStage = async () => {
    setSaving(true);
    try {
      await heritApi.tailoring.setStage(id, stage, note);
      setNote('');
      showNotification({ message: `Moved to ${stageLabel(stage)}`, variant: 'success' });
      load();
    } catch (e) {
      showNotification({ message: e.message || 'Could not update stage', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading') return <div className="text-center py-5"><Spinner /></div>;
  if (state === 'error') {
    return (
      <Alert variant="warning">
        Could not load this order. The workshop API may be offline, or the order does not exist.{' '}
        <Link to="/tailoring">Back to the board</Link>.
      </Alert>
    );
  }

  const measurements = order.measurements
    ? (typeof order.measurements === 'string' ? safeParse(order.measurements) : order.measurements)
    : null;
  const balance = Number(order.price || 0) - Number(order.deposit || 0);

  return (
    <>
      <PageTItle title={`Order ${order.code}`} />

      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/tailoring" className="btn btn-sm btn-light">
          <IconifyIcon icon="solar:arrow-left-linear" /> Board
        </Link>
        <h4 className="mb-0">{order.code}</h4>
        <Badge bg={stageVariant(order.stage)} className="text-capitalize">{stageLabel(order.stage)}</Badge>
      </div>

      <Row className="g-3">
        <Col lg={8}>
          <Card>
            <CardBody>
              <Row className="g-3">
                <Col sm={6}>
                  <Field label="Customer" value={order.customer_name} icon="solar:user-bold" />
                  <Field label="Phone" value={order.customer_phone || '—'} icon="solar:phone-bold" />
                </Col>
                <Col sm={6}>
                  <Field label="Garment" value={order.garment_type} icon="solar:t-shirt-bold" capitalize />
                  <Field label="Fabric" value={order.fabric || '—'} icon="solar:scissors-bold" />
                </Col>
                <Col sm={6}>
                  <Field label="Assigned tailor" value={order.tailor_name || 'Unassigned'} icon="solar:users-group-rounded-bold" />
                </Col>
                <Col sm={6}>
                  <Field label="Due date" value={order.due_date || '—'} icon="solar:calendar-bold" />
                </Col>
                {order.notes && (
                  <Col xs={12}><Field label="Notes" value={order.notes} icon="solar:notebook-bold" /></Col>
                )}
              </Row>
            </CardBody>
          </Card>

          <Card className="mt-3">
            <CardBody>
              <h5 className="card-title mb-3">Measurements (inches)</h5>
              {measurements && Object.keys(measurements).length ? (
                <Row className="g-2">
                  {Object.entries(measurements).map(([k, v]) => (
                    <Col xs={4} md={3} key={k}>
                      <div className="border rounded p-2 text-center">
                        <div className="fs-5 fw-semibold">{v}</div>
                        <div className="text-muted small text-capitalize">{k}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              ) : (
                <p className="text-muted mb-0">No measurements recorded for this order.</p>
              )}
            </CardBody>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <CardBody>
              <h5 className="card-title mb-3">Payment</h5>
              <Line label="Price" value={naira(order.price)} />
              <Line label="Deposit paid" value={naira(order.deposit)} />
              <hr />
              <Line label="Balance" value={naira(balance)} strong />
            </CardBody>
          </Card>

          <Card className="mt-3">
            <CardBody>
              <h5 className="card-title mb-2">Update stage</h5>
              <Form.Select value={stage} onChange={(e) => setStage(e.target.value)} className="mb-2">
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Form.Select>
              <InputGroup className="mb-2">
                <Form.Control placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              </InputGroup>
              <Button variant="primary" className="w-100" onClick={saveStage} disabled={saving}>
                {saving ? <Spinner size="sm" /> : 'Save stage'}
              </Button>
            </CardBody>
          </Card>

          <Card className="mt-3">
            <CardBody>
              <h5 className="card-title mb-3">History</h5>
              {(order.events || []).length === 0 && <p className="text-muted mb-0">No history yet.</p>}
              <ul className="list-unstyled mb-0">
                {(order.events || []).map((e, i) => (
                  <li key={i} className="d-flex gap-2 pb-3">
                    <IconifyIcon icon="solar:clock-circle-bold" className="text-primary mt-1" />
                    <div>
                      <div className="fw-semibold text-capitalize">{stageLabel(e.stage)}</div>
                      {e.note && <div className="small">{e.note}</div>}
                      <div className="text-muted small">
                        {e.user_name || 'Staff'} · {e.created_at}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
};

const Field = ({ label, value, icon, capitalize }) => (
  <div className="mb-2">
    <div className="text-muted small d-flex align-items-center gap-1">
      <IconifyIcon icon={icon} /> {label}
    </div>
    <div className={`fw-semibold ${capitalize ? 'text-capitalize' : ''}`}>{value}</div>
  </div>
);

const Line = ({ label, value, strong }) => (
  <div className="d-flex justify-content-between py-1">
    <span className={strong ? 'fw-bold' : 'text-muted'}>{label}</span>
    <span className={strong ? 'fw-bold' : ''}>{value}</span>
  </div>
);

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

export default TailoringDetailPage;
