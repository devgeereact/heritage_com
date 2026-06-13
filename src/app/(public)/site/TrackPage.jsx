import { useState } from 'react';
import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';
import SiteLayout from './SiteLayout';

// Customer-facing order tracking. No login: a customer looks their order up with
// the code from their confirmation + the phone they ordered with. store.php only
// returns the order if the phone matches, so this can't be used to browse others'.

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

const field = {
  width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid var(--border)',
  borderRadius: 8, fontSize: '0.95rem', background: 'var(--background)', color: 'var(--foreground)',
  fontFamily: 'inherit', marginTop: '0.35rem',
};
const lbl = { fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-foreground)' };

// The fulfilment pipeline as the customer should understand it. 'cancelled' and
// the return states are handled separately below.
const PIPELINE = [
  { key: 'pending', label: 'Order placed', icon: 'solar:cart-check-bold' },
  { key: 'paid', label: 'Payment confirmed', icon: 'solar:card-bold' },
  { key: 'making', label: 'Being prepared', icon: 'solar:scissors-bold' },
  { key: 'packing', label: 'Packing', icon: 'solar:box-bold' },
  { key: 'shipped', label: 'On its way', icon: 'solar:delivery-bold' },
  { key: 'delivered', label: 'Delivered', icon: 'solar:check-circle-bold' },
];

const TrackPage = () => {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const lookup = async (e) => {
    e.preventDefault();
    setError(''); setOrder(null); setBusy(true);
    try {
      const res = await heritApi.store.track(code.trim(), phone.trim());
      setOrder(res);
    } catch (err) {
      setError(err.message || 'No order found for that code and phone.');
    } finally { setBusy(false); }
  };

  const currentIdx = order ? PIPELINE.findIndex((s) => s.key === order.status) : -1;
  const cancelled = order?.status === 'cancelled';

  return (
    <SiteLayout title="Track your order">
      <section className="hc-pagehead">
        <div className="hc-container">
          <div className="hc-crumb"><Link to="/">Home</Link> / <span>Track order</span></div>
          <h1 className="hc-h1">Where&apos;s my order?</h1>
          <p>Enter your order code and the phone number you used at checkout to see the latest.</p>
        </div>
      </section>

      <section className="hc-section">
        <div className="hc-container" style={{ maxWidth: 720 }}>
          <form onSubmit={lookup} className="hc-card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
            <div className="hc-grid hc-grid--2" style={{ gap: '1rem' }}>
              <label style={lbl}>Order code
                <input style={field} placeholder="e.g. ORD-0042" value={code} onChange={(e) => setCode(e.target.value)} required />
              </label>
              <label style={lbl}>Phone number
                <input style={field} placeholder="e.g. 0803…" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </label>
            </div>
            <button type="submit" className="hc-btn hc-btn--primary" disabled={busy}>
              {busy ? 'Looking…' : 'Track order'}
            </button>
            {error && <p style={{ color: '#9b2c2c', margin: 0 }}><IconifyIcon icon="solar:danger-circle-bold" /> {error}</p>}
          </form>

          {order && (
            <div className="hc-card mt-4" style={{ padding: '1.5rem' }}>
              <div className="d-flex justify-content-between align-items-start flex-wrap" style={{ gap: '.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{order.code}</div>
                  <div className="text-muted small">Placed {order.placed_at}</div>
                </div>
                <div style={{ fontWeight: 700 }}>{naira(order.total)}</div>
              </div>

              {cancelled ? (
                <p className="mt-3" style={{ color: '#9b2c2c' }}><IconifyIcon icon="solar:close-circle-bold" /> This order was cancelled. Contact us if that&apos;s unexpected.</p>
              ) : (
                <ol style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0 0' }}>
                  {PIPELINE.map((s, i) => {
                    const done = i <= currentIdx;
                    const current = i === currentIdx;
                    return (
                      <li key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.4rem 0', opacity: done ? 1 : 0.4 }}>
                        <span style={{
                          width: 30, height: 30, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: done ? '#9b2c2c' : '#e9e1d8', color: done ? '#fff' : '#9b8e83',
                          boxShadow: current ? '0 0 0 4px rgba(155,44,44,.15)' : 'none',
                        }}><IconifyIcon icon={s.icon} /></span>
                        <span style={{ fontWeight: current ? 700 : 500 }}>{s.label}</span>
                      </li>
                    );
                  })}
                </ol>
              )}

              {order.tracking_ref && (
                <div className="mt-3 p-3" style={{ background: '#faf5f0', borderRadius: 8 }}>
                  <div className="small text-muted text-uppercase">Shipment</div>
                  <div><strong>{order.courier || 'Courier'}</strong> · {order.tracking_ref}</div>
                  {order.tracking_url && (
                    <a className="hc-btn hc-btn--ghost mt-2" href={order.tracking_url} target="_blank" rel="noreferrer">
                      Track parcel with courier <IconifyIcon icon="solar:arrow-right-up-linear" />
                    </a>
                  )}
                </div>
              )}

              {order.return_status && order.return_status !== 'none' && (
                <p className="mt-3 small"><IconifyIcon icon="solar:refresh-bold" className="me-1" />
                  Return status: <strong className="text-capitalize">{order.return_status}</strong>
                </p>
              )}

              {(order.items || []).length > 0 && (
                <div className="mt-3">
                  <div className="small text-muted text-uppercase">Items</div>
                  <ul style={{ margin: '.25rem 0 0', paddingLeft: '1.1rem' }}>
                    {order.items.map((it, i) => <li key={i}>{it.qty} × {it.label}</li>)}
                  </ul>
                </div>
              )}

              <p className="mt-3 mb-0 small text-muted">
                Questions? <Link to="/contact">Message us</Link> with your order code.
              </p>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};

export default TrackPage;
