import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Table, Button, Spinner, Alert, Nav, Row, Col, Modal, Form } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import AiPanel from '@/components/AiPanel';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const PAY_METHODS = ['cash', 'transfer', 'card', 'cod'];

const FINANCE_AI = {
  title: 'AI finance read',
  subtitle: 'Cash-flow forecast, margin insight, expense patterns and a plain-English profit read.',
  task: 'finance_ai',
  cta: 'Read the money',
  sections: [
    { key: 'CASHFLOW', icon: 'solar:graph-up-bold-duotone', tone: 'primary', title: 'Cash-flow forecast' },
    { key: 'MARGIN', icon: 'solar:tag-price-bold-duotone', tone: 'success', title: 'Margin insight' },
    { key: 'EXPENSE', icon: 'solar:bill-list-bold-duotone', tone: 'warning', title: 'Expense patterns' },
    { key: 'PROFIT', icon: 'solar:wallet-money-bold-duotone', tone: 'info', title: 'Profit read' },
  ],
  load: () => heritApi.finance.summary(),
  buildPrompt: (s) => {
    const cats = (s.expenses_by_category || []).map((c) => `${c.category}: ₦${Math.round(c.total).toLocaleString()}`).join('; ');
    return `Herit Clothing finances (Lagos heritage-fashion brand). All-time: in ₦${Math.round(s.in || 0).toLocaleString()}, out ₦${Math.round(s.out || 0).toLocaleString()}, net ₦${Math.round(s.net || 0).toLocaleString()}. This month: in ₦${Math.round(s.in_month || 0).toLocaleString()}, out ₦${Math.round(s.out_month || 0).toLocaleString()}, net ₦${Math.round(s.net_month || 0).toLocaleString()}. Outstanding owed: ₦${Math.round(s.outstanding || 0).toLocaleString()}. Expenses by category: ${cats || 'none'}.

Act as the brand's finance partner. Be concrete, cite the numbers, no fluff. Return EXACTLY these four sections, each starting with the tag on its own line then 1–2 sentences:
[CASHFLOW] is a thin month coming, and what the cash position looks like ahead
[MARGIN] where the brand may be under-pricing or leaking margin
[EXPENSE] which cost categories stand out and what to watch
[PROFIT] a plain-English summary of whether the brand is making money`;
  },
};
const EXP_CATS = ['fabric', 'tailoring', 'packaging', 'marketing', 'rent', 'fees', 'other'];

const Kpi = ({ label, value, tone, icon }) => (
  <Col md={6} xl={3}>
    <Card className="h-100"><CardBody className="d-flex align-items-center gap-3">
      <span className={`avatar-md d-inline-flex align-items-center justify-content-center rounded fs-3 bg-${tone}-subtle text-${tone}`}><IconifyIcon icon={icon} /></span>
      <div><h4 className="mb-0">{value}</h4><p className="text-muted mb-0">{label}</p></div>
    </CardBody></Card>
  </Col>
);

const PaymentModal = ({ show, onClose, onDone }) => {
  const [f, setF] = useState({ customer_name: '', amount: '', method: 'cash', reference: '', note: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(f.amount) > 0)) { setErr('Enter an amount.'); return; }
    setBusy(true); setErr('');
    try { await heritApi.finance.addPayment(f); setF({ customer_name: '', amount: '', method: 'cash', reference: '', note: '' }); onDone(); }
    catch (e2) { setErr(e2.message || 'Could not save.'); setBusy(false); }
  };
  return (
    <Modal show={show} onHide={onClose} centered><Form onSubmit={submit}>
      <Modal.Header closeButton><Modal.Title className="fs-5">Record payment</Modal.Title></Modal.Header>
      <Modal.Body>
        {err && <Alert variant="danger" className="py-2">{err}</Alert>}
        <Row className="g-2">
          <Col md={7}><Form.Label>Customer</Form.Label><Form.Control value={f.customer_name} onChange={set('customer_name')} /></Col>
          <Col md={5}><Form.Label>Amount (₦)</Form.Label><Form.Control type="number" min={0} value={f.amount} onChange={set('amount')} autoFocus /></Col>
          <Col md={6}><Form.Label>Method</Form.Label><Form.Select value={f.method} onChange={set('method')} className="text-capitalize">{PAY_METHODS.map((m) => <option key={m}>{m}</option>)}</Form.Select></Col>
          <Col md={6}><Form.Label>Reference</Form.Label><Form.Control value={f.reference} onChange={set('reference')} placeholder="optional" /></Col>
          <Col xs={12}><Form.Label>Note</Form.Label><Form.Control value={f.note} onChange={set('note')} placeholder="optional" /></Col>
        </Row>
      </Modal.Body>
      <Modal.Footer><Button variant="light" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" variant="primary" disabled={busy}>{busy ? <Spinner size="sm" /> : 'Save payment'}</Button></Modal.Footer>
    </Form></Modal>
  );
};

