import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card, CardBody, Badge, Button, Spinner, Alert, Form, InputGroup, Dropdown, ProgressBar } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
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
// Standard bespoke measurement set (inches). Order = how a tailor takes them.
const MEASURE_FIELDS = ['neck', 'shoulder', 'chest', 'waist', 'hip', 'sleeve', 'length', 'thigh', 'trouser_length', 'ankle'];
const stageLabel = (k) => STAGES.find((s) => s.key === k)?.label ?? k;
const stageVariant = (k) => (k === 'done' ? 'success' : k === 'cancelled' ? 'secondary' : 'warning');
const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const safeParse = (s) => { try { return JSON.parse(s); } catch { return null; } };

const TailoringDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading');
  const [stage, setStage] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // sub-editors
  const [meas, setMeas] = useState({});
  const [editMeas, setEditMeas] = useState(false);
  const [syncCust, setSyncCust] = useState(true);
  const [payAmt, setPayAmt] = useState('');
  const [costs, setCosts] = useState({ fabric_cost: '', labour_cost: '' });
  const [fitting, setFitting] = useState('');
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try {
      const o = await heritApi.tailoring.get(id);
      setOrder(o);
      setStage(o.stage);
      const m = o.measurements ? (typeof o.measurements === 'string' ? safeParse(o.measurements) : o.measurements) : {};
      setMeas(m || {});
      setCosts({ fabric_cost: o.fabric_cost ?? '', labour_cost: o.labour_cost ?? '' });
      setFitting(o.fitting_date || '');
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const notify = (e, ok) => showNotification({ message: e?.message || ok, variant: e ? 'danger' : 'success' });

  const saveStage = async () => {
    setSaving(true);
    try { await heritApi.tailoring.setStage(id, stage, note); setNote(''); notify(null, `Moved to ${stageLabel(stage)}`); load(); }
    catch (e) { notify(e); } finally { setSaving(false); }
  };

  const setM = (k) => (e) => setMeas((m) => ({ ...m, [k]: e.target.value }));
  const saveMeasurements = async () => {
    const clean = Object.fromEntries(Object.entries(meas).filter(([, v]) => String(v).trim() !== ''));
    try { await heritApi.tailoring.setMeasurements(id, clean, syncCust); setEditMeas(false); notify(null, syncCust ? 'Measurements saved to order + customer profile' : 'Measurements saved'); load(); }
    catch (e) { notify(e); }
  };

  const recordPayment = async () => {
    const amt = Number(payAmt);
    if (!amt || amt <= 0) return;
    try { const r = await heritApi.tailoring.pay(id, amt); setPayAmt(''); setOrder((o) => ({ ...o, deposit: r.deposit })); notify(null, `₦${amt.toLocaleString()} recorded`); load(); }
    catch (e) { notify(e); }
  };

  const saveCosts = async () => {
    try { await heritApi.tailoring.setCosts(id, Number(costs.fabric_cost) || 0, Number(costs.labour_cost) || 0); notify(null, 'Costs saved'); load(); }
    catch (e) { notify(e); }
  };

  const saveFitting = async () => {
    try { await heritApi.tailoring.setFitting(id, fitting); notify(null, fitting ? 'Fitting scheduled' : 'Fitting cleared'); load(); }
    catch (e) { notify(e); }
  };

  const remind = async (kind) => {
    try {
      const r = await heritApi.tailoring.remind(id, { kind });
      if (r.status === 'manual' && r.wa_link) { window.open(r.wa_link, '_blank', 'noopener'); notify(null, 'No API connected — opening WhatsApp to send.'); }
      else notify(null, 'Reminder sent on WhatsApp');
    } catch (e) { notify(e); }
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

  const price = Number(order.price || 0);
  const deposit = Number(order.deposit || 0);
  const balance = price - deposit;
  const paidPct = price > 0 ? Math.min(100, Math.round((deposit / price) * 100)) : 0;
  const costTotal = (Number(order.fabric_cost) || 0) + (Number(order.labour_cost) || 0);
  const profit = price - costTotal;
  const margin = price > 0 ? Math.round((profit / price) * 100) : 0;
  const fittingOverdue = order.fitting_date && order.stage !== 'done' && new Date(order.fitting_date) < new Date();

  return (
    <>
      <PageTitle title={`Order ${order.code}`} />

      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <Link to="/tailoring" className="btn btn-sm btn-light"><IconifyIcon icon="solar:arrow-left-linear" /> Board</Link>
        <h4 className="mb-0">{order.code}</h4>
        <Badge bg={stageVariant(order.stage)} className="text-capitalize">{stageLabel(order.stage)}</Badge>
        {balance > 0 && <Badge bg="danger" className="bg-opacity-75">Balance {naira(balance)}</Badge>}
        <div className="ms-auto">
          <Dropdown>
            <Dropdown.Toggle size="sm" variant="success"><IconifyIcon icon="mdi:whatsapp" className="me-1" /> Remind</Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => remind('fitting')}>Fitting reminder</Dropdown.Item>
              <Dropdown.Item onClick={() => remind('balance')} disabled={balance <= 0}>Balance due reminder</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
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
                <Col sm={6}><Field label="Assigned tailor" value={order.tailor_name || 'Unassigned'} icon="solar:users-group-rounded-bold" /></Col>
                <Col sm={6}><Field label="Due date" value={order.due_date || '—'} icon="solar:calendar-bold" /></Col>
                {order.notes && <Col xs={12}><Field label="Notes" value={order.notes} icon="solar:notebook-bold" /></Col>}
              </Row>
            </CardBody>
          </Card>

          {/* Measurements */}
          <Card className="mt-3">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Measurements <span className="text-muted small">(inches)</span></h5>
                {!editMeas
                  ? <Button size="sm" variant="outline-primary" onClick={() => setEditMeas(true)}><IconifyIcon icon="solar:pen-2-linear" className="me-1" /> Edit</Button>
                  : <div className="d-flex gap-2"><Button size="sm" variant="primary" onClick={saveMeasurements}>Save</Button><Button size="sm" variant="light" onClick={() => { setEditMeas(false); load(); }}>Cancel</Button></div>}
              </div>
              {!editMeas ? (
                Object.keys(meas).length ? (
                  <Row className="g-2">
                    {MEASURE_FIELDS.filter((k) => meas[k]).map((k) => (
                      <Col xs={4} md={3} key={k}>
                        <div className="border rounded p-2 text-center">
                          <div className="fs-5 fw-semibold">{meas[k]}</div>
                          <div className="text-muted small text-capitalize">{k.replace('_', ' ')}</div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : <p className="text-muted mb-0">No measurements yet. Click Edit to capture them.</p>
              ) : (
                <>
                  <Row className="g-2">
                    {MEASURE_FIELDS.map((k) => (
                      <Col xs={6} md={3} key={k}>
                        <Form.Label className="small text-muted text-capitalize mb-1">{k.replace('_', ' ')}</Form.Label>
                        <Form.Control type="number" step="0.25" min="0" value={meas[k] ?? ''} onChange={setM(k)} />
                      </Col>
                    ))}
                  </Row>
                  <Form.Check className="mt-3" type="switch" id="sync-cust" label="Also save to this customer's reusable profile"
                    checked={syncCust} onChange={(e) => setSyncCust(e.target.checked)} />
                </>
              )}
            </CardBody>
          </Card>

          {/* History */}
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
                      <div className="text-muted small">{e.user_name || 'Staff'} · {e.created_at}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Payment */}
          <Card>
            <CardBody>
              <h5 className="card-title mb-3">Payment</h5>
              <Line label="Price" value={naira(price)} />
              <Line label="Paid" value={naira(deposit)} />
              <Line label="Balance" value={naira(balance)} strong />
              <ProgressBar now={paidPct} label={`${paidPct}%`} variant={paidPct >= 100 ? 'success' : paidPct >= 50 ? 'primary' : 'warning'} className="my-2" style={{ height: 18 }} />
              {price > 0 && deposit < price * 0.5 && <p className="text-warning small mb-2"><IconifyIcon icon="solar:info-circle-bold" /> Below the 50% deposit (₦{Math.round(price * 0.5).toLocaleString()}).</p>}
              {balance > 0 && (
                <InputGroup>
                  <InputGroup.Text>₦</InputGroup.Text>
                  <Form.Control type="number" min="0" placeholder="Record a payment" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
                  <Button variant="primary" onClick={recordPayment} disabled={!payAmt}>Add</Button>
                </InputGroup>
              )}
              {balance <= 0 && price > 0 && <Badge bg="success">Paid in full</Badge>}
            </CardBody>
          </Card>

          {/* Profitability */}
          <Card className="mt-3">
            <CardBody>
              <h5 className="card-title mb-3">Profitability</h5>
              <Row className="g-2 mb-2">
                <Col xs={6}>
                  <Form.Label className="small text-muted mb-1">Fabric cost (₦)</Form.Label>
                  <Form.Control type="number" min="0" value={costs.fabric_cost} onChange={(e) => setCosts((c) => ({ ...c, fabric_cost: e.target.value }))} />
                </Col>
                <Col xs={6}>
                  <Form.Label className="small text-muted mb-1">Labour cost (₦)</Form.Label>
                  <Form.Control type="number" min="0" value={costs.labour_cost} onChange={(e) => setCosts((c) => ({ ...c, labour_cost: e.target.value }))} />
                </Col>
              </Row>
              <Button size="sm" variant="light" className="w-100 mb-3" onClick={saveCosts}>Save costs</Button>
              <Line label="Revenue" value={naira(price)} />
              <Line label="Total cost" value={naira(costTotal)} />
              <hr className="my-2" />
              <Line label="Profit" value={naira(profit)} strong />
              <div className="text-end"><Badge bg={margin >= 40 ? 'success' : margin >= 20 ? 'warning' : 'danger'}>{margin}% margin</Badge></div>
            </CardBody>
          </Card>

          {/* Fitting */}
          <Card className="mt-3">
            <CardBody>
              <h5 className="card-title mb-2">Fitting appointment</h5>
              {order.fitting_date && <p className={`small mb-2 ${fittingOverdue ? 'text-danger' : 'text-muted'}`}><IconifyIcon icon="solar:calendar-bold" className="me-1" />Scheduled {order.fitting_date}{fittingOverdue ? ' · overdue' : ''}</p>}
              <InputGroup className="mb-2">
                <Form.Control type="date" value={fitting} onChange={(e) => setFitting(e.target.value)} />
                <Button variant="primary" onClick={saveFitting}>Set</Button>
              </InputGroup>
              <Button size="sm" variant="outline-success" className="w-100" onClick={() => remind('fitting')} disabled={!order.customer_phone}>
                <IconifyIcon icon="mdi:whatsapp" className="me-1" /> Send fitting reminder
              </Button>
            </CardBody>
          </Card>

          {/* Stage */}
          <Card className="mt-3">
            <CardBody>
              <h5 className="card-title mb-2">Update stage</h5>
              <Form.Select value={stage} onChange={(e) => setStage(e.target.value)} className="mb-2">
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Form.Select>
              <InputGroup className="mb-2"><Form.Control placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} /></InputGroup>
              <Button variant="primary" className="w-100" onClick={saveStage} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Save stage'}</Button>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
};

const Field = ({ label, value, icon, capitalize }) => (
  <div className="mb-2">
    <div className="text-muted small d-flex align-items-center gap-1"><IconifyIcon icon={icon} /> {label}</div>
    <div className={`fw-semibold ${capitalize ? 'text-capitalize' : ''}`}>{value}</div>
  </div>
);

const Line = ({ label, value, strong }) => (
  <div className="d-flex justify-content-between py-1">
    <span className={strong ? 'fw-bold' : 'text-muted'}>{label}</span>
    <span className={strong ? 'fw-bold' : ''}>{value}</span>
  </div>
);

export default TailoringDetailPage;
