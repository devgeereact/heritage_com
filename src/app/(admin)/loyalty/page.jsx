import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Table, Button, Spinner, Alert, Badge, Form, Modal, Row, Col, Tabs, Tab, InputGroup } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

/* ---- Store credit ---------------------------------------------------------*/
const AdjustModal = ({ show, onHide, customer, onSaved }) => {
  const [amount, setAmount] = useState('');
  const [sign, setSign] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const { showNotification } = useNotificationContext();

  useEffect(() => { if (show) { setAmount(''); setSign(1); setNote(''); } }, [show]);

  const save = async () => {
    const delta = (Number(amount) || 0) * sign;
    if (!delta) { showNotification({ message: 'Enter an amount', variant: 'danger' }); return; }
    setBusy(true);
    try {
      await heritApi.loyalty.adjust({ customer_id: customer.customer_id, delta, reason: sign > 0 ? 'adjust' : 'redeem', note });
      showNotification({ message: 'Credit updated', variant: 'success' });
      onSaved(); onHide();
    } catch (e) { showNotification({ message: e.message || 'Could not update', variant: 'danger' }); }
    finally { setBusy(false); }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton><Modal.Title>Adjust credit — {customer?.name}</Modal.Title></Modal.Header>
      <Modal.Body>
        <p className="text-muted small">Current balance: <strong>{naira(customer?.balance)}</strong></p>
        <InputGroup className="mb-2">
          <Button variant={sign > 0 ? 'success' : 'outline-secondary'} onClick={() => setSign(1)}>+ Add</Button>
          <Button variant={sign < 0 ? 'danger' : 'outline-secondary'} onClick={() => setSign(-1)}>− Deduct</Button>
          <InputGroup.Text>₦</InputGroup.Text>
          <Form.Control type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </InputGroup>
        <Form.Control placeholder="Note (refund, goodwill, gifting…)" value={note} onChange={(e) => setNote(e.target.value)} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={busy}>{busy ? <Spinner size="sm" /> : 'Save'}</Button>
      </Modal.Footer>
    </Modal>
  );
};

