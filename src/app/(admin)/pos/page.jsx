import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardBody, Button, Spinner, Alert, Row, Col, Form, Table, Badge } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import AiPanel from '@/components/AiPanel';
import { cacheCatalogue, readCatalogue, readQueue, writeQueue, enqueueSale, isNetworkError } from './offline';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const PAY = ['cash', 'transfer', 'card'];

const POS_AI = {
  title: 'AI till insights',
  subtitle: 'End-of-day reconciliation, busy hours and what to bundle at the stall.',
  task: 'pos_ai',
  cta: 'Read the stall',
  sections: [
    { key: 'RECONCILE', icon: 'solar:checklist-bold-duotone', tone: 'primary', title: 'Daily reconciliation' },
    { key: 'BUSY', icon: 'solar:clock-circle-bold-duotone', tone: 'info', title: 'Busy hours' },
    { key: 'BUNDLE', icon: 'solar:bag-smile-bold-duotone', tone: 'success', title: 'Bundle suggestions' },
  ],
  load: () => heritApi.orders.list(),
  buildPrompt: (list) => {
    const market = (Array.isArray(list) ? list : []).filter((o) => o.channel === 'market').slice(0, 30);
    const rows = market.map((o) => `${o.code} ₦${Math.round(o.total || 0).toLocaleString()} ${o.payment_method}, ${o.unit_count || 0}u @ ${String(o.created_at || '').slice(0, 16)}`).join('; ');
    return `Herit Clothing market stall (Ajuwon Market, Lagos) — point-of-sale orders (channel=market). Recent market sales: ${rows || 'none yet'}.

Act as the stall manager. Return EXACTLY these three sections, each starting with the tag on its own line then 1–2 sentences:
[RECONCILE] what cash/transfer/card should total for the recent sales, and anything to double-check
[BUSY] which hours/days the stall sells most, from the timestamps
[BUNDLE] which pieces to sell together at the till to lift the basket`;
  },
};

/**
 * Market & In-Person Sales (POS). A fast counter screen: tap a variant to add
 * it, take a name + payment, and ring it up through the live orders endpoint
 * (channel = market), which deducts stock automatically.
 */
