import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Nav, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageHeader from '@/components/herit/PageHeader';
import LoadError from '@/components/herit/LoadError';
import SaveState from '@/components/herit/SaveState';
import StatusChip from '@/components/herit/StatusChip';
import ChangeRequestCard from '@/components/herit/ChangeRequestCard';
import heritApi from '@/helpers/heritApi';
import { fmtUtc, fmtWhen } from '@/helpers/format';

const CONSENT = { no: 'Not for publication', anonymous: 'May publish without a name', first_name: 'May publish with first name' };
const FOLLOW = { none: 'No follow-up', open: 'Follow up', done: 'Followed up' };

const FeedbackCard = ({ f, onChanged }) => {
  const [save, setSave] = useState({ state: null, error: '' });
  const [msg, setMsg] = useState('');
  const run = async (fn, done) => {
    setSave({ state: 'saving', error: '' });
    try { await fn(); setSave({ state: 'saved', error: '' }); setMsg(done); onChanged(); }
    catch (e) { setSave({ state: 'failed', error: e.message }); }
  };
  const canPublish = f.publish_consent !== 'no' && f.rating && (f.comment || '').trim() && !f.published_testimonial_id;
  return (
    <Card className="hd-card mb-2">
      <Card.Body>
        <div className="d-flex flex-wrap justify-content-between gap-2">
          <div>
            <h2 className="h6 mb-1"><Link to={`/jobs/${f.job_id}?tab=messages`}>{f.code}</Link> · {f.client_name}</h2>
            <div className="small text-muted">{fmtUtc(f.created_at)}</div>
          </div>
          <span className="d-flex flex-wrap gap-2">
            {f.rating ? <StatusChip tone={f.rating <= 2 ? 'bad' : f.rating >= 4 ? 'ok' : 'neutral'} icon="solar:star-bold">{f.rating} of 5</StatusChip> : <StatusChip>No rating</StatusChip>}
            <StatusChip tone={f.follow_up === 'open' ? 'warn' : 'neutral'}>{FOLLOW[f.follow_up]}</StatusChip>
          </span>
        </div>
        {f.comment && <p className="mt-2 mb-2" style={{ whiteSpace: 'pre-wrap' }}>{f.comment}</p>}
        <ul className="small mb-2 ps-3">
          <li>{CONSENT[f.publish_consent] || f.publish_consent}</li>
          <li>{f.photo_consent ? 'May use photos of the garment' : 'No permission to use photos'}</li>
          <li>{f.contact_ok ? 'Happy to be contacted about this' : 'Did not ask to be contacted'}</li>
        </ul>
        {f.published_testimonial_id && <p className="small mb-2">Added to testimonials (hidden until you show it under <Link to="/content">Website</Link>).</p>}
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {f.follow_up === 'open' && <Button variant="primary" onClick={() => run(() => heritApi.messages.feedbackUpdate(f.id, 'done'), 'Marked as followed up')}>Mark followed up</Button>}
          {f.follow_up === 'none' && <Button variant="outline-secondary" onClick={() => run(() => heritApi.messages.feedbackUpdate(f.id, 'open'), 'Marked for follow-up')}>Needs follow-up</Button>}
          {canPublish && <Button variant="outline-secondary" onClick={() => run(() => heritApi.messages.feedbackPublish(f.id), 'Added to testimonials as hidden')}>Add to testimonials</Button>}
          {!canPublish && !f.published_testimonial_id && <span className="small text-muted">{f.publish_consent === 'no' ? 'Cannot be published: no permission.' : 'Needs a rating and a comment to publish.'}</span>}
          <SaveState state={save.state} error={save.error} />
          {msg && save.state === 'saved' && <span className="small visually-hidden">{msg}</span>}
        </div>
      </Card.Body>
    </Card>
  );
};

/** Messages (owner): job conversations, change requests and client feedback. */
const MessagesPage = () => {
  const [params, setParams] = useSearchParams();
  const tab = ['conversations', 'changes', 'feedback'].includes(params.get('tab')) ? params.get('tab') : 'conversations';
  const [inbox, setInbox] = useState(null);
  const [changes, setChanges] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [i, c, f] = await Promise.all([heritApi.messages.inbox(), heritApi.messages.changeRequests({ status: 'open' }), heritApi.messages.feedbackList()]);
      setInbox(i); setChanges(c.items || []); setFeedback(f.items || []);
    } catch (e) { setError(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const fbOpen = (feedback || []).filter((f) => f.follow_up === 'open').length;
  const LABEL = {
    conversations: ['Conversations', inbox?.unread_total],
    changes: ['Change requests', changes?.length],
    feedback: ['Feedback', fbOpen],
  };

  return (
    <div className="hd">
      <PageTitle title="Messages" />
      <PageHeader title="Messages" subtitle="Messages from clients' portal, their change requests and their feedback. Reply from each job's Messages tab." />
      <Nav variant="tabs" className="mb-3" activeKey={tab} onSelect={(k) => setParams(k === 'conversations' ? {} : { tab: k }, { replace: true })} role="tablist">
        {Object.entries(LABEL).map(([k, [label, n]]) => (
          <Nav.Item key={k}>
            <Nav.Link eventKey={k} role="tab" aria-selected={tab === k}>
              {label}{n ? <span className="hd-count ms-2" aria-label={`${n} waiting`}>{n}</span> : null}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
      {error && <LoadError what="messages" error={error} onRetry={load} />}
      {!inbox && !error && <div className="text-center py-5"><Spinner role="status" /></div>}

      {inbox && tab === 'conversations' && (
        <Card className="hd-card">
          {inbox.items.length === 0 ? <Card.Body className="text-muted">No conversations yet. When a client writes from their portal, it shows here.</Card.Body>
            : inbox.items.map((m) => (
              <Link key={m.job_id} to={`/jobs/${m.job_id}?tab=messages`} className="hd-row">
                <span className="hd-row-main">
                  <span className="hd-row-title d-block text-truncate">{m.client_name} · {m.code}</span>
                  <span className="hd-row-sub d-block">Last message {fmtWhen(m.last_at_local)}</span>
                </span>
                {m.unread > 0 && <StatusChip tone="warn" icon="solar:chat-unread-bold">{m.unread} new</StatusChip>}
                <IconifyIcon icon="solar:alt-arrow-right-linear" aria-hidden="true" className="text-muted flex-none" />
              </Link>
            ))}
        </Card>
      )}
      {changes && tab === 'changes' && (
        changes.length === 0
          ? <Card className="hd-card"><Card.Body className="text-muted">No change requests waiting.</Card.Body></Card>
          : changes.map((c) => <ChangeRequestCard key={c.id} cr={c} showJob onDecided={load} />)
      )}
      {feedback && tab === 'feedback' && (
        feedback.length === 0
          ? <Card className="hd-card"><Card.Body className="text-muted">No feedback yet. Clients can leave it in their portal once their order is collected or delivered.</Card.Body></Card>
          : feedback.map((f) => <FeedbackCard key={f.id} f={f} onChanged={load} />)
      )}
    </div>
  );
};

export default MessagesPage;
