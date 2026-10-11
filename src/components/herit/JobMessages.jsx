import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import newRequestKey from '@/helpers/requestKey';
import { fmtWhen } from '@/helpers/format';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import LoadError from '@/components/herit/LoadError';
import SaveState from '@/components/herit/SaveState';

const CHANNELS = { portal: 'Client portal only', whatsapp: 'WhatsApp', email: 'Email', phone: 'Phone call (record only)', in_person: 'In person (record only)' };
const DELIVERY = { sent: 'Sent', failed: 'Not delivered', manual: 'Send by hand', queued: 'Queued' };

/**
 * One job's conversation for the owner: client messages, Herit replies and
 * internal notes (never shown to the client, styled differently). Opening it
 * marks the client's messages read. Bodies are plain text.
 */
const JobMessages = ({ jobId, onRead }) => {
  const [msgs, setMsgs] = useState(null);
  const [error, setError] = useState(null);
  const [vis, setVis] = useState('client');
  const [channel, setChannel] = useState('portal');
  const [body, setBody] = useState('');
  const [key, setKey] = useState(newRequestKey());
  const [save, setSave] = useState({ state: null, error: '' });
  const [waLink, setWaLink] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await heritApi.messages.thread(jobId);
      setMsgs(r.messages || []);
      if ((r.messages || []).some((m) => m.author_type === 'customer' && !m.read_by_owner_at)) {
        await heritApi.messages.markRead(jobId).catch(() => {});
        onRead?.();
      }
    } catch (e) { setError(e); }
  }, [jobId, onRead]);
  useEffect(() => { load(); }, [load]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) { setSave({ state: 'failed', error: 'Write something first' }); return; }
    setSave({ state: 'saving', error: '' }); setWaLink('');
    try {
      const r = await heritApi.messages.post({ job_id: Number(jobId), visibility: vis, channel: vis === 'internal' ? 'note' : channel, body: body.trim(), request_key: key });
      setBody(''); setKey(newRequestKey());
      setSave({ state: 'saved', error: '' });
      if (r.wa_link) setWaLink(r.wa_link);
      load();
    } catch (err) { setSave({ state: 'failed', error: err.message }); }
  };

  if (error) return <LoadError what="messages" error={error} onRetry={load} />;
  if (!msgs) return <div className="text-center py-4"><Spinner role="status" /></div>;

  return (
    <div>
      <div aria-live="polite">
        {msgs.length === 0 && <p className="text-muted">No messages yet. Messages the client sends from their portal appear here.</p>}
        {msgs.map((m) => {
          const internal = m.visibility === 'internal';
          const cls = internal ? 'hd-msg--internal' : m.author_type === 'customer' ? 'hd-msg--client-in' : m.author_type === 'system' ? 'hd-msg--system' : 'hd-msg--client-out';
          return (
            <article key={m.id} className={`hd-msg ${cls}`} aria-label={internal ? 'Internal note' : 'Message'}>
              <div className="hd-msg-meta">
                {internal ? (
                  <strong className="text-uppercase small"><IconifyIcon icon="solar:lock-keyhole-minimalistic-bold" aria-hidden="true" /> Internal note, client cannot see this</strong>
                ) : (
                  <strong>{m.author_type === 'customer' ? 'Client' : m.author_type === 'system' ? 'Notice to client' : `${m.author_name || 'Herit'} to client`}</strong>
                )}
                <span>{fmtWhen(m.created_at_local)}</span>
                {!internal && m.author_type === 'owner' && <span>{CHANNELS[m.channel]?.replace(' only', '').replace(' (record only)', '') || m.channel}</span>}
                {m.delivery_status && m.delivery_status !== 'na' && <span>{DELIVERY[m.delivery_status] || m.delivery_status}</span>}
                {!internal && m.author_type !== 'customer' && m.read_by_customer_at && <span>Seen by client</span>}
                {m.author_type === 'customer' && !m.read_by_owner_at && <strong>New</strong>}
              </div>
              <div className="hd-msg-body">{m.body}</div>
            </article>
          );
        })}
      </div>

      <Form onSubmit={send} className={`border rounded p-3 mt-3 ${vis === 'internal' ? 'hd-compose--internal' : ''}`} noValidate>
        <fieldset className="mb-2">
          <legend className="form-label fs-6">Who sees it</legend>
          <div className="d-flex flex-wrap gap-3">
            <Form.Check type="radio" id={`jm-${jobId}-client`} name={`jm-${jobId}-vis`} label="Client (reply)" checked={vis === 'client'} onChange={() => setVis('client')} />
            <Form.Check type="radio" id={`jm-${jobId}-int`} name={`jm-${jobId}-vis`} label="Internal note (staff only)" checked={vis === 'internal'} onChange={() => setVis('internal')} />
          </div>
        </fieldset>
        {vis === 'client' && (
          <Form.Group controlId={`jm-${jobId}-ch`} className="mb-2">
            <Form.Label>Send by</Form.Label>
            <Form.Select value={channel} onChange={(e) => setChannel(e.target.value)}>
              {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Form.Select>
            <Form.Text>Every client message also shows in their portal.</Form.Text>
          </Form.Group>
        )}
        <Form.Group controlId={`jm-${jobId}-body`} className="mb-2">
          <Form.Label>{vis === 'internal' ? 'Note' : 'Message'}</Form.Label>
          <Form.Control as="textarea" rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
        </Form.Group>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <Button type="submit" variant={vis === 'internal' ? 'outline-secondary' : 'primary'} disabled={save.state === 'saving'}>
            {vis === 'internal' ? 'Save internal note' : 'Send to client'}
          </Button>
          <SaveState state={save.state} error={save.error} />
        </div>
        {waLink && <Alert variant="info" className="mt-2 mb-0">WhatsApp is not connected, so send it yourself: <a href={waLink} target="_blank" rel="noopener noreferrer">open WhatsApp with this message</a>.</Alert>}
      </Form>
    </div>
  );
};

export default JobMessages;
