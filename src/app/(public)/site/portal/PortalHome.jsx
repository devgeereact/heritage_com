import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import IconifyIcon from '../ui/Icon';
import heritApi from '@/helpers/heritApi';
import { fmtDate, fmtWhen, naira } from '@/helpers/format';
import { EXPIRED, endSession } from './session';
import './portal.css';
import { CompanyLists } from './CompanyViews';

/** Signed-in client: their tailoring jobs (stage, promised date, money) and shop orders. */
const PortalHome = ({ onSignedOut }) => {
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [money, setMoney] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [m, j] = await Promise.all([heritApi.client.me(), heritApi.client.jobs()]);
      setMe(m); setData(j);
      // Payment summary per job (a handful of jobs at most for one client).
      const details = await Promise.all((j.jobs || []).slice(0, 10).map((x) => heritApi.client.job(x.ref).catch(() => null)));
      setMoney(Object.fromEntries(details.filter(Boolean).map((d) => [d.ref, d.payment])));
    } catch (e) {
      if (e.status === 401) { endSession(EXPIRED); onSignedOut(EXPIRED); return; }
      setError('We could not load your orders just now. Please try again.');
    }
  }, [onSignedOut]);
  useEffect(() => { load(); }, [load]);

  const out = async (all) => {
    setBusy(true);
    try { await (all ? heritApi.access.logoutAll() : heritApi.access.logout()); } catch { /* signed out locally anyway */ }
    endSession(all ? 'You are signed out on every device.' : 'You are signed out.');
    onSignedOut(all ? 'You are signed out on every device.' : 'You are signed out.');
  };

  if (error) return <div className="hp hp-card"><p className="hp-error" role="alert">{error}</p><button type="button" className="hp-btn" onClick={load}>Try again</button></div>;
  if (!data) return <p className="hp-help" role="status">Loading your orders…</p>;

  return (
    <div className="hp hp-stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Hello {me?.first_name || 'there'}</h2>
          <p className="hp-help">{[me?.email_masked, me?.phone_masked].filter(Boolean).join(' · ')}</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="hp-btn" disabled={busy} onClick={() => out(false)}>Sign out</button>
          <button type="button" className="hp-btn" disabled={busy} onClick={() => out(true)}>Sign out on all devices</button>
        </div>
      </div>

      <div className="hp-card">
        <h3>Your made-to-measure orders</h3>
        {data.jobs.length === 0 && <p className="hp-help">No made-to-measure orders yet.</p>}
        {data.jobs.map((j) => {
          const p = money[j.ref];
          return (
            <Link key={j.ref} to={`/account/jobs/${encodeURIComponent(j.ref)}`} className="hp-row">
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: 'block' }}>{j.description || j.garment_type || 'Your order'}{j.quantity > 1 ? ` × ${j.quantity}` : ''}</strong>
                <span className="hp-muted" style={{ display: 'block', fontSize: '.95rem' }}>
                  {j.stage_label || 'In progress'}{j.promised_date ? ` · promised ${fmtDate(j.promised_date)}` : ''} · {j.ref}
                </span>
                {p && p.agreed && (
                  <span className="hp-muted" style={{ display: 'block', fontSize: '.95rem' }}>
                    Paid {naira(p.paid_verified)} of {naira(p.agreed)}{Number(p.balance) > 0 ? ` · ${naira(p.balance)} to pay` : ''}
                  </span>
                )}
              </span>
              <span style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flex: 'none' }}>
                {j.unread > 0 && <span className="hp-chip" style={{ color: 'var(--hc-warning)' }}><IconifyIcon icon="solar:chat-unread-bold" aria-hidden="true" />{j.unread} new</span>}
                <IconifyIcon icon="solar:alt-arrow-right-linear" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>

      <CompanyLists data={data} />

      {data.orders.length > 0 && (
        <div className="hp-card">
          <h3>Shop orders</h3>
          {data.orders.map((o) => (
            <div key={o.ref} className="hp-row">
              <span>
                <strong style={{ display: 'block' }}>{o.ref}</strong>
                <span className="hp-muted" style={{ fontSize: '.95rem' }}>
                  <span style={{ textTransform: 'capitalize' }}>{o.status}</span> · {o.item_count} item{o.item_count === 1 ? '' : 's'} · {naira(o.total)} · {fmtWhen(o.created_at).split(',')[0]}
                </span>
              </span>
              {o.tracking_url && <a href={o.tracking_url} target="_blank" rel="noreferrer" className="hp-link">Track parcel</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalHome;
