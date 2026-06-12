import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Button, Spinner, Alert, Row, Col, Form } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';

const CHANNELS = [
  { key: 'web', label: 'Online store', icon: 'solar:global-bold', desc: 'heritclothing.com storefront' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'mdi:whatsapp', desc: 'Orders & enquiries by chat' },
  { key: 'instagram', label: 'Instagram', icon: 'solar:instagram-bold', desc: 'Social selling & DMs' },
  { key: 'market', label: 'Market floor (POS)', icon: 'solar:shop-bold', desc: 'In-person at Ajuwon Market' },
  { key: 'phone', label: 'Phone', icon: 'solar:phone-bold', desc: 'Call-in orders' },
];

const ChannelsPage = () => {
  const [s, setS] = useState({ store_name: '', currency: 'NGN', free_ship_threshold: '', channels: {} });
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await heritApi.settings.get();
      setS({ store_name: r.store_name || '', currency: r.currency || 'NGN', free_ship_threshold: r.free_ship_threshold || '', channels: r.channels || {} });
      setState('ready');
    } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (k) => setS((o) => ({ ...o, channels: { ...o.channels, [k]: !o.channels[k] } }));

  const save = async () => {
    setBusy(true); setErr(''); setSaved(false);
    try { await heritApi.settings.save(s); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (e) { setErr(e.message || 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageTItle title="Store & Channels" />
      <div className="mb-3"><h4 className="mb-1">Online Store &amp; Channels</h4><p className="text-muted mb-0">Where Herit sells, and the store basics behind it.</p></div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && <Alert variant="warning"><strong>Settings offline.</strong> Upload <code>php-api/settings.php</code> and import the settings table from <code>schema.sql</code>.</Alert>}

      {state === 'ready' && (
        <Row className="g-3">
          <Col lg={7}>
            <Card><CardBody>
              <h5 className="mb-3">Sales channels</h5>
              {CHANNELS.map((c) => (
                <div key={c.key} className="d-flex align-items-center justify-content-between py-2 border-bottom">
                  <div className="d-flex align-items-center gap-3">
                    <span className="avatar-sm d-inline-flex align-items-center justify-content-center rounded bg-primary-subtle text-primary fs-4"><IconifyIcon icon={c.icon} /></span>
                    <div><div className="fw-semibold">{c.label}</div><div className="text-muted small">{c.desc}</div></div>
                  </div>
                  <Form.Check type="switch" checked={!!s.channels[c.key]} onChange={() => toggle(c.key)} />
                </div>
              ))}
            </CardBody></Card>
          </Col>
          <Col lg={5}>
            <Card><CardBody>
              <h5 className="mb-3">Store basics</h5>
              <Form.Group className="mb-3"><Form.Label>Store name</Form.Label><Form.Control value={s.store_name} onChange={(e) => setS((o) => ({ ...o, store_name: e.target.value }))} /></Form.Group>
              <Row className="g-2">
                <Col xs={6}><Form.Group className="mb-3"><Form.Label>Currency</Form.Label><Form.Control value={s.currency} onChange={(e) => setS((o) => ({ ...o, currency: e.target.value }))} /></Form.Group></Col>
                <Col xs={6}><Form.Group className="mb-3"><Form.Label>Free ship over</Form.Label><Form.Control type="number" value={s.free_ship_threshold} onChange={(e) => setS((o) => ({ ...o, free_ship_threshold: e.target.value }))} /></Form.Group></Col>
              </Row>
              {err && <Alert variant="danger" className="py-2">{err}</Alert>}
              <Button variant="primary" className="w-100" onClick={save} disabled={busy}>
                {busy ? <Spinner size="sm" /> : saved ? <><IconifyIcon icon="solar:check-circle-bold" className="me-1" /> Saved</> : 'Save settings'}
              </Button>
            </CardBody></Card>
          </Col>
        </Row>
      )}
    </>
  );
};

export default ChannelsPage;
