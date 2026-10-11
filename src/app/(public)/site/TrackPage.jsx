import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import IconifyIcon from './ui/Icon';
import heritApi from '@/helpers/heritApi';
import './portal/portal.css';
import SiteLayout from './SiteLayout';
import AccessForm from './portal/AccessForm';
import { signedIn } from './portal/session';

// Track your job: the verified two-step access form (reference plus contact, then
// an emailed code) opens the client portal. The older shop-order lookup (reference
// plus phone through store.php, which only answers when the phone matches) stays
// below for retail orders.

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

// Inputs use the shared .hc-input style (16px text, 48px tall).
const field = { marginTop: '0.35rem' };
const lbl = { fontSize: 'var(--hc-text-sm)', fontWeight: 'var(--hc-w-medium)', color: 'var(--hc-text)' };

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
  const navigate = useNavigate();
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
      setError(err.message || 'No order found for that reference and phone.');
    } finally { setBusy(false); }
  };

  const currentIdx = order ? PIPELINE.findIndex((s) => s.key === order.status) : -1;
  const cancelled = order?.status === 'cancelled';

  return (
    <SiteLayout title="Track your order">
      <section className="hc-pagehead">
        <div className="hc-container">
          <div className="hc-crumb"><Link to="/">Home</Link> / <span>Track your order</span></div>
          <h1 className="hc-h1">Track your order</h1>
          <p>See where your order is, message us and ask for a fitting.</p>
        </div>
      </section>

      <section className="hc-section">
        <div className="hc-container" style={{ maxWidth: 720 }}>
          {signedIn()
            ? <p className="hp-notice" style={{ marginBottom: '1.5rem' }}>You are signed in. <Link to="/account" style={{ color: '#B45309', textDecoration: 'underline' }}>Open your orders</Link>.</p>
            : <AccessForm onSignedIn={() => navigate('/account')} />}

          <details className="mt-4" style={{ marginTop: '2rem' }}>
            <summary style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', fontWeight: 600 }}>Tracking a shop order? Use its reference and phone</summary>
          <form onSubmit={lookup} className="hc-card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
            <div className="hc-grid hc-grid--2" style={{ gap: '1rem' }}>
              <label style={lbl}>Shop order reference
                <input className="hc-input" style={field} placeholder="e.g. K7M2P9QX4R" value={code} onChange={(e) => setCode(e.target.value)} required />
              </label>
              <label style={lbl}>Phone number
                <input className="hc-input" style={field} placeholder="e.g. 0803…" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </label>
            </div>
            <button type="submit" className="hc-btn hc-btn--primary" disabled={busy}>
              {busy ? 'Looking…' : 'Track order'}
            </button>
            {error && <p style={{ color: '#991b1b', margin: 0 }}><IconifyIcon icon="solar:danger-circle-bold" /> {error}</p>}
          </form>

          {order && (
            <div className="hc-card mt-4" style={{ padding: '1.5rem' }}>
              <div className="d-flex justify-content-between align-items-start flex-wrap" style={{ gap: '.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{order.public_ref || order.code}</div>
                  <div className="text-muted small">Placed {order.placed_at}</div>
                </div>
                <div style={{ fontWeight: 700 }}>{naira(order.total)}</div>
              </div>

              {cancelled ? (
                <p className="mt-3" style={{ color: '#991b1b' }}><IconifyIcon icon="solar:close-circle-bold" /> This order was cancelled. Contact us if that&apos;s unexpected.</p>
              ) : (
                <ol style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0 0' }}>
                  {PIPELINE.map((s, i) => {
                    const done = i <= currentIdx;
                    const current = i === currentIdx;
                    return (
                      <li key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.4rem 0', opacity: done ? 1 : 0.4 }}>
                        <span style={{
                          width: 30, height: 30, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: done ? '#262626' : '#e9e1d8', color: done ? '#fff' : '#9b8e83',
                          boxShadow: current ? '0 0 0 4px rgba(146, 64, 14,.18)' : 'none',
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
                Questions? <Link to="/contact">Message us</Link> with your order reference.
              </p>
            </div>
          )}
          </details>
        </div>
      </section>
    </SiteLayout>
  );
};

export default TrackPage;
