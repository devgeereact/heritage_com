import { useEffect, useState } from 'react';
import { Modal, Button, Spinner, Form } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const typeLine = {
  fitting: 'wants to book a fitting',
  bespoke: 'is asking about a bespoke order',
  wholesale: 'is a wholesale / reseller enquiry',
  general: 'sent a general enquiry',
};

const AiReplyModal = ({ enquiry, show, onHide }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showNotification } = useNotificationContext();

  const draft = async () => {
    if (!enquiry) return;
    setBusy(true);
    setCopied(false);
    try {
      // D-024 (K-12): the customer's name and message are never sent
      // to the AI provider. The draft greets "{name}", filled in here; staff
      // read the message themselves and edit the draft before sending.
      const prompt = `Draft a short, warm reply (UK English, plain, no marketing cliches) from Herit Clothing, `
        + `a Lagos tailoring house, to a customer who ${typeLine[enquiry.type] || 'got in touch'}.\n`
        + (enquiry.interest ? `They mentioned: ${String(enquiry.interest).slice(0, 80)}.\n` : '')
        + `Start with "Hi {name}," exactly. Thank them, answer warmly, and invite them to book a fitting at the Ajuwon Market workshop or reply on WhatsApp. Sign off as "The Herit Clothing team". Keep it under 120 words.`;
      const res = await heritApi.ai('enquiry_reply', prompt, { max_tokens: 300 });
      const first = String(enquiry.name || '').trim().split(/\s+/)[0] || 'there';
      setText((res.text || '').trim().replace(/\{name\}/g, first));
    } catch (e) {
      showNotification({ message: e.message || 'AI is not available right now', variant: 'danger' });
      onHide();
    } finally {
      setBusy(false);
    }
  };

  // Draft as soon as the modal opens for an enquiry.
  useEffect(() => {
    if (show && enquiry) { setText(''); draft(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, enquiry?.id]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      showNotification({ message: 'Copy failed — select and copy manually', variant: 'danger' });
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <IconifyIcon icon="solar:magic-stick-3-bold" className="text-primary" /> AI reply draft
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {enquiry && (
          <p className="text-muted small mb-2">
            For <strong>{enquiry.name}</strong> · {enquiry.type}
            {enquiry.interest ? ` · ${enquiry.interest}` : ''}
          </p>
        )}
        {busy ? (
          <div className="text-center py-4"><Spinner /> <div className="small text-muted mt-2">Drafting…</div></div>
        ) : (
          <Form.Control as="textarea" rows={8} value={text} onChange={(e) => setText(e.target.value)} />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={draft} disabled={busy}>
          <IconifyIcon icon="solar:refresh-bold" /> Redraft
        </Button>
        <Button variant="primary" onClick={copy} disabled={busy || !text}>
          <IconifyIcon icon={copied ? 'solar:check-read-bold' : 'solar:copy-bold'} />{' '}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AiReplyModal;
