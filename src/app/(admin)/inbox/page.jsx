import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Button, Spinner, Alert, Badge, Row, Col } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import ComposeModal from './components/ComposeModal';

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const today = new Date();
  const sameDay = dt.toDateString() === today.toDateString();
  return sameDay ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : dt.toLocaleDateString();
};

const InboxPage = () => {
  const [messages, setMessages] = useState([]);
  const [state, setState] = useState('loading');
  const [errMsg, setErrMsg] = useState('');
  const [active, setActive] = useState(null);     // full message
  const [activeUid, setActiveUid] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [compose, setCompose] = useState(null);   // null = closed; {} or prefill = open

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await heritApi.inbox.list(40);
      setMessages(res.messages || []);
      setState('ready');
    } catch (e) {
      setErrMsg(e.message || 'Inbox unavailable.');
      setState(e.message && /not configured|imap/i.test(e.message) ? 'unconfigured' : 'offline');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = async (uid) => {
    setActiveUid(uid); setLoadingMsg(true); setActive(null);
    try {
      const msg = await heritApi.inbox.get(uid);
      setActive(msg);
      setMessages((ms) => ms.map((m) => (m.uid === uid ? { ...m, seen: true } : m)));
    } catch (e) { setActive({ error: e.message || 'Could not open message.' }); }
    finally { setLoadingMsg(false); }
  };

  const reply = () => {
    if (!active) return;
    setCompose({
      to: active.from_email || active.from,
      subject: /^re:/i.test(active.subject) ? active.subject : `Re: ${active.subject}`,
      in_reply_to: active.message_id,
      references: [active.references, active.message_id].filter(Boolean).join(' '),
    });
  };

  const unread = messages.filter((m) => !m.seen).length;

  return (
    <>
      <PageTitle title="Inbox" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Inbox {unread > 0 && <Badge bg="primary">{unread} new</Badge>}</h4>
          <p className="text-muted mb-0">{heritMailbox()} — read and reply without leaving HeritOS.</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="light" onClick={load} disabled={state === 'loading'}><IconifyIcon icon="solar:refresh-bold" className="me-1" /> Refresh</Button>
          <Button variant="primary" onClick={() => setCompose({})}><IconifyIcon icon="solar:pen-new-square-bold" className="me-1" /> Compose</Button>
        </div>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'unconfigured' && (
        <Alert variant="info"><strong>Inbox not set up yet.</strong> Add the IMAP settings to <code>config.php</code> on the server (and make sure the PHP <code>imap</code> extension is enabled). Sending email still works once SMTP is set.
          <div className="mt-2"><Button size="sm" variant="primary" onClick={() => setCompose({})}>Compose an email</Button></div>
        </Alert>
      )}
      {state === 'offline' && (
        <Alert variant="warning"><strong>Inbox unavailable.</strong> {errMsg} Upload <code>php-api/inbox.php</code> and check the IMAP credentials.</Alert>
      )}

      {state === 'ready' && (
        <Row className="g-3">
          <Col lg={5} xl={4}>
            <Card>
              <CardBody className="p-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {messages.length === 0 && <div className="text-center text-muted py-5">No messages.</div>}
                <div className="list-group list-group-flush">
                  {messages.map((m) => (
                    <button
                      key={m.uid}
                      onClick={() => open(m.uid)}
                      className={`list-group-item list-group-item-action text-start ${activeUid === m.uid ? 'active' : ''} ${!m.seen ? 'fw-semibold' : ''}`}>
                      <div className="d-flex justify-content-between">
                        <span className="text-truncate" style={{ maxWidth: '70%' }}>
                          {!m.seen && <span className="text-primary me-1">●</span>}{cleanFrom(m.from)}
                        </span>
                        <small className={activeUid === m.uid ? '' : 'text-muted'}>{fmtDate(m.date)}</small>
                      </div>
                      <div className="text-truncate small">{m.subject}</div>
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col lg={7} xl={8}>
            <Card style={{ minHeight: '70vh' }}>
              <CardBody>
                {!activeUid && <div className="text-center text-muted py-5"><IconifyIcon icon="solar:letter-opened-bold-duotone" style={{ fontSize: 48 }} className="d-block mx-auto mb-2 opacity-50" />Select a message to read.</div>}
                {loadingMsg && <div className="text-center py-5"><Spinner /></div>}
                {active && active.error && <Alert variant="danger">{active.error}</Alert>}
                {active && !active.error && (
                  <>
                    <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                      <div>
                        <h5 className="mb-1">{active.subject}</h5>
                        <div className="text-muted small">From <strong>{cleanFrom(active.from)}</strong></div>
                        <div className="text-muted small">{fmtDate(active.date)} · to {active.to}</div>
                      </div>
                      <Button variant="primary" size="sm" onClick={reply}><IconifyIcon icon="solar:reply-bold" className="me-1" /> Reply</Button>
                    </div>
                    <hr />
                    {active.html
                      ? <iframe title="email" sandbox="" srcDoc={active.html} style={{ width: '100%', minHeight: '50vh', border: 0 }} />
                      : <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{active.text || '(empty message)'}</pre>}
                  </>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      <ComposeModal
        show={compose !== null}
        prefill={compose}
        onClose={() => setCompose(null)}
        onSent={() => { setCompose(null); load(); }}
      />
    </>
  );
};

// "Funke <funke@x.com>" → "Funke"; bare address stays as-is.
const cleanFrom = (s = '') => {
  const m = s.match(/^\s*"?([^"<]+?)"?\s*<.+>/);
  return (m ? m[1] : s).trim() || s;
};
const heritMailbox = () => 'hello@heritclothing.com';

export default InboxPage;
