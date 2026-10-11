import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';
import SiteLayout from './SiteLayout';
import { getProduct, loadCatalogue } from './products';
import { useCart } from './cart';
import { useShopEnabled } from './storeConfig';
import AccessForm from './portal/AccessForm';
import PortalHome from './portal/PortalHome';
import { useRedeemInvite } from './portal/useRedeemInvite';
import { signedIn, takeNotice } from './portal/session';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const MEASURE_FIELDS = ['neck', 'shoulder', 'chest', 'waist', 'hip', 'sleeve', 'length', 'thigh', 'trouser_length', 'ankle'];
const statusColor = (s) => ({ delivered: '#16794a', shipped: '#262626', cancelled: '#9b8e83' }[s] || '#b45309');

const field = {
  width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid var(--border)',
  borderRadius: 8, fontSize: '0.95rem', background: 'var(--background)', color: 'var(--foreground)',
  fontFamily: 'inherit', marginTop: '0.35rem',
};
const lbl = { fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-foreground)' };

/* ---- Dashboard -----------------------------------------------------------*/
// Shop extras (store credit, reorder, returns, wishlist, birthday, referral) over
// account.php, which shares the customer session. Shown only while the shop is on.
const Dashboard = ({ onOut, embedded = false }) => {
  const navigate = useNavigate();
  const { add } = useCart();
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [referral, setReferral] = useState(null);
  const [meas, setMeas] = useState({});
  const [editMeas, setEditMeas] = useState(false);
  const [bd, setBd] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [m, o, w] = await Promise.all([heritApi.portal.me(), heritApi.portal.orders(), heritApi.portal.wishlist().catch(() => [])]);
      setMe(m); setOrders(Array.isArray(o) ? o : []); setWishlist(Array.isArray(w) ? w : []); setMeas(m.measurements || {}); setBd(m.birthday || '');
    } catch { if (embedded) setMe(false); else onOut(); }
  }, [onOut, embedded]);

  const removeWish = async (slug) => {
    try { await heritApi.portal.wishlistToggle(slug); setWishlist((w) => w.filter((x) => x.product_slug !== slug)); }
    catch { /* ignore */ }
  };
  useEffect(() => { load(); }, [load]);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 2500); };

  const reorder = async (code) => {
    try {
      const r = await heritApi.portal.reorder(code);
      await loadCatalogue();
      let n = 0;
      (r.items || []).forEach((it) => {
        const p = getProduct(it.slug);
        if (p) { add({ slug: p.slug, name: p.name, fabric: p.fabric, size: it.size || 'One size', priceNgn: p.priceNgn, tile: p.tile }, it.qty || 1); n++; }
      });
      if (n) navigate('/cart'); else flash('These pieces are no longer in the shop.');
    } catch (e) { flash(e.message || 'Could not reorder'); }
  };

  const requestReturn = async (code) => {
    const reason = window.prompt('What’s the reason for the return?');
    if (reason === null) return;
    try { await heritApi.portal.requestReturn(code, reason); flash('Return requested — we’ll be in touch.'); load(); }
    catch (e) { flash(e.message || 'Could not request a return'); }
  };

  const saveMeas = async () => {
    const clean = Object.fromEntries(Object.entries(meas).filter(([, v]) => String(v).trim() !== ''));
    try { await heritApi.portal.saveMeasurements(clean); setEditMeas(false); flash('Measurements saved.'); }
    catch (e) { flash(e.message || 'Could not save'); }
  };

  const saveBirthday = async () => {
    try { await heritApi.portal.setBirthday(bd); flash('Birthday saved — we’ll remember it.'); }
    catch (e) { flash(e.message || 'Could not save'); }
  };
  const [npsDone, setNpsDone] = useState(false);
  const sendNps = async (score) => {
    try { await heritApi.portal.npsSubmit(score, ''); setNpsDone(true); flash('Thank you for the feedback!'); }
    catch (e) { flash(e.message || 'Could not send'); }
  };
  const loadReferral = async () => { try { setReferral(await heritApi.portal.referral()); } catch { /* ignore */ } };
  useEffect(() => { loadReferral(); }, []);

  if (me === false) return null;
  if (!me) return <div className="hc-text-center" style={{ padding: '3rem' }}>Loading…</div>;

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {!embedded && <div className="hc-flex" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 className="hc-h3" style={{ margin: 0 }}>Hi {String(me.name || '').split(' ')[0] || 'there'} 👋</h2>
          <p style={{ color: 'var(--muted-foreground)', margin: '0.2rem 0 0' }}>{me.phone}</p>
        </div>
        <button onClick={onOut} className="hc-btn hc-btn--ghost" style={{ cursor: 'pointer' }}>Sign out</button>
      </div>}

      {msg && <div className="hc-card" style={{ padding: '0.75rem 1rem', background: 'var(--secondary)' }}>{msg}</div>}

      {/* Store credit */}
      {Number(me.credit) > 0 && (
        <div className="hc-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><IconifyIcon icon="solar:wallet-money-bold" /> Store credit</span>
          <strong style={{ fontSize: '1.3rem', color: 'var(--primary)' }}>{naira(me.credit)}</strong>
        </div>
      )}

      {/* Orders */}
      <div className="hc-card" style={{ padding: '1.25rem' }}>
        <h3 className="hc-h4" style={{ marginTop: 0 }}>{embedded ? 'Shop orders: reorder and returns' : 'Your orders'}</h3>
        {orders.length === 0 && <p style={{ color: 'var(--muted-foreground)' }}>No orders yet.</p>}
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {orders.map((o) => (
            <div key={o.code} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '0.85rem 1rem' }}>
              <div className="hc-flex" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div>
                  <strong>{o.public_ref || o.code}</strong> · <span style={{ color: statusColor(o.status), textTransform: 'capitalize', fontWeight: 600 }}>{o.status}</span>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>{String(o.created_at).slice(0, 10)} · {o.item_count} item{o.item_count === '1' ? '' : 's'} · {naira(o.total)}</div>
                  {o.return_status && o.return_status !== 'none' && <div style={{ fontSize: '0.8rem', color: '#b45309' }}>Return: {o.return_status}</div>}
                </div>
                <div className="hc-flex hc-wrap" style={{ gap: '0.4rem', alignItems: 'flex-start' }}>
                  {o.tracking_url && <a href={o.tracking_url} target="_blank" rel="noreferrer" className="hc-btn hc-btn--ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}>Track</a>}
                  <button onClick={() => reorder(o.code)} className="hc-btn hc-btn--ghost" style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}>Reorder</button>
                  {(!o.return_status || o.return_status === 'none') && o.status === 'delivered' &&
                    <button onClick={() => requestReturn(o.code)} className="hc-btn hc-btn--ghost" style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}>Return</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NPS */}
      {!npsDone && (
        <div className="hc-card" style={{ padding: '1.25rem' }}>
          <h3 className="hc-h4" style={{ marginTop: 0 }}>How likely are you to recommend Herit?</h3>
          <div className="hc-flex hc-wrap" style={{ gap: '0.3rem', marginTop: '0.5rem' }}>
            {Array.from({ length: 11 }, (_, n) => (
              <button key={n} onClick={() => sendNps(n)}
                style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer', fontWeight: 600 }}>{n}</button>
            ))}
          </div>
          <div className="hc-flex" style={{ justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: '0.3rem' }}><span>Not likely</span><span>Very likely</span></div>
        </div>
      )}

      {/* Birthday */}
      <div className="hc-card" style={{ padding: '1.25rem' }}>
        <h3 className="hc-h4" style={{ marginTop: 0 }}>Your birthday</h3>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginTop: '0.2rem' }}>Add it for a little something on your day.</p>
        <div className="hc-flex" style={{ gap: '0.5rem', maxWidth: 320 }}>
          <input type="date" value={bd ? String(bd).slice(0, 10) : ''} onChange={(e) => setBd(e.target.value)}
            style={{ flex: 1, padding: '0.6rem 0.7rem', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--background)', color: 'var(--foreground)', font: 'inherit' }} />
          <button onClick={saveBirthday} className="hc-btn hc-btn--primary" style={{ border: 'none' }}>Save</button>
        </div>
      </div>

      {/* Wishlist */}
      {wishlist.length > 0 && (
        <div className="hc-card" style={{ padding: '1.25rem' }}>
          <h3 className="hc-h4" style={{ marginTop: 0 }}>Saved items</h3>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {wishlist.map((w) => (
              <div key={w.product_slug} className="hc-flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to={`/shop/${w.product_slug}`}>{w.product_name || w.product_slug}</Link>
                <button onClick={() => removeWish(w.product_slug)} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><IconifyIcon icon="solar:trash-bin-trash-linear" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Measurements */}
      <div className="hc-card" style={{ padding: '1.25rem' }}>
        <div className="hc-flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="hc-h4" style={{ margin: 0 }}>Your measurements <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>(inches)</span></h3>
          {!editMeas
            ? <button onClick={() => setEditMeas(true)} className="hc-btn hc-btn--ghost" style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}>Edit</button>
            : <button onClick={saveMeas} className="hc-btn hc-btn--primary" style={{ border: 'none', fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}>Save</button>}
        </div>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginTop: '0.25rem' }}>We use these for bespoke and made-to-measure orders.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.6rem', marginTop: '0.5rem' }}>
          {MEASURE_FIELDS.map((k) => (
            <div key={k}>
              <div style={{ ...lbl, marginBottom: '0.2rem' }}>{k.replace('_', ' ')}</div>
              {editMeas
                ? <input type="number" step="0.25" style={{ ...field, marginTop: 0 }} value={meas[k] ?? ''} onChange={(e) => setMeas((m) => ({ ...m, [k]: e.target.value }))} />
                : <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{meas[k] || '—'}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Referral */}
      {referral?.reward > 0 && referral?.code && (
        <div className="hc-card" style={{ padding: '1.25rem', background: 'var(--secondary)' }}>
          <h3 className="hc-h4" style={{ marginTop: 0 }}>Give {naira(referral.reward)}, get {naira(referral.reward)}</h3>
          <p style={{ color: 'var(--muted-foreground)', margin: '0.25rem 0 0.75rem' }}>Share your code. When a friend’s first order is paid, you both get store credit.</p>
          <div className="hc-flex" style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ fontSize: '1.1rem', fontWeight: 700, padding: '0.4rem 0.8rem', background: 'var(--background)', borderRadius: 8, border: '1px solid var(--border)' }}>{referral.code}</code>
            <button onClick={() => { navigator.clipboard?.writeText(referral.code); flash('Code copied!'); }} className="hc-btn hc-btn--ghost" style={{ cursor: 'pointer' }}>Copy code</button>
            <button onClick={() => { navigator.clipboard?.writeText(referral.share_url); flash('Share link copied!'); }} className="hc-btn hc-btn--ghost" style={{ cursor: 'pointer' }}>Copy link</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---- Page ----------------------------------------------------------------*/
/**
 * Client area (/account): the two-step access form until signed in, then the
 * portal. An invite link (?invite=…) is exchanged at once and removed from the URL.
 */
const AccountPage = () => {
  const [params] = useSearchParams();
  const inviteParam = params.get('invite');
  const [signed, setSigned] = useState(signedIn());
  const [notice, setNotice] = useState(() => takeNotice());
  const shopOn = useShopEnabled();
  const onInvite = useCallback((ok) => {
    if (ok) { setSigned(true); setNotice(''); } else setNotice('That link has expired or was already used. Use your reference and we will email you a code, or ask Herit for a new link.');
  }, []);
  const inviteState = useRedeemInvite(inviteParam && /^[0-9a-f]{64}$/.test(inviteParam) ? inviteParam : null, onInvite);
  const onSignedOut = useCallback((msg) => { setSigned(false); setNotice(msg || ''); }, []);

  return (
    <SiteLayout title="Your orders">
      <section className="hc-pagehead">
        <div className="hc-container">
          <div className="hc-crumb"><Link to="/">Home</Link> / <span>Your orders</span></div>
          <h1 className="hc-h1">Your orders</h1>
          <p>See where your order is, message us, ask for a fitting or a change, and leave feedback.</p>
        </div>
      </section>
      <section className="hc-section">
        <div className="hc-container" style={{ maxWidth: 820 }}>
          {inviteState === 'working' && <p role="status">Opening your orders…</p>}
          {inviteState !== 'working' && (signed
            ? (
              <>
                <PortalHome onSignedOut={onSignedOut} />
                {shopOn && <div style={{ marginTop: '1.5rem' }}><Dashboard embedded onOut={() => onSignedOut('')} /></div>}
              </>
            )
            : <AccessForm notice={notice} onSignedIn={() => { setSigned(true); setNotice(''); }} />)}
        </div>
      </section>
    </SiteLayout>
  );
};

export default AccountPage;