const PosPage = () => {
  const [variants, setVariants] = useState([]);
  const [state, setState] = useState('loading');
  const [q, setQ] = useState('');
  const [cart, setCart] = useState([]);          // { variant, qty }
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState('');
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [queued, setQueued] = useState(readQueue().length);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await heritApi.inventory.list();
      const vs = r.variants || [];
      setVariants(vs);
      cacheCatalogue(vs);          // keep a local copy for offline trading
      setState('ready');
    } catch {
      // No signal — fall back to the last cached catalogue so the till still works.
      const cached = readCatalogue();
      if (cached.length) { setVariants(cached); setState('ready'); }
      else setState('offline');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Push any sales taken offline up to the server, oldest first. Stops on the
  // first network failure so the queue order is preserved.
  const flushQueue = useCallback(async () => {
    const q = readQueue();
    if (!q.length || syncing) return;
    setSyncing(true);
    const remaining = [...q];
    try {
      while (remaining.length) {
        await heritApi.orders.create(remaining[0]);
        remaining.shift();
        writeQueue(remaining);
        setQueued(remaining.length);
      }
      await load();               // refresh live stock after syncing
    } catch {
      writeQueue(remaining);      // keep what's left for the next attempt
      setQueued(remaining.length);
    } finally {
      setSyncing(false);
    }
  }, [load, syncing]);

  // Track connectivity; flush automatically when the signal returns.
  useEffect(() => {
    const goOnline = () => { setOnline(true); flushQueue(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    if (navigator.onLine && readQueue().length) flushQueue();
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, [flushQueue]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const inStock = variants.filter((v) => v.stock > 0);
    if (!t) return inStock.slice(0, 24);
    return inStock.filter((v) => `${v.product_name} ${v.sku} ${v.size} ${v.color}`.toLowerCase().includes(t)).slice(0, 24);
  }, [variants, q]);

  const add = (v) => setCart((c) => {
    const ex = c.find((x) => x.variant.id === v.id);
    if (ex) return c.map((x) => (x.variant.id === v.id ? { ...x, qty: Math.min(x.qty + 1, v.stock) } : x));
    return [...c, { variant: v, qty: 1 }];
  });
  const setQty = (id, qty) => setCart((c) => c.map((x) => (x.variant.id === id ? { ...x, qty: Math.max(1, Math.min(Number(qty) || 1, x.variant.stock)) } : x)));
  const remove = (id) => setCart((c) => c.filter((x) => x.variant.id !== id));

  const total = cart.reduce((s, x) => s + x.qty * x.variant.price, 0);

  // Optimistically draw down the local catalogue so the grid + stock badges
  // stay honest while offline (the server reconciles on sync).
  const decrementLocal = (items) => setVariants((vs) => vs.map((v) => {
    const sold = items.find((i) => i.variant_id === v.id);
    return sold ? { ...v, stock: Math.max(0, v.stock - sold.qty) } : v;
  }));

  const checkout = async () => {
    if (!cart.length) { setErr('Cart is empty.'); return; }
    if (!customer.trim()) { setErr('Enter a customer name (walk-in is fine).'); return; }
    setBusy(true); setErr('');
    const items = cart.map((x) => ({ variant_id: x.variant.id, label: `${x.variant.product_name} — ${x.variant.size || 'OS'} / ${x.variant.color || 'Default'}`, sku: x.variant.sku, qty: x.qty, unit_price: x.variant.price }));
    const sale = { customer: customer.trim(), phone, channel: 'market', payment_method: method, items };
    const saleTotal = total;

    const queueIt = () => {
      const n = enqueueSale(sale);
      setQueued(n);
      decrementLocal(items);
      cacheCatalogue(variants.map((v) => { const s = items.find((i) => i.variant_id === v.id); return s ? { ...v, stock: Math.max(0, v.stock - s.qty) } : v; }));
      setDone({ code: 'OFFLINE', total: saleTotal, offline: true });
      setCart([]); setCustomer(''); setPhone('');
    };

    // Offline up front → don't even try the network, just queue.
    if (!online) { queueIt(); setBusy(false); return; }
    try {
      const res = await heritApi.orders.create(sale);
      setDone(res); setCart([]); setCustomer(''); setPhone('');
      load();
    } catch (e) {
      if (isNetworkError(e)) { queueIt(); }       // lost signal mid-sale → queue it
      else setErr(e.message || 'Could not complete sale.');
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageTItle title="Market Sales (POS)" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <h4 className="mb-1">Market &amp; In-Person Sales</h4>
          <Badge bg={online ? 'success' : 'secondary'} className="bg-opacity-75">
            <IconifyIcon icon={online ? 'solar:wifi-router-bold' : 'solar:wifi-router-minimalistic-bold'} className="me-1" />{online ? 'Online' : 'Offline'}
          </Badge>
        </div>
        <Button variant="light" onClick={load} disabled={state === 'loading'}><IconifyIcon icon="solar:refresh-bold" className="me-1" /> Refresh</Button>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && <Alert variant="warning"><strong>POS offline.</strong> No signal and no cached catalogue yet — open this page once online so it can save a copy for the stall.</Alert>}
      {queued > 0 && (
        <Alert variant="info" className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span><IconifyIcon icon="solar:clock-circle-bold" className="me-1" /><strong>{queued} sale{queued === 1 ? '' : 's'} waiting to sync.</strong> Held safely on this device until the signal returns.</span>
          <Button size="sm" variant="info" disabled={!online || syncing} onClick={flushQueue}>{syncing ? <><Spinner size="sm" className="me-1" /> Syncing…</> : 'Sync now'}</Button>
        </Alert>
      )}
      {done && <Alert variant="success" onClose={() => setDone(null)} dismissible>
        {done.offline
          ? <><strong>Sale saved offline — {naira(done.total)}.</strong> It will sync when the stall is back online.</>
          : <><strong>Sale {done.code} rung up — {naira(done.total)}.</strong> Stock updated.</>}
      </Alert>}

      {state === 'ready' && <AiPanel {...POS_AI} />}

      {state === 'ready' && (
        <Row className="g-3">
          {/* product grid */}
          <Col lg={7}>
            <Card><CardBody>
              <Form.Control className="mb-3" placeholder="Search product, SKU, size, colour…" value={q} onChange={(e) => setQ(e.target.value)} />
              <Row className="g-2">
                {shown.length === 0 && <p className="text-muted">No items in stock match.</p>}
                {shown.map((v) => (
                  <Col xs={6} md={4} key={v.id}>
                    <button type="button" className="btn btn-light w-100 h-100 text-start p-2 border" onClick={() => add(v)}>
                      <div className="fw-semibold text-truncate">{v.product_name}</div>
                      <div className="small text-muted">{v.size || 'OS'} / {v.color || 'Default'}</div>
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <span className="text-primary fw-semibold">{naira(v.price)}</span>
                        <Badge bg={v.stock <= 5 ? 'warning' : 'light'} text={v.stock <= 5 ? 'dark' : 'dark'}>{v.stock} left</Badge>
                      </div>
                    </button>
                  </Col>
                ))}
              </Row>
            </CardBody></Card>
          </Col>

          {/* cart */}
          <Col lg={5}>
            <Card><CardBody>
              <h5 className="mb-3">Cart</h5>
              {err && <Alert variant="danger" className="py-2">{err}</Alert>}
              {cart.length === 0 ? <p className="text-muted">Tap items to add them.</p> : (
                <Table size="sm" className="align-middle mb-3">
                  <tbody>
                    {cart.map((x) => (
                      <tr key={x.variant.id}>
                        <td><div className="fw-semibold small">{x.variant.product_name}</div><div className="text-muted" style={{ fontSize: 11 }}>{x.variant.size || 'OS'}/{x.variant.color || '—'}</div></td>
                        <td style={{ width: 70 }}><Form.Control size="sm" type="number" min={1} max={x.variant.stock} value={x.qty} onChange={(e) => setQty(x.variant.id, e.target.value)} /></td>
                        <td className="text-end small fw-semibold">{naira(x.qty * x.variant.price)}</td>
                        <td><Button size="sm" variant="link" className="text-danger p-0" onClick={() => remove(x.variant.id)}><IconifyIcon icon="solar:close-circle-bold" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              <div className="d-flex justify-content-between fs-5 fw-bold border-top pt-2 mb-3"><span>Total</span><span>{naira(total)}</span></div>
              <Row className="g-2 mb-2">
                <Col xs={7}><Form.Control placeholder="Customer (or Walk-in)" value={customer} onChange={(e) => setCustomer(e.target.value)} /></Col>
                <Col xs={5}><Form.Select value={method} onChange={(e) => setMethod(e.target.value)} className="text-capitalize">{PAY.map((m) => <option key={m}>{m}</option>)}</Form.Select></Col>
                <Col xs={12}><Form.Control placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} /></Col>
              </Row>
              <Button variant="primary" className="w-100" disabled={busy || !cart.length} onClick={checkout}>
                {busy ? <><Spinner size="sm" className="me-1" /> Ringing up…</> : <><IconifyIcon icon="solar:bag-check-bold" className="me-1" /> Complete sale · {naira(total)}</>}
              </Button>
            </CardBody></Card>
          </Col>
        </Row>
      )}
    </>
  );
};

export default PosPage;