const ExpenseModal = ({ show, onClose, onDone }) => {
  const [f, setF] = useState({ category: 'fabric', amount: '', vendor: '', note: '', spent_on: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(f.amount) > 0)) { setErr('Enter an amount.'); return; }
    setBusy(true); setErr('');
    try { await heritApi.finance.addExpense(f); setF({ category: 'fabric', amount: '', vendor: '', note: '', spent_on: new Date().toISOString().slice(0, 10) }); onDone(); }
    catch (e2) { setErr(e2.message || 'Could not save.'); setBusy(false); }
  };
  return (
    <Modal show={show} onHide={onClose} centered><Form onSubmit={submit}>
      <Modal.Header closeButton><Modal.Title className="fs-5">Record expense</Modal.Title></Modal.Header>
      <Modal.Body>
        {err && <Alert variant="danger" className="py-2">{err}</Alert>}
        <Row className="g-2">
          <Col md={6}><Form.Label>Category</Form.Label><Form.Select value={f.category} onChange={set('category')} className="text-capitalize">{EXP_CATS.map((c) => <option key={c}>{c}</option>)}</Form.Select></Col>
          <Col md={6}><Form.Label>Amount (₦)</Form.Label><Form.Control type="number" min={0} value={f.amount} onChange={set('amount')} autoFocus /></Col>
          <Col md={6}><Form.Label>Vendor</Form.Label><Form.Control value={f.vendor} onChange={set('vendor')} placeholder="optional" /></Col>
          <Col md={6}><Form.Label>Date</Form.Label><Form.Control type="date" value={f.spent_on} onChange={set('spent_on')} /></Col>
          <Col xs={12}><Form.Label>Note</Form.Label><Form.Control value={f.note} onChange={set('note')} placeholder="optional" /></Col>
        </Row>
      </Modal.Body>
      <Modal.Footer><Button variant="light" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" variant="primary" disabled={busy}>{busy ? <Spinner size="sm" /> : 'Save expense'}</Button></Modal.Footer>
    </Form></Modal>
  );
};

const FinancePage = () => {
  const [tab, setTab] = useState('payments');
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [state, setState] = useState('loading');
  const [showPay, setShowPay] = useState(false);
  const [showExp, setShowExp] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, p, e] = await Promise.all([heritApi.finance.summary(), heritApi.finance.payments(), heritApi.finance.expenses()]);
      setSummary(s); setPayments(Array.isArray(p) ? p : []); setExpenses(Array.isArray(e) ? e : []);
      setState('ready');
    } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageTItle title="Payments & Finance" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div><h4 className="mb-1">Payments &amp; Finance</h4><p className="text-muted mb-0">Money in, money out, and where the month stands.</p></div>
        <div className="d-flex gap-2">
          <Button variant="light" onClick={() => setShowExp(true)}><IconifyIcon icon="solar:cart-cross-bold" className="me-1" /> Expense</Button>
          <Button variant="primary" onClick={() => setShowPay(true)}><IconifyIcon icon="solar:wallet-money-bold" className="me-1" /> Payment</Button>
        </div>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && <Alert variant="warning"><strong>Finance offline.</strong> Upload <code>php-api/payments.php</code> and import the payments / expenses tables from <code>schema.sql</code>.</Alert>}

      {state === 'ready' && (
        <>
          <AiPanel {...FINANCE_AI} />

          <Row className="g-3 mb-3">
            <Kpi label="Money in" value={naira(summary?.in)} tone="success" icon="solar:arrow-down-bold-duotone" />
            <Kpi label="Money out" value={naira(summary?.out)} tone="danger" icon="solar:arrow-up-bold-duotone" />
            <Kpi label="Net position" value={naira(summary?.net)} tone="primary" icon="solar:wallet-bold-duotone" />
            <Kpi label="Outstanding (orders)" value={naira(summary?.outstanding)} tone="warning" icon="solar:clock-circle-bold-duotone" />
          </Row>

          <Card>
            <CardBody className="pb-0"><Nav variant="tabs" activeKey={tab} onSelect={(k) => setTab(k)}>
              <Nav.Item><Nav.Link eventKey="payments">Payments ({payments.length})</Nav.Link></Nav.Item>
              <Nav.Item><Nav.Link eventKey="expenses">Expenses ({expenses.length})</Nav.Link></Nav.Item>
            </Nav></CardBody>
            <CardBody className="p-0">
              {tab === 'payments' ? (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="table-light"><tr><th>Date</th><th>Customer</th><th>Order</th><th>Method</th><th className="text-end">Amount</th></tr></thead>
                  <tbody>
                    {payments.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">No payments yet.</td></tr>}
                    {payments.map((p) => (
                      <tr key={p.id}><td>{String(p.created_at).slice(0, 10)}</td><td>{p.customer_name || '—'}</td><td>{p.order_code ? <code>{p.order_code}</code> : '—'}</td><td className="text-capitalize">{p.method}</td><td className="text-end fw-semibold text-success">{naira(p.amount)}</td></tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="table-light"><tr><th>Date</th><th>Category</th><th>Vendor</th><th>Note</th><th className="text-end">Amount</th></tr></thead>
                  <tbody>
                    {expenses.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">No expenses yet.</td></tr>}
                    {expenses.map((e) => (
                      <tr key={e.id}><td>{String(e.spent_on).slice(0, 10)}</td><td className="text-capitalize">{e.category}</td><td>{e.vendor || '—'}</td><td className="text-muted">{e.note || '—'}</td><td className="text-end fw-semibold text-danger">{naira(e.amount)}</td></tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </>
      )}

      <PaymentModal show={showPay} onClose={() => setShowPay(false)} onDone={() => { setShowPay(false); load(); }} />
      <ExpenseModal show={showExp} onClose={() => setShowExp(false)} onDone={() => { setShowExp(false); load(); }} />
    </>
  );
};

export default FinancePage;
