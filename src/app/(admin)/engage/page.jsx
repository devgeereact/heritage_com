import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Table, Button, Spinner, Alert, Badge, Tabs, Tab } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

/* ---- Restock waitlist -----------------------------------------------------*/
const Waitlist = () => {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState('');
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try { setData(await heritApi.engage.waitlist()); setState('ready'); } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const notify = async (row) => {
    if (!window.confirm(`Message everyone waiting for ${row.product || row.ref}?`)) return;
    setBusy(row.ref);
    try {
      const r = await heritApi.engage.waitlistNotify({ slug: row.slug || '', product: row.slug ? '' : row.product });
      if (r.manual > 0 && r.links?.length) r.links.forEach((l) => window.open(l.wa_link, '_blank', 'noopener'));
      showNotification({ message: `${r.sent} sent, ${r.manual} to send manually`, variant: 'success' });
      load();
    } catch (e) { showNotification({ message: e.message || 'Could not notify', variant: 'danger' }); }
    finally { setBusy(''); }
  };

  if (state === 'loading') return <div className="text-center py-4"><Spinner /></div>;
  if (state === 'offline') return <Alert variant="warning" className="mb-0"><strong>Offline.</strong> Upload <code>engage.php</code> + <code>store.php</code>, import <code>schema_phase8.sql</code>.</Alert>;

  return (
    <>
      <Card className="mb-3"><CardBody className="p-0">
        <div className="p-3 pb-2"><h6 className="mb-0">Interest by piece</h6></div>
        <Table responsive hover className="mb-0 align-middle">
          <thead className="table-light"><tr><th>Piece</th><th className="text-center">Waiting</th><th className="text-center">Total</th><th></th></tr></thead>
          <tbody>
            {(data.summary || []).length === 0 && <tr><td colSpan={4} className="text-center text-muted py-4">No one waiting yet. The “Notify me” button on product pages feeds this.</td></tr>}
            {(data.summary || []).map((s) => (
              <tr key={s.ref}>
                <td className="fw-semibold">{s.product || s.ref}{s.slug && <span className="text-muted small"> · {s.slug}</span>}</td>
                <td className="text-center"><Badge bg={s.waiting > 0 ? 'primary' : 'secondary'} className="bg-opacity-75">{s.waiting}</Badge></td>
                <td className="text-center text-muted">{s.total}</td>
                <td className="text-end">
                  <Button size="sm" variant="success" disabled={s.waiting === 0 || busy === s.ref} onClick={() => notify(s)}>
                    {busy === s.ref ? <Spinner size="sm" /> : <><IconifyIcon icon="mdi:whatsapp" className="me-1" /> Notify {s.waiting}</>}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardBody></Card>

      <Card><CardBody className="p-0">
        <div className="p-3 pb-2"><h6 className="mb-0">Everyone waiting</h6></div>
        <Table responsive hover className="mb-0 align-middle">
          <thead className="table-light"><tr><th>Name</th><th>Phone</th><th>Piece</th><th>Size</th><th>Status</th></tr></thead>
          <tbody>
            {(data.rows || []).map((r) => (
              <tr key={r.id}>
                <td>{r.customer_name || '—'}</td>
                <td className="text-muted small">{r.phone || r.email || '—'}</td>
                <td>{r.product}</td>
                <td>{r.size || '—'}</td>
                <td>{Number(r.notified) ? <Badge bg="success" className="bg-opacity-75">Notified</Badge> : <Badge bg="warning" className="bg-opacity-75">Waiting</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardBody></Card>
    </>
  );
};

/* ---- Abandoned carts ------------------------------------------------------*/
const Abandoned = () => {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(0);
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try { setRows(await heritApi.engage.abandoned()); setState('ready'); } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const nudge = async (c) => {
    setBusy(c.id);
    try {
      const r = await heritApi.engage.abandonedNudge(c.id);
      if (r.status === 'manual' && r.wa_link) window.open(r.wa_link, '_blank', 'noopener');
      showNotification({ message: r.status === 'sent' ? 'Nudge sent on WhatsApp' : 'Opening WhatsApp to send', variant: 'success' });
      setRows((prev) => prev.map((x) => (x.id === c.id ? { ...x, nudged: 1 } : x)));
    } catch (e) { showNotification({ message: e.message || 'Could not nudge', variant: 'danger' }); }
    finally { setBusy(0); }
  };

  if (state === 'loading') return <div className="text-center py-4"><Spinner /></div>;
  if (state === 'offline') return <Alert variant="warning" className="mb-0"><strong>Offline.</strong> Upload <code>engage.php</code> + <code>store.php</code>, import <code>schema_phase8.sql</code>.</Alert>;

  return (
    <Card><CardBody className="p-0">
      <Table responsive hover className="mb-0 align-middle">
        <thead className="table-light"><tr><th>Customer</th><th>Phone</th><th>Basket</th><th className="text-end">Value</th><th>Left</th><th></th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">No abandoned carts (older than 20 min, unrecovered). 👍</td></tr>}
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.customer_name || '—'}</td>
              <td className="text-muted small">{c.phone}</td>
              <td className="small">{(c.items || []).map((i) => `${i.qty}× ${i.name}`).join(', ') || '—'}</td>
              <td className="text-end">{naira(c.subtotal)}</td>
              <td className="text-muted small">{c.updated_at}</td>
              <td className="text-end">
                <Button size="sm" variant={Number(c.nudged) ? 'light' : 'success'} disabled={busy === c.id} onClick={() => nudge(c)}>
                  {busy === c.id ? <Spinner size="sm" /> : <><IconifyIcon icon="mdi:whatsapp" className="me-1" />{Number(c.nudged) ? 'Nudge again' : 'Nudge'}</>}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </CardBody></Card>
  );
};

const EngagePage = () => (
  <>
    <PageTItle title="Re-engagement" />
    <div className="mb-3">
      <h4 className="mb-1">Re-engagement</h4>
      <p className="text-muted mb-0">Win back baskets and tell waiting customers when a piece is back.</p>
    </div>
    <Tabs defaultActiveKey="abandoned" className="mb-3">
      <Tab eventKey="abandoned" title="Abandoned carts"><Abandoned /></Tab>
      <Tab eventKey="waitlist" title="Restock waitlist"><Waitlist /></Tab>
    </Tabs>
  </>
);

export default EngagePage;