const StoreCredit = () => {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [target, setTarget] = useState(null);
  const load = useCallback(async () => {
    try { setRows(await heritApi.loyalty.balances()); setState('ready'); } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (state === 'loading') return <div className="text-center py-4"><Spinner /></div>;
  if (state === 'offline') return <Alert variant="warning" className="mb-0"><strong>Offline.</strong> Upload <code>loyalty.php</code> + import <code>schema_phase6.sql</code>.</Alert>;

  return (
    <>
      <Table responsive hover className="mb-0 align-middle">
        <thead className="table-light"><tr><th>Customer</th><th>Phone</th><th className="text-end">Balance</th><th>Last move</th><th></th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">No store credit issued yet. Add some below or via a refund.</td></tr>}
          {rows.map((r) => (
            <tr key={r.customer_id}>
              <td className="fw-semibold">{r.name}</td>
              <td className="text-muted small">{r.phone || '—'}</td>
              <td className="text-end"><Badge bg={r.balance > 0 ? 'success' : 'secondary'} className="bg-opacity-75">{naira(r.balance)}</Badge></td>
              <td className="text-muted small">{r.last_at}</td>
              <td className="text-end"><Button size="sm" variant="light" onClick={() => setTarget(r)}>Adjust</Button></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <AdjustModal show={!!target} onHide={() => setTarget(null)} customer={target} onSaved={load} />
    </>
  );
};

/* ---- Gift cards -----------------------------------------------------------*/
const GiftCards = () => {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try { setRows(await heritApi.loyalty.giftList()); setState('ready'); } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const issue = async () => {
    if (!(Number(amount) > 0)) { showNotification({ message: 'Enter an amount', variant: 'danger' }); return; }
    setBusy(true);
    try {
      const r = await heritApi.loyalty.giftIssue({ amount: Number(amount), recipient_name: recipient, message });
      showNotification({ message: `Issued ${r.code} (${naira(r.balance)})`, variant: 'success' });
      setAmount(''); setRecipient(''); setMessage(''); load();
    } catch (e) { showNotification({ message: e.message || 'Could not issue', variant: 'danger' }); }
    finally { setBusy(false); }
  };
  const toggle = async (g) => {
    const active = !Number(g.active);
    setRows((prev) => prev.map((x) => (x.id === g.id ? { ...x, active: active ? 1 : 0 } : x)));
    try { await heritApi.loyalty.giftToggle(g.id, active ? 1 : 0); } catch { load(); }
  };
  const copy = (code) => { navigator.clipboard?.writeText(code); showNotification({ message: `Copied ${code}`, variant: 'success' }); };

  if (state === 'offline') return <Alert variant="warning" className="mb-0"><strong>Offline.</strong> Upload <code>loyalty.php</code> + import <code>schema_phase6.sql</code>.</Alert>;

  return (
    <Row className="g-3">
      <Col lg={4}>
        <Card><CardBody>
          <h6 className="mb-3">Issue a gift card</h6>
          <Form.Label className="small text-muted mb-1">Amount (₦)</Form.Label>
          <Form.Control type="number" min="0" className="mb-2" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Form.Label className="small text-muted mb-1">Recipient (optional)</Form.Label>
          <Form.Control className="mb-2" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <Form.Label className="small text-muted mb-1">Message (optional)</Form.Label>
          <Form.Control as="textarea" rows={2} className="mb-3" value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button variant="primary" className="w-100" onClick={issue} disabled={busy}>{busy ? <Spinner size="sm" /> : 'Issue gift card'}</Button>
        </CardBody></Card>
      </Col>
      <Col lg={8}>
        <Card><CardBody className="p-0">
          {state === 'loading' ? <div className="text-center py-4"><Spinner /></div> : (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light"><tr><th>Code</th><th className="text-end">Balance</th><th className="text-end">Issued</th><th>Recipient</th><th>Active</th></tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">No gift cards yet.</td></tr>}
                {rows.map((g) => (
                  <tr key={g.id}>
                    <td><span className="fw-semibold" role="button" onClick={() => copy(g.code)} title="Copy">{g.code} <IconifyIcon icon="solar:copy-linear" className="text-muted" /></span></td>
                    <td className="text-end">{naira(g.balance)}</td>
                    <td className="text-end text-muted">{naira(g.initial_amount)}</td>
                    <td className="small">{g.recipient_name || '—'}</td>
                    <td><Form.Check type="switch" checked={!!Number(g.active)} onChange={() => toggle(g)} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody></Card>
      </Col>
    </Row>
  );
};

/* ---- Referrals ------------------------------------------------------------*/
const Referrals = () => {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try { setData(await heritApi.referrals.leaderboard()); setState('ready'); } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const copy = (code) => { navigator.clipboard?.writeText(code); showNotification({ message: `Copied ${code}`, variant: 'success' }); };

  if (state === 'loading') return <div className="text-center py-4"><Spinner /></div>;
  if (state === 'offline') return <Alert variant="warning" className="mb-0"><strong>Offline.</strong> Upload <code>referrals.php</code> + import <code>schema_phase7.sql</code>.</Alert>;

  const off = !data.reward;
  return (
    <>
      {off && <Alert variant="info">Referrals are configured but <strong>off</strong> — set <code>REFERRAL_REWARD</code> in <code>config.php</code> (e.g. 2000) to start paying out.</Alert>}
      <Row className="g-3 mb-3">
        <Col sm={4}><Card className="h-100"><CardBody><div className="text-muted small">Reward each side</div><h4 className="mb-0">{naira(data.reward)}</h4></CardBody></Card></Col>
        <Col sm={4}><Card className="h-100"><CardBody><div className="text-muted small">Active referrers</div><h4 className="mb-0">{data.referrers.length}</h4></CardBody></Card></Col>
        <Col sm={4}><Card className="h-100"><CardBody><div className="text-muted small">Pending (unpaid orders)</div><h4 className="mb-0">{data.pending}</h4></CardBody></Card></Col>
      </Row>
      <Card><CardBody className="p-0">
        <Table responsive hover className="mb-0 align-middle">
          <thead className="table-light"><tr><th>Referrer</th><th>Code</th><th className="text-center">Friends referred</th><th className="text-end">Credit earned</th></tr></thead>
          <tbody>
            {data.referrers.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-4">No paid referrals yet. Share codes from a customer&apos;s profile.</td></tr>}
            {data.referrers.map((r) => (
              <tr key={r.customer_id}>
                <td className="fw-semibold">{r.name}<div className="text-muted small">{r.phone || '—'}</div></td>
                <td>{r.code ? <span role="button" onClick={() => copy(r.code)} title="Copy">{r.code} <IconifyIcon icon="solar:copy-linear" className="text-muted" /></span> : '—'}</td>
                <td className="text-center"><Badge bg="primary" className="bg-opacity-75">{r.referred}</Badge></td>
                <td className="text-end">{naira(r.earned)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardBody></Card>
    </>
  );
};

const LoyaltyPage = () => (
  <>
    <PageTItle title="Loyalty & Gift Cards" />
    <div className="mb-3">
      <h4 className="mb-1">Loyalty &amp; Gift Cards</h4>
      <p className="text-muted mb-0">Store credit and digital gift cards — redeemable at storefront checkout.</p>
    </div>
    <Tabs defaultActiveKey="credit" className="mb-3">
      <Tab eventKey="credit" title="Store credit">
        <Card><CardBody className="p-0"><StoreCredit /></CardBody></Card>
      </Tab>
      <Tab eventKey="gift" title="Gift cards">
        <GiftCards />
      </Tab>
      <Tab eventKey="referrals" title="Referrals">
        <Referrals />
      </Tab>
    </Tabs>
  </>
);

export default LoyaltyPage;
