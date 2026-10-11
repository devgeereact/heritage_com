import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import heritApi from '@/helpers/heritApi';
import { fmtDate, fmtWhen, naira } from '@/helpers/format';
import SiteLayout from '../SiteLayout';
import AccessForm from './AccessForm';
import { EXPIRED, endSession, signedIn } from './session';
import { AppointmentsSection, ChangeSection, FeedbackSection, MeasurementsSection, MessagesSection, QuoteSection } from './sections';
import './portal.css';

const Section = ({ id, title, children }) => (
  <section id={id} className="hp-card" aria-labelledby={`${id}-h`} style={{ scrollMarginTop: '5rem' }}>
    <h2 id={`${id}-h`}>{title}</h2>
    {children}
  </section>
);

/**
 * One tailoring job in the client portal (/account/jobs/:ref). Another client's
 * reference answers exactly like a missing one, so the page only ever says
 * "not found". A 401 sends the client back to the access screen.
 */
const PortalJobPage = () => {
  const { ref } = useParams();
  const navigate = useNavigate();
  const [signed, setSigned] = useState(signedIn());
  const [job, setJob] = useState(null);
  const [me, setMe] = useState(null);
  const [state, setState] = useState('loading');

  const guard = useCallback(async (fn) => {
    try { return await fn(); }
    catch (e) {
      if (e.status === 401) { endSession(EXPIRED); navigate('/account', { replace: true }); }
      throw e;
    }
  }, [navigate]);

  const load = useCallback(async () => {
    try {
      const [j, m] = await Promise.all([guard(() => heritApi.client.job(ref)), guard(() => heritApi.client.me())]);
      setJob(j); setMe(m); setState('ready');
    } catch (e) {
      setState(e.status === 404 ? 'missing' : e.status === 401 ? 'loading' : 'error');
    }
  }, [ref, guard]);
  useEffect(() => { if (signed) load(); }, [signed, load]);

  const p = job?.payment;
  const toc = job ? [
    ['progress', 'Progress'], ['messages', 'Messages'], ['appointments', 'Appointments'], ['changes', 'Changes'],
    ['payments', 'Payments'], ...(job.quote ? [['quote', 'Quote']] : []), ['measurements', 'Measurements'],
    ...(job.can?.give_feedback || job.feedback ? [['feedback', 'Feedback']] : []),
  ] : [];

  return (
    <SiteLayout title="Your order">
      <section className="hc-pagehead">
        <div className="hc-container">
          <div className="hc-crumb"><Link to="/">Home</Link> / <Link to="/account">Your orders</Link> / <span>{ref}</span></div>
          <h1 className="hc-h1">{job ? (job.description || 'Your order') : 'Your order'}</h1>
          {job && <p>{job.stage_label || 'In progress'}{job.promised_date ? ` · promised ${fmtDate(job.promised_date)}` : ''} · reference {job.ref}</p>}
        </div>
      </section>
      <section className="hc-section">
        <div className="hc-container hp" style={{ maxWidth: 820 }}>
          {!signed && <AccessForm onSignedIn={() => setSigned(true)} intro="Sign in to see this order. Enter its reference and the phone number or email you gave us." />}
          {signed && state === 'loading' && <p role="status">Loading your order…</p>}
          {signed && state === 'missing' && (
            <div className="hp-card hp-stack">
              <h2>We could not find that order</h2>
              <p>Check the reference, or go back to your orders.</p>
              <div><Link to="/account" className="hp-btn hp-btn--primary">Your orders</Link></div>
            </div>
          )}
          {signed && state === 'error' && (
            <div className="hp-card"><p className="hp-error" role="alert">We could not load this order just now.</p><button type="button" className="hp-btn" onClick={load}>Try again</button></div>
          )}
          {signed && state === 'ready' && job && (
            <div className="hp-stack">
              <nav aria-label="On this page"><ul className="hp-toc">{toc.map(([id, l]) => <li key={id}><a className="hp-link" href={`#${id}`}>{l}</a></li>)}</ul></nav>

              <Section id="progress" title="Progress">
                <dl className="hp-dl" style={{ marginBottom: '1rem' }}>
                  <dt>Now</dt><dd>{job.stage_label || 'In progress'}</dd>
                  {job.promised_date && <><dt>Promised for</dt><dd>{fmtDate(job.promised_date)}</dd></>}
                  {job.event_date && <><dt>Your event</dt><dd>{fmtDate(job.event_date)}</dd></>}
                  {job.quantity > 1 && <><dt>Handed over</dt><dd>{job.quantity_handed_over} of {job.quantity}</dd></>}
                </dl>
                {(job.timeline || []).length > 0 && (
                  <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {job.timeline.map((t, i) => (
                      <li key={i} className="hp-row"><span>{t.label}</span><span className="hp-muted">{fmtWhen(t.at).split(',')[0]}</span></li>
                    ))}
                  </ol>
                )}
                {(job.handovers || []).map((h, i) => (
                  <p key={i} className="hp-help">{h.method === 'delivery' ? 'Delivery' : 'Collection'} of {h.quantity}: {h.status}{h.completed_at ? ` on ${fmtWhen(h.completed_at).split(',')[0]}` : h.planned_for ? `, planned ${fmtWhen(h.planned_for).split(',')[0]}` : ''}
                    {h.tracking_url && <> · <a className="hp-link" href={h.tracking_url} target="_blank" rel="noreferrer">Track parcel</a></>}</p>
                ))}
              </Section>

              <Section id="messages" title="Messages"><MessagesSection jobRef={job.ref} guard={guard} /></Section>
              <Section id="appointments" title="Appointments"><AppointmentsSection job={job} guard={guard} onChanged={load} /></Section>
              <Section id="changes" title="Ask for a change"><ChangeSection job={job} guard={guard} onChanged={load} /></Section>

              <Section id="payments" title="Payments">
                {p?.agreed ? (
                  <dl className="hp-dl">
                    <dt>Agreed price</dt><dd>{naira(p.agreed)}</dd>
                    <dt>Paid (confirmed)</dt><dd>{naira(p.paid_verified)}</dd>
                    {Number(p.balance) > 0 && <><dt>Left to pay</dt><dd>{naira(p.balance)}</dd></>}
                    {Number(p.credit) > 0 && <><dt>Owed back to you</dt><dd>{naira(p.credit)}</dd></>}
                  </dl>
                ) : <p className="hp-help">The price is not agreed yet.</p>}
                {(p?.receipts || []).length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h3>Receipts</h3>
                    {p.receipts.map((r) => (
                      <div key={r.receipt_no} className="hp-row"><span>{r.receipt_no} · {r.kind === 'refund' ? 'Refund' : 'Payment'}{r.received_on ? ` · ${fmtDate(r.received_on)}` : ''}</span><strong>{naira(r.amount)}</strong></div>
                    ))}
                  </div>
                )}
                <p className="hp-help" style={{ marginTop: '.75rem' }}>Payments show here once Herit has confirmed them.</p>
              </Section>

              {job.quote && <Section id="quote" title="Quote"><QuoteSection job={job} guard={guard} onChanged={load} /></Section>}
              <Section id="measurements" title="Measurements"><MeasurementsSection job={job} showOwn={!!me?.features?.measurements} guard={guard} /></Section>
              {(job.can?.give_feedback || job.feedback) && <Section id="feedback" title="Feedback"><FeedbackSection job={job} guard={guard} onChanged={load} /></Section>}

              <div><Link to="/account" className="hp-link">Back to your orders</Link></div>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};

export default PortalJobPage;
