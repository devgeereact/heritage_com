import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardBody, Button, Form, Spinner, Alert, Badge, Dropdown, Modal, InputGroup } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';
import './whatsapp.css';

const fmtTime = (s) => {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  return isNaN(d) ? '' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const prettyPhone = (p) => (p && p.startsWith('234') ? '+' + p : p);

const BroadcastModal = ({ show, onHide }) => {
  const [segment, setSegment] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const { showNotification } = useNotificationContext();

  const send = async () => {
    if (!body.trim()) { showNotification({ message: 'Write a message first', variant: 'danger' }); return; }
    setBusy(true); setResult(null);
    try {
      const res = await heritApi.whatsapp.broadcast({ body, segment });
      setResult(res);
      showNotification({ message: `Broadcast: ${res.sent} sent, ${res.manual} to send manually`, variant: 'success' });
    } catch (e) {
      showNotification({ message: e.message || 'Broadcast failed', variant: 'danger' });
    } finally { setBusy(false); }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton><Modal.Title>Broadcast</Modal.Title></Modal.Header>
      <Modal.Body>
        <Alert variant="warning" className="mb-3">Promotional WhatsApp messages are switched off until customers can opt in (D-024). Service messages to one client still work.</Alert>
        <Form.Label className="small text-muted">Segment (blank = everyone with a phone)</Form.Label>
        <Form.Control className="mb-2" list="wa-segments" placeholder="all / vip / diaspora / lapsed…" value={segment} onChange={(e) => setSegment(e.target.value)} />
        <datalist id="wa-segments">
          <option value="all" /><option value="vip" /><option value="diaspora" /><option value="lapsed" /><option value="first-time" />
        </datalist>
        <Form.Label className="small text-muted">Message — use <code>{'{name}'}</code> for the first name</Form.Label>
        <Form.Control as="textarea" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi {name}, the Founders' Drop is live…" />
        {result && (
          <Alert variant="light" className="mt-3 mb-0 border">
            <strong>{result.sent}</strong> sent · <strong>{result.manual}</strong> to send manually · <strong>{result.failed}</strong> failed
            {result.links?.length > 0 && (
              <div className="mt-2" style={{ maxHeight: 160, overflow: 'auto' }}>
                <div className="small text-muted mb-1">Fallback mode — click to send each:</div>
                {result.links.map((l, i) => (
                  <a key={i} href={l.wa_link} target="_blank" rel="noreferrer" className="d-block small">{l.name || 'Customer'} <IconifyIcon icon="solar:arrow-right-up-linear" /></a>
                ))}
              </div>
            )}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide}>Close</Button>
        <Button variant="success" onClick={send} disabled>
          {busy ? <Spinner size="sm" /> : <><IconifyIcon icon="solar:plain-bold" className="me-1" /> Send broadcast</>}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const WhatsAppPage = () => {
  const [threads, setThreads] = useState([]);
  const [state, setState] = useState('loading');
  const [active, setActive] = useState(null);      // phone string
  const [convo, setConvo] = useState(null);        // {phone, customer_name, messages}
  const [draft, setDraft] = useState('');
  const [templates, setTemplates] = useState([]);
  const [sending, setSending] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const endRef = useRef(null);
  const { showNotification } = useNotificationContext();

  const loadThreads = useCallback(async () => {
    try {
      const [t, tpl] = await Promise.all([
        heritApi.whatsapp.threads(),
        heritApi.whatsapp.templates().catch(() => []),
      ]);
      setThreads(Array.isArray(t) ? t : []);
      setTemplates(Array.isArray(tpl) ? tpl : []);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  const openThread = useCallback(async (phone) => {
    setActive(phone);
    setConvo(null);
    try {
      const c = await heritApi.whatsapp.thread(phone);
      setConvo(c);
      // Reading is a GET and changes nothing; marking seen is its own POST (K-28).
      heritApi.whatsapp.markSeen(phone)
        .then(() => setThreads((prev) => prev.map((t) => (t.phone === phone ? { ...t, unread: 0 } : t))))
        .catch(() => {});
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (e) {
      showNotification({ message: e.message || 'Could not load conversation', variant: 'danger' });
    }
  }, [showNotification]);

  const send = async () => {
    const phone = active;
    const body = draft.trim();
    if (!phone || !body) return;
    setSending(true);
    try {
      const res = await heritApi.whatsapp.send({ phone, body });
      setDraft('');
      // Fallback mode: open the wa.me link so staff can actually send it.
      if (res.status === 'manual' && res.wa_link) {
        window.open(res.wa_link, '_blank', 'noopener');
        showNotification({ message: 'No API connected — opening WhatsApp to send.', variant: 'info' });
      }
      await openThread(phone);
      loadThreads();
    } catch (e) {
      showNotification({ message: e.message || 'Could not send', variant: 'danger' });
    } finally { setSending(false); }
  };

  const startNew = async () => {
    const p = newPhone.trim();
    if (!p) return;
    setShowNew(false); setNewPhone('');
    await openThread(p.replace(/\D/g, ''));
  };

  return (
    <>
      <PageTitle title="WhatsApp" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1"><IconifyIcon icon="mdi:whatsapp" className="text-success me-1" /> WhatsApp</h4>
          <p className="text-muted mb-0">Sales and support in one inbox — the brand&apos;s #1 channel.</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="light" onClick={() => setShowNew(true)}><IconifyIcon icon="solar:pen-new-square-bold" className="me-1" /> New chat</Button>
          <Button variant="success" onClick={() => setShowBroadcast(true)}><IconifyIcon icon="solar:bell-bold" className="me-1" /> Broadcast</Button>
        </div>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && (
        <Alert variant="warning">
          <strong>WhatsApp data offline.</strong> Upload <code>php-api/whatsapp.php</code> + the updated <code>_lib.php</code>,
          and import <code>schema_phase3.sql</code>. It works in fallback mode (logged <code>wa.me</code> links) with no
          Meta credentials — add <code>WHATSAPP_TOKEN</code>/<code>WHATSAPP_PHONE_ID</code> in <code>config.php</code> to send automatically.
        </Alert>
      )}

      {state === 'ready' && (
        <Card>
          <CardBody className="p-0">
            <div className="wa-shell">
              {/* Threads */}
              <div className="wa-threads">
                {threads.length === 0 && <div className="text-muted small p-3">No conversations yet. Start one with “New chat”, or messages will appear here as customers reply.</div>}
                {threads.map((t) => (
                  <button key={t.phone} className={`wa-thread ${active === t.phone ? 'active' : ''}`} onClick={() => openThread(t.phone)}>
                    <div className="wa-avatar">{(t.customer_name || prettyPhone(t.phone) || '?').slice(0, 1).toUpperCase()}</div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex justify-content-between">
                        <span className="wa-name text-truncate">{t.customer_name || prettyPhone(t.phone)}</span>
                        <span className="wa-time">{fmtTime(t.last_at).split(',')[0]}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="wa-preview text-truncate">{t.last_dir === 'out' ? 'You: ' : ''}{t.last_body}</span>
                        {t.unread > 0 && <Badge bg="success" pill>{t.unread}</Badge>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Conversation */}
              <div className="wa-convo">
                {!active && <div className="wa-empty text-muted"><IconifyIcon icon="mdi:whatsapp" style={{ fontSize: 48 }} /><p className="mt-2">Pick a conversation</p></div>}
                {active && (
                  <>
                    <div className="wa-convo-head">
                      <div className="wa-avatar">{(convo?.customer_name || prettyPhone(active) || '?').slice(0, 1).toUpperCase()}</div>
                      <div>
                        <div className="fw-semibold">{convo?.customer_name || prettyPhone(active)}</div>
                        <div className="small text-muted">{prettyPhone(active)}</div>
                      </div>
                    </div>

                    <div className="wa-messages">
                      {!convo && <div className="text-center py-4"><Spinner size="sm" /></div>}
                      {convo?.messages?.length === 0 && <div className="text-center text-muted small py-4">No messages yet — say hello.</div>}
                      {convo?.messages?.map((m) => (
                        <div key={m.id} className={`wa-bubble ${m.direction === 'out' ? 'out' : 'in'}`}>
                          <div className="wa-text">{m.body}</div>
                          <div className="wa-meta">
                            {fmtTime(m.created_at)}
                            {m.direction === 'out' && m.status && <span className="ms-1">· {m.status}</span>}
                          </div>
                        </div>
                      ))}
                      <div ref={endRef} />
                    </div>

                    <div className="wa-composer">
                      {templates.length > 0 && (
                        <Dropdown drop="up">
                          <Dropdown.Toggle variant="light" size="sm" className="wa-tpl-btn" title="Quick replies">
                            <IconifyIcon icon="solar:chat-square-like-bold" />
                          </Dropdown.Toggle>
                          <Dropdown.Menu style={{ maxHeight: 280, overflow: 'auto' }}>
                            {templates.map((tpl) => (
                              <Dropdown.Item key={tpl.id} onClick={() => setDraft((d) => (d ? d + ' ' : '') + tpl.body)}>
                                <div className="fw-semibold small">{tpl.name}</div>
                                <div className="small text-muted text-truncate" style={{ maxWidth: 240 }}>{tpl.body}</div>
                              </Dropdown.Item>
                            ))}
                          </Dropdown.Menu>
                        </Dropdown>
                      )}
                      <InputGroup>
                        <Form.Control
                          as="textarea" rows={1} value={draft} placeholder="Type a message…"
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                        />
                        <Button variant="success" onClick={send} disabled={sending || !draft.trim()}>
                          {sending ? <Spinner size="sm" /> : <IconifyIcon icon="solar:plain-bold" />}
                        </Button>
                      </InputGroup>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <BroadcastModal show={showBroadcast} onHide={() => setShowBroadcast(false)} />

      <Modal show={showNew} onHide={() => setShowNew(false)} centered>
        <Modal.Header closeButton><Modal.Title>New chat</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Label className="small text-muted">Customer phone</Form.Label>
          <Form.Control placeholder="0803… or +234…" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') startNew(); }} autoFocus />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="success" onClick={startNew} disabled={!newPhone.trim()}>Open chat</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default WhatsAppPage;
