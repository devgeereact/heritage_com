import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Table, Button, Spinner, Alert, Badge, Nav, Row, Col } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import AiPanel from '@/components/AiPanel';
import NewSupplierModal from './components/NewSupplierModal';
import NewPOModal from './components/NewPOModal';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

const SUPPLIERS_AI = {
  title: 'AI purchasing intelligence',
  subtitle: 'Reorder timing, price-rise watch and supplier comparison from your buying history.',
  task: 'suppliers_ai',
  cta: 'Advise',
  layout: 'list',
  sections: [
    { key: 'FORECAST', icon: 'solar:calendar-mark-bold-duotone', tone: 'primary', title: 'Reorder forecast' },
    { key: 'PRICE', icon: 'solar:graph-up-bold-duotone', tone: 'danger', title: 'Price-rise watch' },
    { key: 'COMPARE', icon: 'solar:scale-bold-duotone', tone: 'info', title: 'Supplier comparison' },
  ],
  load: () => heritApi.suppliers.list(),
  buildPrompt: (list) => {
    const rows = (Array.isArray(list) ? list : []).slice(0, 25)
      .map((s) => `${s.name} (${s.contact || 'no contact'}): ${s.po_count || 0} POs, ₦${Math.round(s.spent || 0).toLocaleString()} spent`).join('; ');
    return `Herit Clothing fabric/trim suppliers (Lagos heritage-fashion brand). ${Array.isArray(list) ? list.length : 0} suppliers: ${rows || 'none'}.

Act as the purchasing manager. Name real suppliers. Return EXACTLY these three sections, each starting with the tag on its own line then 1–2 sentences:
[FORECAST] which suppliers to reorder from soon based on spend/frequency
[PRICE] where rising fabric costs are a risk to watch
[COMPARE] which suppliers look best value and where to consolidate buying`;
  },
};
const PO_BADGE = { received: 'success', ordered: 'info', draft: 'secondary', cancelled: 'danger' };

const SuppliersPage = () => {
  const [tab, setTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState([]);
  const [pos, setPos] = useState([]);
  const [poSummary, setPoSummary] = useState(null);
  const [state, setState] = useState('loading');
  const [showSupplier, setShowSupplier] = useState(false);
  const [showPO, setShowPO] = useState(false);
  const [receiving, setReceiving] = useState(0);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([heritApi.suppliers.list(), heritApi.suppliers.poList()]);
      setSuppliers(Array.isArray(s) ? s : []);
      setPos(p.purchase_orders || []);
      setPoSummary(p.summary || null);
      setState('ready');
    } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const receive = async (id) => {
    setReceiving(id); setErrMsg('');
    try { await heritApi.suppliers.poReceive(id); await load(); }
    catch (e) { setErrMsg(e.message || 'Could not receive.'); }
    finally { setReceiving(0); }
  };

  return (
    <>
      <PageTitle title="Suppliers & Purchasing" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Suppliers &amp; Purchasing</h4>
          <p className="text-muted mb-0">Where stock comes from. Receiving an order adds to inventory.</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="light" onClick={() => setShowSupplier(true)}><IconifyIcon icon="solar:user-plus-bold" className="me-1" /> Supplier</Button>
          <Button variant="primary" onClick={() => setShowPO(true)}><IconifyIcon icon="solar:bag-check-bold" className="me-1" /> Purchase order</Button>
        </div>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && (
        <Alert variant="warning"><strong>Suppliers offline.</strong> Upload <code>php-api/suppliers.php</code> and import the suppliers / purchase-order tables from <code>schema.sql</code>.</Alert>
      )}
      {errMsg && <Alert variant="danger" dismissible onClose={() => setErrMsg('')}>{errMsg}</Alert>}

      {state === 'ready' && (
        <>
          <AiPanel {...SUPPLIERS_AI} />
          {poSummary && (
            <Row className="g-3 mb-3">
              <Col md={4}><Card><CardBody><p className="text-muted mb-1">Open orders</p><h4 className="mb-0">{poSummary.open}</h4></CardBody></Card></Col>
              <Col md={4}><Card><CardBody><p className="text-muted mb-1">Received</p><h4 className="mb-0">{poSummary.received}</h4></CardBody></Card></Col>
              <Col md={4}><Card><CardBody><p className="text-muted mb-1">Outstanding value</p><h4 className="mb-0">{naira(poSummary.outstanding)}</h4></CardBody></Card></Col>
            </Row>
          )}

          <Card>
            <CardBody className="pb-0">
              <Nav variant="tabs" activeKey={tab} onSelect={(k) => setTab(k)}>
                <Nav.Item><Nav.Link eventKey="suppliers">Suppliers ({suppliers.length})</Nav.Link></Nav.Item>
                <Nav.Item><Nav.Link eventKey="orders">Purchase Orders ({pos.length})</Nav.Link></Nav.Item>
              </Nav>
            </CardBody>
            <CardBody className="p-0">
              {tab === 'suppliers' ? (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="table-light"><tr><th>Name</th><th>Contact</th><th>Phone</th><th className="text-end">Orders</th><th className="text-end">Spent</th></tr></thead>
                  <tbody>
                    {suppliers.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">No suppliers yet.</td></tr>}
                    {suppliers.map((s) => (
                      <tr key={s.id}>
                        <td className="fw-semibold">{s.name}</td>
                        <td>{s.contact || '—'}</td>
                        <td>{s.phone || '—'}</td>
                        <td className="text-end">{s.po_count}</td>
                        <td className="text-end">{naira(s.spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="table-light"><tr><th>Code</th><th>Supplier</th><th className="text-end">Lines</th><th className="text-end">Total</th><th>Status</th><th className="text-end">Action</th></tr></thead>
                  <tbody>
                    {pos.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">No purchase orders yet.</td></tr>}
                    {pos.map((p) => (
                      <tr key={p.id}>
                        <td><code>{p.code}</code></td>
                        <td>{p.supplier_name}</td>
                        <td className="text-end">{p.unit_count}</td>
                        <td className="text-end">{naira(p.total)}</td>
                        <td><Badge bg={PO_BADGE[p.status] || 'secondary'} className="bg-opacity-75 text-capitalize">{p.status}</Badge></td>
                        <td className="text-end">
                          {p.status !== 'received' && p.status !== 'cancelled' && (
                            <Button size="sm" variant="outline-success" disabled={receiving === p.id} onClick={() => receive(p.id)}>
                              {receiving === p.id ? <Spinner size="sm" /> : <><IconifyIcon icon="solar:box-bold" className="me-1" /> Receive</>}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </>
      )}

      <NewSupplierModal show={showSupplier} onClose={() => setShowSupplier(false)} onDone={() => { setShowSupplier(false); load(); }} />
      <NewPOModal show={showPO} onClose={() => setShowPO(false)} onDone={() => { setShowPO(false); load(); }} suppliers={suppliers} />
    </>
  );
};

export default SuppliersPage;
