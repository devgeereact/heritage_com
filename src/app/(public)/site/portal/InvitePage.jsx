import { Link, useNavigate, useParams } from 'react-router-dom';
import { useRedeemInvite } from './useRedeemInvite';
import SiteLayout from '../SiteLayout';
import './portal.css';

/** /access/:invite: exchange the invite at once, then open the client area. */
const InvitePage = () => {
  const { invite } = useParams();
  const navigate = useNavigate();
  const state = useRedeemInvite(invite, (ok) => { if (ok) navigate('/account', { replace: true }); });
  return (
    <SiteLayout title="Your orders" noindex>
      <section className="hc-section">
        <div className="hc-container hp" style={{ maxWidth: 560 }}>
          {state === 'working' && <p role="status">Opening your orders…</p>}
          {state === 'failed' && (
            <div className="hp-card hp-stack">
              <h1>This link has expired or was already used</h1>
              <p>Ask Herit for a new link, or use your reference and the code we email you.</p>
              <div><Link to="/account" className="hp-btn hp-btn--primary">Sign in with your reference</Link></div>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};

export default InvitePage;
